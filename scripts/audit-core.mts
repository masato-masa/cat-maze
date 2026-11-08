// 「一石二鳥」（猫が足場ごと運ばれるスライド）が、最短解に必須かを測る。
// 各面について、最短手数 N の解すべての中で「猫が運ばれたスライドの回数」の最小値を求める。
//   最小値 >= 1 なら、この面は一石二鳥の手なしでは最短で解けない（核の体験が必須）。
// 使い方: npx tsx scripts/audit-core.mts [面ID...]
import { newGame, slide } from '../src/core/game.ts';
import { slideTargets } from '../src/core/slide.ts';
import { solve, solvedHere, stateKey } from '../src/solver/search.ts';
import { ALL_LEVELS } from '../src/levels/index.ts';
import type { GameState } from '../src/core/types.ts';

const only = process.argv.slice(2);
const INF = 99;

function minCarried(def: (typeof ALL_LEVELS)[number], n: number): number {
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

let must = 0;
let total = 0;
for (const def of ALL_LEVELS) {
  if (only.length && !only.includes(def.id)) continue;
  const sol = solve(def, 12);
  if (!sol) {
    console.log(def.id.padEnd(6), '解なし(12手以内)');
    continue;
  }
  const t0 = Date.now();
  const mc = minCarried(def, sol.length);
  total++;
  if (mc >= 1) must++;
  console.log(def.id.padEnd(6), `最短 ${String(sol.length).padStart(2)} 手`, `運ばれる手の最小回数 ${mc >= INF ? '?' : mc}`, mc >= 1 ? '← 一石二鳥が必須' : '', `(${Date.now() - t0}ms)`);
}
console.log(`\n一石二鳥が最短解に必須の面: ${must} / ${total}`);
