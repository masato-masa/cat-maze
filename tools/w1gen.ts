import { search } from './gen.ts';
import type { LevelDef } from '../src/core/types.ts';

const base = (id: string, layout: string[][], catStart: [number, number]): LevelDef => ({
  id, name: id, width: layout[0]!.length, height: layout.length,
  layout, catStart, optimalMoves: 0, parMoves: 99,
});

// 解けた状態の 4x4。横一直線の道 + 外周は固定の草地。
const corridor = base('C', [
  ['FIXED:X', 'FIXED:X', 'FIXED:X', 'FIXED:X'],
  ['E', 'EW', 'EW', 'GOAL:W'],
  ['X', 'X', 'X', 'HOLE'],
  ['FIXED:X', 'FIXED:X', 'FIXED:X', 'FIXED:X'],
], [1, 0]);

// 解けた状態の 4x4。L 字の道。
const bend = base('L', [
  ['FIXED:X', 'X', 'X', 'X'],
  ['ES', 'EW', 'WS', 'X'],
  ['N', 'X', 'NE', 'GOAL:W'],
  ['X', 'X', 'HOLE', 'FIXED:X'],
], [1, 0]);

for (const steps of [2, 3, 4]) search(corridor, steps, 40);
for (const steps of [2, 3, 4]) search(bend, steps, 40);
