// 「歩いて行きたいのにタップだとスライドになってしまう」マスがどれだけあるか数える。
import { idx } from '../src/core/board.ts';
import { newGame, reachableSet, slide } from '../src/core/game.ts';
import { slideTargets } from '../src/core/slide.ts';
import { ALL_LEVELS, getLevel } from '../src/levels/index.ts';
import { solve } from '../src/solver/search.ts';
import type { GameState } from '../src/core/types.ts';

function conflicts(s: GameState): { reach: number; conflict: number; cells: string[] } {
  const reach = reachableSet(s);
  const slid = new Set(slideTargets(s.board).map((p) => idx(s.board, p.r, p.c)));
  const cells: string[] = [];
  for (const k of reach) {
    if (k === idx(s.board, s.cat.r, s.cat.c)) continue; // 猫の現在地は歩く必要がない
    if (slid.has(k)) cells.push(`${Math.floor(k / s.board.width)},${k % s.board.width}`);
  }
  return { reach: reach.size, conflict: cells.length, cells };
}

// 最適解をたどりながら、各局面で衝突マスがいくつあるか見る
let totalStates = 0;
let totalConflict = 0;
let worst = { id: '', n: 0 };
for (const def of ALL_LEVELS) {
  const sol = solve(def, def.optimalMoves)!;
  let s = newGame(def);
  const seq: number[] = [];
  for (let i = 0; ; i++) {
    const c = conflicts(s);
    seq.push(c.conflict);
    totalStates++;
    totalConflict += c.conflict;
    if (c.conflict > worst.n) worst = { id: `${def.id} (${i}手目)`, n: c.conflict };
    if (i >= sol.length) break;
    s = slide(s, sol[i]!);
  }
  if (def.id === 'W3-1') console.log(`W3-1 各局面の衝突マス数: ${seq.join(', ')}`);
}
console.log(`\n全 ${totalStates} 局面のうち、衝突マスの合計 ${totalConflict}`);
console.log(`1 局面あたり平均 ${(totalConflict / totalStates).toFixed(2)} マス`);
console.log(`最悪: ${worst.id} で ${worst.n} マス`);

// W3-1 の初期局面を詳しく
const w31 = getLevel('W3-1')!;
const s0 = newGame(w31);
const c0 = conflicts(s0);
console.log(`\nW3-1 初期: 歩ける ${c0.reach} マス中、タップだとスライドになるのは ${c0.conflict} マス -> ${c0.cells.join(' / ')}`);
