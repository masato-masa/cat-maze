// 「きょうの めいろ」と「むげん」の面で、一石二鳥（猫が足場ごと運ばれる手）が最短解に必須の割合と、
// 最短の手順の本数を測る。使い方: node --experimental-strip-types scripts/audit-core-gen.mts [むげん面数=60] [日数=60]
import { newGame, slide } from '../src/core/game.ts';
import { slideTargets } from '../src/core/slide.ts';
import { dailyLevel } from '../src/levels/daily.ts';
import { endlessLevel } from '../src/levels/endless.ts';
import { solve, solvedHere, stateKey } from '../src/solver/search.ts';
import type { GameState, LevelDef } from '../src/core/types.ts';

const nEnd = Number(process.argv[2] ?? 60);
const nDay = Number(process.argv[3] ?? 60);
const INF = 99;

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
const ds = [];
for (let i = 0; i < nDay; i++) {
  const d = new Date(Date.UTC(2026, 10, 1 + i));
  const id = `D-${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  ds.push(dailyLevel(id));
}
report('きょうの めいろ', ds);
const es = [];
for (let n = 1; n <= nEnd; n++) es.push(endlessLevel(n));
report('むげん', es);
