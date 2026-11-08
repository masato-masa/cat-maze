// 「一石二鳥が最短解に必須」の面を探す。使い方:
//   npx tsx scripts/gen-core.mts <最短手数の下限> <最短手数の上限> <探す数> [seed] [分]
// 条件: 最短手数が [lo, hi]、最短解の本数が少ない、猫が運ばれるスライドが最短解に最低 1 回は要る。
import { newGame, slide } from '../src/core/game.ts';
import { slideTargets } from '../src/core/slide.ts';
import { goodStart, solvedBoard, type Tier } from '../src/levels/endless.ts';
import { isSolvedLayout, rng, scramble } from '../src/solver/generate.ts';
import { solve, solvedHere, stateKey } from '../src/solver/search.ts';
import type { GameState, LevelDef } from '../src/core/types.ts';

const lo = Number(process.argv[2] ?? 5);
const hi = Number(process.argv[3] ?? 7);
const want = Number(process.argv[4] ?? 3);
const seed0 = Number(process.argv[5] ?? 1);
const minutes = Number(process.argv[6] ?? 10);
const INF = 99;

const tier: Tier = { size: 5, lo, hi, fish: 0.7, fixed: 0.3, pathLen: [9, 12] };

function minCarried(def: LevelDef, n: number): number {
  const memo = new Map<string, number>();
  const go = (s: GameState, depth: number): number => {
    if (solvedHere(s)) return 0;
    if (depth === 0) return INF;
    const key = `${stateKey(s)}#${depth}`;
    const m = memo.get(key);
    if (m !== undefined) return m;
    let best = INF;
    for (const t of slideTargets(s.board)) {
      const next = slide(s, t);
      const carried = next.cat.r !== s.cat.r || next.cat.c !== s.cat.c ? 1 : 0;
      const sub = go(next, depth - 1);
      if (sub < INF) best = Math.min(best, sub + carried);
    }
    memo.set(key, best);
    return best;
  };
  return go(newGame(def), n);
}

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
for (let i = 0; found < want && Date.now() - t0 < minutes * 60_000; i++) {
  const rand = rng((Math.imul(seed0 * 100003 + i, 0x9e3779b1) ^ 0x5bd1e995) >>> 0 || 1);
  const solved = solvedBoard(rand, tier);
  if (!solved) continue;
  const steps = hi * 2 + Math.floor(rand() * 4);
  const { layout, catStart } = scramble(solved, steps, Math.floor(rand() * 0x7fffffff) + 1);
  const cand: LevelDef = { ...solved, layout, catStart };
  if (isSolvedLayout(cand) || !goodStart(cand)) continue;
  const sol = solve(cand, hi);
  if (!sol || sol.length < lo) continue;
  const mc = minCarried(cand, sol.length);
  if (mc < 1) continue;
  const ways = countOptimal(cand, sol.length);
  found++;
  console.log(JSON.stringify({ i, optimal: sol.length, ways, carriedMin: mc, ms: Date.now() - t0, catStart, layout: cand.layout }));
}
console.log(`found ${found} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
