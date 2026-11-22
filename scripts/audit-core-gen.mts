// 「きょうの めいろ」と「むげん」の面で、一石二鳥（猫が足場ごと運ばれる手）が最短解に必須の割合と、
// 最短の手順の本数を測る。使い方: node --experimental-strip-types scripts/audit-core-gen.mts [むげん面数=60] [日数=60]
import { newGame, slide } from '../src/core/game.ts';
import { minCarried } from '../src/solver/carried.ts';
import { slideTargets } from '../src/core/slide.ts';
import { dailyLevel } from '../src/levels/daily.ts';
import { endlessLevel } from '../src/levels/endless.ts';
import { solve, solvedHere, stateKey } from '../src/solver/search.ts';
import type { GameState, LevelDef } from '../src/core/types.ts';

const nEnd = Number(process.argv[2] ?? 60);
const nDay = Number(process.argv[3] ?? 60);
const INF = 99;

function ways(def: LevelDef, d: number, cap = 200): number {
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
function report(name: string, defs: LevelDef[]): void {
  let must = 0, few = 0;
  const hist: Record<number, number> = {};
  for (const def of defs) {
    const sol = solve(def, 12);
    if (!sol) continue;
    hist[sol.length] = (hist[sol.length] ?? 0) + 1;
    if (minCarried(def, sol.length) >= 1) must++;
    if (ways(def, sol.length) <= 6) few++;
  }
  console.log(`${name}: ${defs.length} 面、運ばれる手が最短解に必須 ${must}（${Math.round((must / defs.length) * 100)}%）、最短の手順が 6 通り以下 ${few}（${Math.round((few / defs.length) * 100)}%）、最短手数の分布`, JSON.stringify(hist));
}
const ds: LevelDef[] = [];
let t0 = performance.now();
for (let i = 0; i < nDay; i++) {
  const d = new Date(Date.UTC(2026, 10, 1 + i));
  const id = `D-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  ds.push(dailyLevel(id));
}
const dayMs = (performance.now() - t0) / nDay;
report('きょうの めいろ', ds);
console.log(`  1 面の生成 平均 ${dayMs.toFixed(0)}ms`);
t0 = performance.now();
const es: LevelDef[] = [];
let tmax = 0;
for (let n = 1; n <= nEnd; n++) {
  const a = performance.now();
  es.push(endlessLevel(n));
  tmax = Math.max(tmax, performance.now() - a);
}
const endMs = (performance.now() - t0) / nEnd;
report('むげん', es);
console.log(`  1 面の生成 平均 ${endMs.toFixed(0)}ms、最大 ${tmax.toFixed(0)}ms`);
