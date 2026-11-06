// 深い面（最短 9 手以上）を探す。使い方:
//   node --experimental-strip-types scripts/gen-deep.mts <最短手数の下限> <探す数> [seed]
// 出力: 見つかった面の最短手数・最短解の本数・探索時間。常設の探索ツール（W6 の面はこれで拾った）。
import { createBoard } from '../src/core/board.ts';
import { slide } from '../src/core/game.ts';
import { newGame } from '../src/core/game.ts';
import { slideTargets } from '../src/core/slide.ts';
import { goodStart, solvedBoard, type Tier } from '../src/levels/endless.ts';
import { isSolvedLayout, rng, scramble } from '../src/solver/generate.ts';
import { solve, solvedHere } from '../src/solver/search.ts';
import type { GameState, LevelDef } from '../src/core/types.ts';

const lo = Number(process.argv[2] ?? 9);
const want = Number(process.argv[3] ?? 3);
const seed0 = Number(process.argv[4] ?? 1);

const tier: Tier = { size: 5, lo, hi: lo + 2, fish: 0.7, fixed: 0.3, pathLen: [9, 12] };

/** 最短手数 d ちょうどで解ける手順の本数（上限 cap で打ち切り） */
function countOptimal(def: LevelDef, d: number, cap = 40): number {
  let n = 0;
  const go = (s: GameState, depth: number): void => {
    if (n >= cap) return;
    if (depth === 0) {
      if (solvedHere(s)) n++;
      return;
    }
    for (const t of slideTargets(s.board)) go(slide(s, t), depth - 1);
  };
  go(newGame(def), d);
  return n;
}

let found = 0;
const t0 = Date.now();
for (let i = 0; found < want && Date.now() - t0 < 20 * 60_000; i++) {
  const rand = rng((Math.imul(seed0 * 100003 + i, 0x9e3779b1) ^ 0x5bd1e995) >>> 0 || 1);
  const solved = solvedBoard(rand, tier);
  if (!solved) continue;
  const steps = tier.hi * 2 + Math.floor(rand() * 4);
  const { layout, catStart } = scramble(solved, steps, Math.floor(rand() * 0x7fffffff) + 1);
  const cand: LevelDef = { ...solved, layout, catStart };
  if (isSolvedLayout(cand) || !goodStart(cand)) continue;
  const sol = solve(cand, tier.hi);
  if (!sol || sol.length < lo) continue;
  const ways = countOptimal(cand, sol.length);
  found++;
  console.log(JSON.stringify({ i, optimal: sol.length, ways, ms: Date.now() - t0, catStart, layout: cand.layout }));
}
console.log(`found ${found} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
