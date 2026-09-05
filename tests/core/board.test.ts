import { describe, it, expect } from 'vitest';
import { createBoard, passable, reachable, isHole, holes, idx } from '../../src/core/board.ts';
import type { LevelDef } from '../../src/core/types.ts';

/** 3x3。中央が穴。上段は横に繋がる。 */
const def: LevelDef = {
  id: 'T1',
  name: 'test',
  width: 3,
  height: 3,
  layout: [
    ['E', 'EW', 'W'],
    ['NS', 'HOLE', 'X'],
    ['FIXED:N', 'X', 'X'],
  ],
  catStart: [0, 0],
  optimalMoves: 0,
  parMoves: 0,
};

describe('board', () => {
  it('layout から盤面を作る', () => {
    const b = createBoard(def);
    expect(b.width).toBe(3);
    expect(b.height).toBe(3);
    expect(isHole(b, 1, 1)).toBe(true);
    expect(holes(b)).toEqual([{ r: 1, c: 1 }]);
    expect(b.cells[idx(b, 2, 0)]!.fixed).toBe(true);
  });

  it('修飾子は重ねて書ける', () => {
    const b = createBoard({ ...def, layout: [['FIXED:GOAL:NW', 'FISH:EW', 'W'], ['NS', 'HOLE', 'X'], ['N', 'X', 'X']] });
    const goal = b.cells[idx(b, 0, 0)]!;
    expect(goal.kind).toBe('goal');
    expect(goal.fixed).toBe(true);
    expect(b.cells[idx(b, 0, 1)]!.fish).toBe(true);
  });

  it('タイル id は盤面内で一意', () => {
    const b = createBoard(def);
    const ids = b.cells.filter((t) => t != null).map((t) => t!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('両側が開いていれば通行できる', () => {
    const b = createBoard(def);
    expect(passable(b, { r: 0, c: 0 }, 1)).toBe(true);
    expect(passable(b, { r: 0, c: 1 }, 1)).toBe(true);
  });

  it('片側しか開いていなければ通行できない', () => {
    const b = createBoard(def);
    // (1,0) は NS で北へ開くが、(0,0) は E のみで南へ開いていない
    expect(passable(b, { r: 1, c: 0 }, 0)).toBe(false);
  });

  it('穴へは進入できない', () => {
    const b = createBoard(def);
    expect(passable(b, { r: 0, c: 1 }, 2)).toBe(false);
  });

  it('盤外へは進入できない', () => {
    const b = createBoard(def);
    expect(passable(b, { r: 0, c: 0 }, 0)).toBe(false);
  });

  it('到達領域は連結成分を返す', () => {
    const b = createBoard(def);
    const set = reachable(b, { r: 0, c: 0 });
    expect(set.has(idx(b, 0, 0))).toBe(true);
    expect(set.has(idx(b, 0, 1))).toBe(true);
    expect(set.has(idx(b, 0, 2))).toBe(true);
    expect(set.has(idx(b, 1, 0))).toBe(false);
    expect(set.size).toBe(3);
  });

  it('行の長さが width と違えば例外', () => {
    expect(() => createBoard({ ...def, layout: [['E'], ['NS', 'HOLE', 'X'], ['N', 'X', 'X']] })).toThrow();
  });
});
