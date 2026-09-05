import { describe, it, expect } from 'vitest';
import { createBoard, isHole, tileAt } from '../../src/core/board.ts';
import { applySlide, canSlide, slideTargets } from '../../src/core/slide.ts';
import type { LevelDef } from '../../src/core/types.ts';

/** 3x3。穴は (1,1)。(1,2) は fixed。 */
const def: LevelDef = {
  id: 'T2',
  name: 'slide',
  width: 3,
  height: 3,
  layout: [
    ['N', 'E', 'S'],
    ['W', 'HOLE', 'FIXED:N'],
    ['NE', 'ES', 'SW'],
  ],
  catStart: [1, 0],
  optimalMoves: 0,
  parMoves: 0,
};

const line = (cells: string[]): LevelDef => ({
  id: 'L',
  name: 'line',
  width: cells.length,
  height: 1,
  layout: [cells],
  catStart: [0, 0],
  optimalMoves: 0,
  parMoves: 0,
});

describe('slide', () => {
  it('穴と同じ行・列のタイルは押せる', () => {
    const b = createBoard(def);
    expect(canSlide(b, { r: 1, c: 0 })).toBe(true);
    expect(canSlide(b, { r: 0, c: 1 })).toBe(true);
  });

  it('穴と同じ行・列でないタイルは押せない', () => {
    const b = createBoard(def);
    expect(canSlide(b, { r: 0, c: 0 })).toBe(false);
    expect(canSlide(b, { r: 2, c: 2 })).toBe(false);
  });

  it('固定タイル自身は押せない', () => {
    expect(canSlide(createBoard(def), { r: 1, c: 2 })).toBe(false);
  });

  it('穴自身は押せない', () => {
    expect(canSlide(createBoard(def), { r: 1, c: 1 })).toBe(false);
  });

  it('押すと穴が対象タイルの位置へ移る', () => {
    const b = createBoard(def);
    const r = applySlide(b, { r: 2, c: 2 }, { r: 1, c: 0 });
    expect(isHole(r.board, 1, 0)).toBe(true);
    expect(isHole(r.board, 1, 1)).toBe(false);
    expect(tileAt(r.board, 1, 1)!.id).toBe(tileAt(b, 1, 0)!.id);
  });

  it('猫が乗ったタイルを押すと猫も一緒に運ばれる', () => {
    const b = createBoard(def);
    const r = applySlide(b, { r: 1, c: 0 }, { r: 1, c: 0 });
    expect(r.cat).toEqual({ r: 1, c: 1 });
  });

  it('対象区間の外にいる猫は動かない', () => {
    const b = createBoard(def);
    const r = applySlide(b, { r: 2, c: 0 }, { r: 1, c: 0 });
    expect(r.cat).toEqual({ r: 2, c: 0 });
  });

  it('離れたタイルを押すと間のタイルもまとめて動く', () => {
    const b = createBoard(line(['HOLE', 'N', 'E', 'S']));
    const r = applySlide(b, { r: 0, c: 3 }, { r: 0, c: 3 });
    expect(isHole(r.board, 0, 3)).toBe(true);
    expect(tileAt(r.board, 0, 0)!.id).toBe(tileAt(b, 0, 1)!.id);
    expect(tileAt(r.board, 0, 1)!.id).toBe(tileAt(b, 0, 2)!.id);
    expect(tileAt(r.board, 0, 2)!.id).toBe(tileAt(b, 0, 3)!.id);
    expect(r.cat).toEqual({ r: 0, c: 2 }); // 猫も 1 マス運ばれる
  });

  it('固定タイルを越えて押すことはできない', () => {
    const b = createBoard(line(['HOLE', 'N', 'FIXED:E', 'S']));
    expect(canSlide(b, { r: 0, c: 1 })).toBe(true);
    expect(canSlide(b, { r: 0, c: 3 })).toBe(false);
  });

  it('両側に同じ距離の穴があるタイルは曖昧なので押せない', () => {
    const b = createBoard(line(['HOLE', 'N', 'HOLE']));
    expect(canSlide(b, { r: 0, c: 1 })).toBe(false);
  });

  it('穴が複数あっても近い方へ押し込まれる', () => {
    const b = createBoard(line(['HOLE', 'N', 'E', 'HOLE']));
    const r = applySlide(b, { r: 0, c: 1 }, { r: 0, c: 1 });
    expect(isHole(r.board, 0, 1)).toBe(true);
    expect(isHole(r.board, 0, 0)).toBe(false);
  });

  it('固定されたゴールは押せない', () => {
    const b = createBoard(line(['HOLE', 'FIXED:GOAL:E', 'W']));
    expect(canSlide(b, { r: 0, c: 1 })).toBe(false);
  });

  it('スライドは可逆', () => {
    const b = createBoard(def);
    const a = applySlide(b, { r: 1, c: 0 }, { r: 1, c: 0 });
    const back = applySlide(a.board, a.cat, { r: 1, c: 1 });
    expect(back.board.cells.map((t) => t?.id ?? -1)).toEqual(b.cells.map((t) => t?.id ?? -1));
    expect(back.cat).toEqual({ r: 1, c: 0 });
  });

  it('元の盤面は書き換えられない', () => {
    const b = createBoard(def);
    const snapshot = b.cells.map((t) => t?.id ?? -1);
    applySlide(b, { r: 1, c: 0 }, { r: 1, c: 0 });
    expect(b.cells.map((t) => t?.id ?? -1)).toEqual(snapshot);
  });

  it('押せないタイルを押すと例外', () => {
    const b = createBoard(def);
    expect(() => applySlide(b, { r: 0, c: 0 }, { r: 0, c: 0 })).toThrow();
  });

  it('slideTargets は押せるタイルをすべて返す', () => {
    // 行: (1,0) のみ（(1,2) は fixed）。列: (0,1), (2,1)。
    expect(slideTargets(createBoard(def))).toHaveLength(3);
  });
});
