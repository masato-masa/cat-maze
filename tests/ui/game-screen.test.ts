// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderGameScreen } from '../../src/ui/screens/game.ts';
import { GameSession } from '../../src/core/game.ts';
import { BoardView } from '../../src/ui/board-view.ts';
import { ProgressStore, mapKV } from '../../src/ui/storage.ts';
import type { Route } from '../../src/ui/router.ts';

let store: ProgressStore;
let root: HTMLElement;
let went: Route | null;
let cleanup: () => void;
const go = (r: Route): void => {
  went = r;
};

beforeEach(() => {
  store = new ProgressStore(mapKV(new Map()));
  root = document.createElement('div');
  document.body.append(root);
  went = null;
});

function open(levelId: string): void {
  cleanup = renderGameScreen(root, levelId, { store, go });
}

const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
const key = (k: string): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
};
const tile = (r: number, c: number): HTMLElement =>
  root.querySelector<HTMLElement>(`.tile-layer [data-r="${r}"][data-c="${c}"]`)!;

/** jsdom には TouchEvent が無いので、必要なプロパティだけ持つイベントを作る。 */
function touchEvent(type: string, points: { x: number; y: number; target?: EventTarget }[]): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const list = points.map((p) => ({ clientX: p.x, clientY: p.y, target: p.target ?? null }));
  Object.defineProperty(ev, 'touches', { value: type === 'touchstart' ? list : [] });
  Object.defineProperty(ev, 'changedTouches', { value: list });
  return ev;
}

/** el の上でスワイプする（=そのマスのタイルを押す）。 */
function swipe(el: HTMLElement): void {
  el.dispatchEvent(touchEvent('touchstart', [{ x: 100, y: 100, target: el }]));
  el.dispatchEvent(touchEvent('touchend', [{ x: 160, y: 104 }]));
}

describe('対局画面', () => {
  it('知らないステージ ID には案内を出す', () => {
    open('nope');
    expect(root.textContent).toContain('ありません');
  });

  it('最初は 0 手でクリアしていない', () => {
    open('W1-1');
    expect(q('.moves').textContent).toBe('0');
    expect(q('.game-message').hidden).toBe(true);
    expect(q<HTMLButtonElement>('.undo-btn').disabled).toBe(true);
    cleanup();
  });

  // W1-1 は猫のタイル (1,0) をスワイプで押すと猫ごと運ばれ、そのあと東へ 2 歩でゴール。
  it('スライドで手数が増え、歩行では増えない', () => {
    open('W1-1');
    swipe(tile(1, 0));
    expect(q('.moves').textContent).toBe('1');
    key('ArrowRight');
    expect(q('.moves').textContent).toBe('1');
    cleanup();
  });

  it('クリアすると星と成績が出て、進捗が保存される', () => {
    open('W1-1');
    swipe(tile(1, 0));
    key('ArrowRight');
    key('ArrowRight');
    expect(q('.game-message').hidden).toBe(false);
    expect(q('.stars').querySelectorAll('.star.on')).toHaveLength(3);
    expect(store.getStars('W1-1')).toBe(3);
    expect(store.bestMoves('W1-1')).toBe(1);
    cleanup();
  });

  it('Undo でスライド前に戻る', () => {
    open('W1-1');
    swipe(tile(1, 0));
    expect(q<HTMLButtonElement>('.undo-btn').disabled).toBe(false);
    q('.undo-btn').click();
    expect(q('.moves').textContent).toBe('0');
    expect(q<HTMLButtonElement>('.undo-btn').disabled).toBe(true);
    cleanup();
  });

  it('やりなおしで最初から始められる', () => {
    open('W1-1');
    swipe(tile(1, 0));
    key('ArrowRight');
    key('ArrowRight');
    q('.retry-btn').click();
    expect(q('.moves').textContent).toBe('0');
    expect(q('.game-message').hidden).toBe(true);
    cleanup();
  });

  it('ヒントは次に押すべきタイルを光らせる', () => {
    open('W1-1');
    q('.hint-btn').click();
    expect(root.querySelectorAll('.tile.hinted')).toHaveLength(1);
    cleanup();
  });

  it('魚を集めるステージでは残り数を出す', () => {
    open('W3-1');
    expect(q('.fish-line').hidden).toBe(false);
    expect(q('.fish-count').textContent).toMatch(/さかな 0 \/ \d/);
    cleanup();
  });

  it('魚のないステージでは魚の表示を出さない', () => {
    open('W1-1');
    expect(q('.fish-line').hidden).toBe(true);
    cleanup();
  });

  it('タップとスワイプの役割を画面に出す', () => {
    open('W1-1');
    const line = q('.controls-line').textContent!;
    expect(line).toContain('タップ');
    expect(line).toContain('スワイプ');
    expect(line).toContain('あるく');
    cleanup();
  });

  it('スライドできるマスをタップしても歩行になる（タップは常に歩行）', () => {
    open('W3-1');
    // (3,4) は歩いて行けるし押すこともできるマス。タップでは歩行が起きる。
    const before = q('.moves').textContent;
    tile(3, 4).click();
    expect(before).toBe('0');
    expect(q('.moves').textContent).toBe('0');
    cleanup();
  });

  it('スライドできるマスをスワイプしたらスライドする', () => {
    open('W3-1');
    const before = q('.moves').textContent;
    swipe(tile(3, 4));
    expect(before).toBe('0');
    expect(q('.moves').textContent).toBe('1');
    cleanup();
  });

  // (2,2) の猫から (3,3) へは 南→東 の角を曲がる経路でしか行けない。
  // 状態はその場で確定し（一気に）、見た目のアニメーションには
  // 実際に通るマス（斜めではなく南→東の折れ線）がそのまま渡る。
  it('タップでの複数マス移動は状態がその場で確定し、経路どおりのマスがアニメーションに渡る', () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    const animSpy = vi.spyOn(BoardView.prototype, 'walkCatThrough');
    open('W3-1');
    tile(3, 3).click();
    expect(walkToSpy).toHaveBeenCalledWith({ r: 3, c: 3 });
    expect(q('.moves').textContent).toBe('0'); // 歩行なので手数は増えない
    expect(animSpy).toHaveBeenCalledWith(
      [
        { r: 2, c: 2 },
        { r: 3, c: 2 },
        { r: 3, c: 3 },
      ],
      expect.any(Number),
    );
    walkToSpy.mockRestore();
    animSpy.mockRestore();
    cleanup();
  });

  it('もどるでステージ選択へ行く', () => {
    open('W1-1');
    q('.back-btn').click();
    expect(went).toEqual({ screen: 'select' });
    cleanup();
  });

  it('後始末したあとはキー入力を受け付けない', () => {
    open('W1-1');
    cleanup();
    key('ArrowRight');
    expect(q('.moves').textContent).toBe('0');
  });
});
