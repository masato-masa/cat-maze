// 最適解で「押すべきタイル」が、そのとき猫の到達領域に入っているか。
// 入っているなら「タップ＝歩行」を優先すると、そのタイルをタップで押せなくなる。
import { idx } from '../src/core/board.ts';
import { newGame, reachableSet, slide } from '../src/core/game.ts';
import { ALL_LEVELS } from '../src/levels/index.ts';
import { solve } from '../src/solver/search.ts';

let total = 0;
let reachableTargets = 0;
let catOwnTile = 0;
const examples: string[] = [];

for (const def of ALL_LEVELS) {
  const sol = solve(def, def.optimalMoves)!;
  let s = newGame(def);
  sol.forEach((t, i) => {
    const reach = reachableSet(s);
    const k = idx(s.board, t.r, t.c);
    total++;
    const isSelf = s.cat.r === t.r && s.cat.c === t.c;
    if (isSelf) catOwnTile++;
    else if (reach.has(k)) {
      reachableTargets++;
      if (examples.length < 6) examples.push(`${def.id} ${i + 1}手目 (${t.r},${t.c})`);
    }
    s = slide(s, t);
  });
}

console.log(`最適解の手 ${total} 個のうち`);
console.log(`  猫が乗っているタイルを押す手      : ${catOwnTile} 個`);
console.log(`  猫が歩いて行けるタイルを押す手    : ${reachableTargets} 個`);
console.log(`  合計（歩行を優先すると押せない手）: ${catOwnTile + reachableTargets} 個 (${(((catOwnTile + reachableTargets) / total) * 100).toFixed(0)}%)`);
console.log(`  例: ${examples.join(' / ')}`);
