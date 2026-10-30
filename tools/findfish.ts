import { passable } from '../src/core/board.ts';
import { newGame } from '../src/core/game.ts';
import { delta } from '../src/core/conn.ts';
import type { Dir } from '../src/core/conn.ts';
import { ALL_LEVELS } from '../src/levels/index.ts';
import { tileAt } from '../src/core/board.ts';

for (const def of ALL_LEVELS) {
  const s = newGame(def);
  if (s.fishTotal === 0) continue;
  for (const d of [0, 1, 2, 3] as Dir[]) {
    if (!passable(s.board, s.cat, d)) continue;
    const { dr, dc } = delta(d);
    const t = tileAt(s.board, s.cat.r + dr, s.cat.c + dc);
    if (t?.fish) {
      console.log(`${def.id}: 猫(${s.cat.r},${s.cat.c}) から ${['北','東','南','西'][d]} へ 1 歩で魚。魚 ${s.fishTotal} 匹`);
    }
  }
}
