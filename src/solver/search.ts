import { idx, reachable, tileAt } from '../core/board.ts';
import { newGame, slide } from '../core/game.ts';
import { slideTargets } from '../core/slide.ts';
import type { GameState, LevelDef, Pos } from '../core/types.ts';

/**
 * 状態キー。タイル配置 ＋ 猫の到達領域の代表点 ＋ 取得済み魚数。
 * 猫の正確な位置は含めない。歩行が 0 手なので、
 * 同じ盤面・同じ到達領域なら猫がどこに立っていても等価だから。
 */
export function stateKey(s: GameState): string {
  const cells = s.board.cells
    .map((t) => (t == null ? '.' : `${t.conn}${t.kind[0]}${t.fixed ? 'x' : ''}${t.fish ? 'f' : ''}`))
    .join(',');
  let rep = -1;
  for (const k of reachable(s.board, s.cat)) {
    if (rep < 0 || k < rep) rep = k;
  }
  return `${cells}|${rep}|${s.fishTaken}`;
}

/** 歩くだけでクリアできる状態か。歩行は 0 手なので、これが探索のゴール条件になる。 */
function solvedHere(s: GameState): boolean {
  const reach = reachable(s.board, s.cat);
  let goalReachable = false;
  for (let r = 0; r < s.board.height; r++) {
    for (let c = 0; c < s.board.width; c++) {
      const t = tileAt(s.board, r, c);
      if (!t) continue;
      const k = idx(s.board, r, c);
      if (t.fish && !reach.has(k)) return false; // 届かない魚がある
      if (t.kind === 'goal' && reach.has(k)) goalReachable = true;
    }
  }
  return goalReachable;
}

/** 深さ制限付き DFS。転置表には「その残余深さで未解決だった」ことを記録する。 */
function dfs(s: GameState, depth: number, seen: Map<string, number>, path: Pos[]): Pos[] | null {
  if (solvedHere(s)) return path.slice();
  if (depth === 0) return null;

  const key = stateKey(s);
  const best = seen.get(key);
  if (best !== undefined && best >= depth) return null;
  seen.set(key, depth);

  for (const t of slideTargets(s.board)) {
    path.push(t);
    const found = dfs(slide(s, t), depth - 1, seen, path);
    path.pop();
    if (found) return found;
  }
  return null;
}

/** 反復深化。maxDepth まで探して最短手順を返す。見つからなければ null。 */
export function solve(def: LevelDef, maxDepth: number): Pos[] | null {
  const start = newGame(def);
  for (let d = 0; d <= maxDepth; d++) {
    const found = dfs(start, d, new Map(), []);
    if (found) return found;
  }
  return null;
}

export function hasSolutionWithin(def: LevelDef, depth: number): boolean {
  return solve(def, depth) !== null;
}
