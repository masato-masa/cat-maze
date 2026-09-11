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

/** jsdom には PointerEvent が無いので、必要なプロパティだけ持つイベントを作る。 */
function pointerEvent(type: string, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientX', { value: x });
  Object.defineProperty(ev, 'clientY', { value: y });
  Object.defineProperty(ev, 'isPrimary', { value: true });
  return ev;
}

/** el の上でタップする（=そのマスへ歩く）。7px 以内の移動はタップになる。 */
function tap(el: HTMLElement): void {
  el.dispatchEvent(pointerEvent('pointerdown', 100, 100));
  el.dispatchEvent(pointerEvent('pointerup', 101, 100));
}

/** el の上でスワイプする（=そのマスのタイルを押す）。 */
function swipe(el: HTMLElement): void {
  el.dispatchEvent(pointerEvent('pointerdown', 100, 100));
  el.dispatchEvent(pointerEvent('pointerup', 160, 104));
}

/** (r,c) のマスをタップする。ポインタ操作の組み立ては既存の tap/swipe をそのまま使う。 */
const tapCell = (r: number, c: number): void => tap(tile(r, c));
/** (r,c) のマスをスワイプする（=そのマスのタイルを押す）。 */
const swipeCell = (r: number, c: number): void => swipe(tile(r, c));

/** walkCatThrough の Promise 解決を待つ。jsdom では即座に解決するが、
 * .then() の実行はマイクロタスクの後になるため、テスト側でも 1 tick 待つ。 */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

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
    tap(tile(3, 4));
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
    tap(tile(3, 3));
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

describe('猫の反応', () => {
  it('行けないマスをタップすると悲しい顔になる', async () => {
    open('W1-1');
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    // W1-1 の (3,3) は猫から到達できない
    tapCell(3, 3);
    await flush();
    expect(img()).toContain('sad');
    cleanup();
  });

  it('歩ける先をタップしても悲しい顔にはならない', async () => {
    open('W1-1');
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    tapCell(1, 0); // 猫が今いるマス
    await flush();
    expect(img()).not.toContain('sad');
    cleanup();
  });

  it('クリアすると嬉しい顔になる', async () => {
    open('W1-1');
    // W1-1 は 1 手（1 回のスライド）で解ける。ヒントの示すタイルを押す。
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    const r = Number(hinted.dataset['r']);
    const c = Number(hinted.dataset['c']);
    swipeCell(r, c);
    // 「1 手で解ける」は手数のこと。スライドしただけでは猫はまだゴールの上に
    // いないので、そこへ歩かせて初めて cleared になる。
    const goal = root.querySelector<HTMLElement>('.tile-layer .tile[data-kind="goal"]')!;
    tapCell(Number(goal.dataset['r']), Number(goal.dataset['c']));
    await flush();
    expect(root.querySelector('.cat-img')!.getAttribute('src')).toContain('happy');
    cleanup();
  });
});

describe('先行入力', () => {
  // W3-1 で猫(2,2)から到達できるマスは (1,2)(2,2)(2,3)(3,1)(3,2)(3,3)(3,4)。
  // (3,3)→(3,4) は隣接していて、歩いている最中に次のタップを重ねられる。
  it('歩いている最中のタップも 1 つだけ覚えていて、歩き終わると実行される', async () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    open('W3-1');
    tapCell(3, 3); // 歩行開始（まだ walking === true のまま同期的に戻る）
    tapCell(3, 4); // 歩行中なので先行入力として覚える
    await flush();
    expect(walkToSpy.mock.calls).toEqual([[{ r: 3, c: 3 }], [{ r: 3, c: 4 }]]);
    walkToSpy.mockRestore();
    cleanup();
  });

  it('歩行中に 3 回タップしても、実行されるのは最初と最後の 1 つだけ', async () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    open('W3-1');
    tapCell(3, 3); // 歩行開始
    tapCell(3, 4); // 先行入力その 1（後で上書きされる）
    tapCell(3, 1); // 先行入力その 2 で上書き。2 つ以上は覚えない
    await flush();
    expect(walkToSpy.mock.calls).toEqual([[{ r: 3, c: 3 }], [{ r: 3, c: 1 }]]);
    walkToSpy.mockRestore();
    cleanup();
  });

  it('歩行中に undo すると、覚えていた先行入力は捨てられる', async () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    open('W3-1');
    tapCell(3, 3); // 歩行開始
    tapCell(3, 4); // 先行入力として覚える
    key('u'); // undo。覚えていた先行入力を捨てる
    await flush();
    expect(walkToSpy.mock.calls).toEqual([[{ r: 3, c: 3 }]]);
    walkToSpy.mockRestore();
    cleanup();
  });
});
