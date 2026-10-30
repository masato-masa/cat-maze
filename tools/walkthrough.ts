import { newGame, slide, reachableSet } from '../src/core/game.ts';
import { renderBoard } from '../src/cli/render.ts';
import { ALL_LEVELS } from '../src/levels/index.ts';
import { solve } from '../src/solver/search.ts';

for (const def of ALL_LEVELS) {
  const sol = solve(def, def.optimalMoves)!;
  let s = newGame(def);
  console.log(`\n=== ${def.id} ${def.name}  最短 ${sol.length} 手 ===`);
  console.log(renderBoard(s, { showReach: true }).trimEnd());
  console.log(`  猫の歩ける範囲: ${reachableSet(s).size} マス`);
  sol.forEach((t, i) => {
    const before = s.cat;
    s = slide(s, t);
    const carried = before.r !== s.cat.r || before.c !== s.cat.c;
    const grew = reachableSet(s).size;
    console.log(`\n  ${i + 1}手目: (${t.r},${t.c}) を押す${carried ? '  ← 猫が運ばれた!' : ''}`);
    console.log(renderBoard(s, { showReach: true }).trimEnd());
    console.log(`  猫の歩ける範囲: ${grew} マス`);
  });
}
