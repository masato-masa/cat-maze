import { holes, idx, tileAt } from './board.ts';
import type { Board, Pos } from './types.ts';

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * 対象タイルが押し込まれる穴を返す。
 * 同じ行/列にある穴のうち最も近いものを選ぶ。両側に同じ距離の穴があれば曖昧なので null。
 * 対象タイルと穴の間に固定タイルがある穴は候補から外す。
 */
export function holeFor(b: Board, target: Pos): Pos | null {
  const t = tileAt(b, target.r, target.c);
  if (!t || t.fixed) return null;

  const cands: { h: Pos; dist: number }[] = [];
  for (const h of holes(b)) {
    if (h.r !== target.r && h.c !== target.c) continue;
    const dr = sign(h.r - target.r);
    const dc = sign(h.c - target.c);
    const dist = Math.abs(h.r - target.r) + Math.abs(h.c - target.c);
    let blocked = false;
    for (let r = target.r + dr, c = target.c + dc; !(r === h.r && c === h.c); r += dr, c += dc) {
      const mid = tileAt(b, r, c);
      if (!mid || mid.fixed) {
        blocked = true;
        break;
      }
    }
    if (!blocked) cands.push({ h, dist });
  }
  if (cands.length === 0) return null;
  cands.sort((a, z) => a.dist - z.dist);
  if (cands.length > 1 && cands[0]!.dist === cands[1]!.dist) return null; // 曖昧
  return cands[0]!.h;
}

export function canSlide(b: Board, target: Pos): boolean {
  return holeFor(b, target) !== null;
}

/** 押せるタイルの一覧。ソルバーの手生成に使う。 */
export function slideTargets(b: Board): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      if (canSlide(b, { r, c })) out.push({ r, c });
    }
  }
  return out;
}

/**
 * 対象タイルから穴までの区間を穴側へ 1 マスずつ詰める。
 * 区間内に猫が乗っていれば、猫はタイルと一緒に運ばれる。
 */
export function applySlide(b: Board, cat: Pos, target: Pos): { board: Board; cat: Pos } {
  const hole = holeFor(b, target);
  if (!hole) throw new Error(`押せないタイル: (${target.r}, ${target.c})`);

  const cells = b.cells.slice();
  const board: Board = { width: b.width, height: b.height, cells };
  let newCat = cat;

  // タイルが動く向き（対象タイル -> 穴）
  const dr = sign(hole.r - target.r);
  const dc = sign(hole.c - target.c);

  // 穴の 1 つ手前から対象タイルへ向かって、1 つずつ穴側へ詰める
  for (let r = hole.r - dr, c = hole.c - dc; ; r -= dr, c -= dc) {
    cells[idx(board, r + dr, c + dc)] = cells[idx(board, r, c)]!;
    if (cat.r === r && cat.c === c) newCat = { r: r + dr, c: c + dc };
    if (r === target.r && c === target.c) break;
  }
  cells[idx(board, target.r, target.c)] = null; // ここが新しい穴

  return { board, cat: newCat };
}
