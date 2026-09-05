// ステージ検証 CLI。
//   node --experimental-strip-types src/solver/cli.ts verify
//   node --experimental-strip-types src/solver/cli.ts solve W1-3
import { ALL_LEVELS, getLevel } from '../levels/index.ts';
import { validateLevel } from '../levels/schema.ts';
import { solve } from './search.ts';
import type { LevelDef } from '../core/types.ts';

type Result = { def: LevelDef; status: 'OK' | 'INVALID' | 'MISMATCH'; detail: string; ms: number };

function check(def: LevelDef): Result {
  const errs = validateLevel(def);
  if (errs.length) return { def, status: 'INVALID', detail: errs.join(' / '), ms: 0 };

  const t0 = Date.now();
  // 宣言値ちょうどで解けること
  const at = solve(def, def.optimalMoves);
  if (!at || at.length !== def.optimalMoves) {
    const found = solve(def, def.optimalMoves + 6);
    const ms = Date.now() - t0;
    const actual = found ? `${found.length}` : `>${def.optimalMoves + 6}`;
    return { def, status: 'MISMATCH', detail: `declared=${def.optimalMoves} actual=${actual}`, ms };
  }
  // 1 手少なくては解けないこと（下界の証明）
  if (def.optimalMoves > 0 && solve(def, def.optimalMoves - 1) !== null) {
    return {
      def,
      status: 'MISMATCH',
      detail: `declared=${def.optimalMoves} だが ${def.optimalMoves - 1} 手でも解ける`,
      ms: Date.now() - t0,
    };
  }
  return { def, status: 'OK', detail: `optimal=${def.optimalMoves} par=${def.parMoves}`, ms: Date.now() - t0 };
}

function verify(): number {
  let bad = 0;
  for (const def of ALL_LEVELS) {
    const r = check(def);
    if (r.status !== 'OK') bad++;
    const pad = r.def.id.padEnd(7);
    console.log(`${pad} ${r.status.padEnd(9)} ${r.detail}  (${r.ms}ms)`);
  }
  console.log('');
  console.log(bad === 0 ? `全 ${ALL_LEVELS.length} ステージ OK` : `${bad} / ${ALL_LEVELS.length} ステージに問題あり`);
  return bad === 0 ? 0 : 1;
}

function solveOne(id: string): number {
  const def = getLevel(id);
  if (!def) {
    console.error(`ステージが見つからない: ${id}`);
    return 1;
  }
  const sol = solve(def, def.optimalMoves + 4);
  if (!sol) {
    console.log(`${id}: 解なし`);
    return 1;
  }
  console.log(`${id} ${def.name}: 最短 ${sol.length} 手`);
  sol.forEach((p, i) => console.log(`  ${i + 1}. (${p.r}, ${p.c}) のタイルを押す`));
  return 0;
}

const [cmd, arg] = process.argv.slice(2);
let code = 0;
if (cmd === 'verify' || cmd === undefined) code = verify();
else if (cmd === 'solve' && arg) code = solveOne(arg);
else {
  console.error('使い方: cli.ts verify | cli.ts solve <levelId>');
  code = 1;
}
process.exit(code);
