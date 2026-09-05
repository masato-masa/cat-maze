import { describe, it, expect } from 'vitest';
import { hasSolutionWithin, solve, stateKey } from '../../src/solver/search.ts';
import { newGame, slide, walk } from '../../src/core/game.ts';
import type { LevelDef } from '../../src/core/types.ts';

/** 猫とゴールの間が穴で分断されている。1 回のスライドで繋がる。 */
const oneMove: LevelDef = {
  id: 'S1',
  name: 'one',
  width: 3,
  height: 1,
  layout: [['E', 'HOLE', 'GOAL:W']],
  catStart: [0, 0],
  optimalMoves: 1,
  parMoves: 2,
};

/** すでに繋がっているので 0 手。 */
const zeroMove: LevelDef = {
  id: 'S0',
  name: 'zero',
  width: 3,
  height: 1,
  layout: [['E', 'EW', 'GOAL:W']],
  catStart: [0, 0],
  optimalMoves: 0,
  parMoves: 0,
};

/** 魚が別の連結成分にあり、先に取りに行く必要がある。 */
const withFish: LevelDef = {
  id: 'S2',
  name: 'fish',
  width: 3,
  height: 1,
  layout: [['E', 'EW', 'GOAL:W'], ],
  catStart: [0, 0],
  optimalMoves: 0,
  parMoves: 0,
};

describe('solver', () => {
  it('0 手で解けるステージを検出する', () => {
    expect(solve(zeroMove, 5)).toEqual([]);
  });

  it('1 手で解けるステージの手順を返す', () => {
    const sol = solve(oneMove, 5);
    expect(sol).not.toBeNull();
    expect(sol!).toHaveLength(1);
  });

  it('深さが足りなければ null を返す', () => {
    expect(solve(oneMove, 0)).toBeNull();
  });

  it('hasSolutionWithin は下界の証明に使える', () => {
    expect(hasSolutionWithin(oneMove, 0)).toBe(false);
    expect(hasSolutionWithin(oneMove, 1)).toBe(true);
  });

  it('猫の立ち位置が違っても到達領域が同じなら同じ状態キー', () => {
    const a = newGame(zeroMove);
    expect(stateKey(a)).toBe(stateKey(walk(a, 1)));
  });

  it('盤面が違えば状態キーも違う', () => {
    const a = newGame(oneMove);
    expect(stateKey(a)).not.toBe(stateKey(slide(a, { r: 0, c: 0 })));
  });

  it('返された手順を実行するとクリアできる状態になる', () => {
    let s = newGame(oneMove);
    for (const t of solve(oneMove, 5)!) s = slide(s, t);
    for (let i = 0; i < 5; i++) s = walk(s, 1);
    expect(s.cleared).toBe(true);
  });

  it('届かない魚が残っていれば解けたことにしない', () => {
    const d: LevelDef = {
      ...withFish,
      width: 4,
      layout: [['E', 'EW', 'GOAL:W', 'FISH:X']],
    };
    // 魚が孤立していて穴も無いので、どうやっても解けない
    expect(solve(d, 3)).toBeNull();
  });
});
