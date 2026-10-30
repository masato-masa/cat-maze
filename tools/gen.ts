import { scramble, isSolvedLayout } from '../src/solver/generate.ts';
import { solve } from '../src/solver/search.ts';
import type { LevelDef } from '../src/core/types.ts';

export function show(layout: string[][], cat: [number, number]): string {
  return layout
    .map((row, r) =>
      row.map((c, i) => (r === cat[0] && i === cat[1] ? `[${c}]` : c).padEnd(14)).join(''),
    )
    .join('\n');
}

/** 解けた状態の盤面を steps 回かき混ぜ、最短手数がちょうど steps の候補を探す。 */
export function search(
  solved: LevelDef,
  steps: number,
  seeds: number,
  want = steps,
): void {
  if (!isSolvedLayout(solved)) {
    console.log(`!! ${solved.id}: 元の盤面がクリア済みになっていない`);
    return;
  }
  const found = new Set<string>();
  for (let seed = 1; seed <= seeds; seed++) {
    const { layout, catStart } = scramble(solved, steps, seed);
    const cand: LevelDef = { ...solved, layout, catStart, optimalMoves: 0, parMoves: 99 };
    const sol = solve(cand, want + 1);
    if (!sol || sol.length !== want) continue;
    const key = JSON.stringify(layout) + JSON.stringify(catStart);
    if (found.has(key)) continue;
    found.add(key);
    console.log(`--- ${solved.id} seed=${seed} steps=${steps} 最短=${sol.length}`);
    console.log(show(layout, catStart));
    console.log(`cat=[${catStart}]  手順=${JSON.stringify(sol)}`);
    if (found.size >= 3) return;
  }
  if (found.size === 0) console.log(`--- ${solved.id} steps=${steps}: 該当なし`);
}
