import { createBoard, holes, inBounds, tileAt } from '../core/board.ts';
import type { LevelDef } from '../core/types.ts';

/** ステージ定義の問題点を列挙する。空配列なら妥当。 */
export function validateLevel(def: LevelDef): string[] {
  const errs: string[] = [];
  if (def.layout.length !== def.height) errs.push('layout の行数が height と違う');
  def.layout.forEach((row, r) => {
    if (row.length !== def.width) errs.push(`${r} 行目の長さが width と違う`);
  });
  if (errs.length) return errs;

  let board;
  try {
    board = createBoard(def);
  } catch (e) {
    return [`パースできない: ${(e as Error).message}`];
  }

  if (holes(board).length < 1) errs.push('穴が 1 つも無い');
  const goals = board.cells.filter((t) => t?.kind === 'goal').length;
  if (goals !== 1) errs.push(`ゴールが ${goals} 個ある（1 個であるべき）`);
  const [cr, cc] = def.catStart;
  if (!inBounds(board, cr, cc)) errs.push('catStart が盤外');
  else if (!tileAt(board, cr, cc)) errs.push('catStart が穴の上');
  if (def.parMoves < def.optimalMoves) errs.push('parMoves が optimalMoves より小さい');
  return errs;
}
