// 候補ステージの最短手数を調べる作業用スクリプト（製品には含めない）
import { solve } from '../src/solver/search.ts';
import { validateLevel } from '../src/levels/schema.ts';
import type { LevelDef } from '../src/core/types.ts';

export function probe(name: string, layout: string[][], catStart: [number, number], max = 8): void {
  const def: LevelDef = {
    id: name,
    name,
    width: layout[0]!.length,
    height: layout.length,
    layout,
    catStart,
    optimalMoves: 0,
    parMoves: 99,
  };
  const errs = validateLevel(def);
  if (errs.length) {
    console.log(`${name}: 不正 -> ${errs.join(' / ')}`);
    return;
  }
  const t0 = Date.now();
  const sol = solve(def, max);
  const ms = Date.now() - t0;
  if (!sol) console.log(`${name}: ${max} 手以内に解なし (${ms}ms)`);
  else console.log(`${name}: 最短 ${sol.length} 手  ${JSON.stringify(sol)}  (${ms}ms)`);
}
