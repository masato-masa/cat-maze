// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BoardView } from '../../src/ui/board-view.ts';
import { createBoard } from '../../src/core/board.ts';
import { newGame, walk } from '../../src/core/game.ts';
import { getLevel } from '../../src/levels/index.ts';
import type { LevelDef } from '../../src/core/types.ts';

function view(): { v: BoardView; catEl: HTMLElement; root: HTMLElement } {
  const root = document.createElement('div');
  document.body.append(root);
  const v = new BoardView(root, createBoard(getLevel('W1-1')!));
  return { v, catEl: root.querySelector<HTMLElement>('.cat')!, root };
}

// view() は呼ぶたびに document.body に root を足していくので、
// テストごとに片付けて他のテストの .tile を誤って拾わないようにする。
afterEach(() => {
  document.body.innerHTML = '';
});

/** animate を差し替えて、渡されたキーフレームを取り出す。 */
function captureKeyframes(el: HTMLElement): () => Keyframe[] {
  let captured: Keyframe[] = [];
  (el as unknown as { animate: unknown }).animate = (kf: Keyframe[]) => {
    captured = kf;
    return { finished: Promise.resolve(), cancel: () => {} };
  };
  return () => captured;
}

describe('猫の歩行アニメーション', () => {
  it('マスの中間に跳ねの山を挟む', async () => {
    const { v, catEl } = view();
    const get = captureKeyframes(catEl);
    await v.walkCatThrough(
      [
        { r: 1, c: 0 },
        { r: 1, c: 1 },
        { r: 1, c: 2 },
      ],
      120,
    );
    // 3 マス分の位置 + その間 2 つの山 = 5
    expect(get()).toHaveLength(5);
  });

  it('西へ進むと猫が左を向く', async () => {
    const { v, catEl } = view();
    captureKeyframes(catEl);
    const flip = (): string => v.catSprite.el.style.getPropertyValue('--flip');
    await v.walkCatThrough([{ r: 1, c: 2 }, { r: 1, c: 1 }], 120);
    expect(flip()).toBe('-1');
    await v.walkCatThrough([{ r: 1, c: 1 }, { r: 1, c: 2 }], 120);
    expect(flip()).toBe('1');
  });

  it('縦にだけ動くときは向きを変えない', async () => {
    const { v, catEl } = view();
    captureKeyframes(catEl);
    v.catSprite.faceWest(true);
    await v.walkCatThrough([{ r: 0, c: 1 }, { r: 1, c: 1 }], 120);
    expect(v.catSprite.el.style.getPropertyValue('--flip')).toBe('-1');
  });
});

describe('render のタイル差分更新', () => {
  it('位置も見た目も変わらないタイルは DOM を作り直さない', () => {
    const { v, root } = view();
    const state = newGame(getLevel('W1-1')!);
    const opts = { reachable: new Set<number>(), slidable: [] };

    v.render(state, opts);
    const before = root.querySelector('.tile');

    v.render(state, opts);
    const after = root.querySelector('.tile');

    expect(after).toBe(before);
  });

  it('動いたタイルが無ければ requestAnimationFrame を待たずに位置を反映する', () => {
    const { v } = view();
    const state = newGame(getLevel('W1-1')!);
    const opts = { reachable: new Set<number>(), slidable: [] };

    v.render(state, opts); // 初回（no-anim のため rAF を1回使う）

    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    v.render(state, opts); // 2回目は何も動いていない
    expect(raf).not.toHaveBeenCalled();
  });

  it('猫だけが歩いてタイルが1枚も動かないとき、タイルは作り直さず猫の位置だけ反映する', () => {
    // 実際のゲームでは矢印キーでの歩行がこのケースにあたる（盤のタイルは動かない）。
    // 2x1 の単純な盤を自作し、レベルデータの中身に依存せずに歩行だけを起こす。
    const level: LevelDef = {
      id: 'test-walk-only',
      name: 'テスト用',
      width: 2,
      height: 1,
      layout: [['E', 'W']],
      catStart: [0, 0],
      optimalMoves: 1,
      parMoves: 1,
    };
    const root = document.createElement('div');
    document.body.append(root);
    const v = new BoardView(root, createBoard(level));
    const opts = { reachable: new Set<number>(), slidable: [] };

    let state = newGame(level);
    v.render(state, opts);
    const tileBefore = root.querySelector('.tile');

    state = walk(state, 1); // 東（Dir: 0=N,1=E,2=S,3=W）へ1歩。盤のタイルは動かない。
    v.render(state, opts);

    expect(root.querySelector('.tile')).toBe(tileBefore); // タイルは作り直されない
    const catEl = root.querySelector<HTMLElement>('.cat')!;
    expect(catEl.style.getPropertyValue('--r')).toBe('0');
    expect(catEl.style.getPropertyValue('--c')).toBe('1'); // 猫の位置は正しく反映される
  });
});
