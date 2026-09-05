import type { LevelDef } from '../core/types.ts';

/**
 * W1 うらにわ — 歩行とスライド、そして「猫は足場ごと運ばれる」ことを教える。
 * 使うタイルは直線とカーブだけ。T 字と十字は出さない。
 */
export const W1: LevelDef[] = [
  {
    id: 'W1-1',
    name: 'はじめの いっぽ',
    width: 4,
    height: 4,
    // 押せるのは真ん中の行だけ。押すと道がつながる、それだけを教える。
    layout: [
      ['X', 'FIXED:X', 'X', 'X'],
      ['E', 'HOLE', 'EW', 'GOAL:W'],
      ['X', 'FIXED:X', 'X', 'X'],
      ['X', 'FIXED:X', 'X', 'X'],
    ],
    catStart: [1, 0],
    optimalMoves: 1,
    parMoves: 3,
    hint: 'タイルを おすと みちが つながるよ',
  },
  {
    id: 'W1-2',
    name: 'のりもの',
    width: 4,
    height: 4,
    // 猫はどこへも歩けない。動かせるタイルは猫が乗っているものだけ。
    // 「猫は足場ごと運ばれる」を強制的に発見させる。
    layout: [
      ['X', 'FIXED:X', 'X', 'X'],
      ['E', 'HOLE', 'FIXED:GOAL:W', 'X'],
      ['X', 'FIXED:X', 'X', 'X'],
      ['X', 'FIXED:X', 'X', 'X'],
    ],
    catStart: [1, 0],
    optimalMoves: 1,
    parMoves: 3,
    hint: 'あるけない ときは ねこごと うごかそう',
  },
  {
    id: 'W1-3',
    name: 'ふたつ うごかす',
    width: 4,
    height: 4,
    layout: [
      ['NW', 'FIXED:X', 'NE', 'NE'],
      ['FIXED:GOAL:ES', 'FIXED:SW', 'FIXED:NW', 'ES'],
      ['ES', 'NE', 'NE', 'SW'],
      ['FIXED:SW', 'NE', 'HOLE', 'ES'],
    ],
    catStart: [2, 2],
    optimalMoves: 2,
    parMoves: 4,
    hint: 'はこばれてから みちを つなぐ',
  },
  {
    id: 'W1-4',
    name: 'まわりみち',
    width: 4,
    height: 4,
    layout: [
      ['X', 'ES', 'SW', 'SW'],
      ['FIXED:EW', 'NS', 'NS', 'FIXED:GOAL:ES'],
      ['NS', 'EW', 'NW', 'EW'],
      ['FIXED:X', 'FIXED:EW', 'FIXED:NE', 'HOLE'],
    ],
    catStart: [2, 2],
    optimalMoves: 2,
    parMoves: 4,
    hint: 'おすまえに どこに たつか かんがえよう',
  },
  {
    id: 'W1-5',
    name: 'みっつの て',
    width: 4,
    height: 4,
    layout: [
      ['NW', 'NE', 'EW', 'NS'],
      ['FIXED:NS', 'FIXED:NE', 'FIXED:GOAL:SW', 'FIXED:SW'],
      ['FIXED:NE', 'NS', 'SW', 'SW'],
      ['SW', 'HOLE', 'NW', 'EW'],
    ],
    catStart: [3, 2],
    optimalMoves: 3,
    parMoves: 5,
    hint: 'あなは かべにも なる。あなを どこへ うごかす？',
  },
  {
    id: 'W1-6',
    name: 'うらにわ',
    width: 4,
    height: 4,
    layout: [
      ['HOLE', 'NE', 'SW', 'SW'],
      ['ES', 'NW', 'FIXED:GOAL:NE', 'FIXED:ES'],
      ['FIXED:X', 'FIXED:X', 'NE', 'NS'],
      ['NW', 'FIXED:NW', 'SW', 'NW'],
    ],
    catStart: [1, 0],
    optimalMoves: 4,
    parMoves: 6,
    hint: 'ならった ことを ぜんぶ つかおう',
  },
];
