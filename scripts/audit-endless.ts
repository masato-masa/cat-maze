// むげんモードの監査。生成器の重みや範囲を変えたら毎回走らせる。
//   node --experimental-strip-types scripts/audit-endless.ts [面数=200]
import { endlessLevel, tierFor } from '../src/levels/endless.ts';
import { validateLevel } from '../src/levels/schema.ts';
import { solve } from '../src/solver/search.ts';
import { createBoard } from '../src/core/board.ts';
import { slideTargets } from '../src/core/slide.ts';

const count = Number(process.argv[2] ?? 200);
type Row = { moves: Record<number, number>; ms: number[]; fallback: number; bad: number; fish: number; slid: number[] };
const byTier = new Map<string, Row>();

for (let n = 1; n <= count; n++) {
  const t = tierFor(n);
  const key = `${t.size}x${t.size} ${t.lo}-${t.hi}手`;
  const row = byTier.get(key) ?? { moves: {}, ms: [], fallback: 0, bad: 0, fish: 0, slid: [] };
  byTier.set(key, row);
  const t0 = performance.now();
  const def = endlessLevel(n);
  row.ms.push(performance.now() - t0);
  row.moves[def.optimalMoves] = (row.moves[def.optimalMoves] ?? 0) + 1;
  if (def.width !== t.size) row.fallback++;
  if (def.layout.flat().some((s) => s.includes('FISH'))) row.fish++;
  row.slid.push(slideTargets(createBoard(def)).length);
  const errs = validateLevel(def);
  const exact = solve(def, def.optimalMoves);
  const shorter = def.optimalMoves > 0 ? solve(def, def.optimalMoves - 1) : null;
  if (errs.length || !exact || shorter) {
    row.bad++;
    console.log(`NG ${def.id}`, errs, exact?.length, shorter?.length);
  }
}

console.log('段      面数  手数の分布            平均ms  最大ms  骨格に頼った  魚あり  押せる枚数の平均  NG');
for (const [key, r] of byTier) {
  const total = r.ms.length;
  const avg = r.ms.reduce((a, b) => a + b, 0) / total;
  const max = Math.max(...r.ms);
  const dist = Object.entries(r.moves).map(([m, c]) => `${m}手${c}`).join(' ');
  const slid = r.slid.reduce((a, b) => a + b, 0) / total;
  console.log(`${key.padEnd(10)} ${String(total).padStart(4)}  ${dist.padEnd(20)} ${avg.toFixed(1).padStart(6)} ${max.toFixed(0).padStart(6)}  ${String(r.fallback).padStart(6)}  ${String(r.fish).padStart(6)}  ${slid.toFixed(1).padStart(8)}  ${r.bad}`);
}
