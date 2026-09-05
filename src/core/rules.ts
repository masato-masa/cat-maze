import { tileAt } from './board.ts';
import type { Board, GameState, LevelDef } from './types.ts';

export function countFish(b: Board): number {
  return b.cells.reduce((n, t) => n + (t?.fish ? 1 : 0), 0);
}

/** 猫がゴールに乗り、かつ魚をすべて集めていればクリア。 */
export function isCleared(s: GameState): boolean {
  const t = tileAt(s.board, s.cat.r, s.cat.c);
  return !!t && t.kind === 'goal' && s.fishTaken >= s.fishTotal;
}

export function starsFor(def: LevelDef, moves: number): 1 | 2 | 3 {
  if (moves <= def.optimalMoves) return 3;
  if (moves <= def.parMoves) return 2;
  return 1;
}
