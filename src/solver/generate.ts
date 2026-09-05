import { createBoard, idx, reachable, tileAt } from '../core/board.ts';
import { connToString } from '../core/conn.ts';
import { applySlide, slideTargets } from '../core/slide.ts';
import type { Board, LevelDef, Pos } from '../core/types.ts';

/** 再現性のある擬似乱数（xorshift32）。 */
export function rng(seed: number): () => number {
  let x = seed | 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}

/** 盤面を layout 形式の文字列配列へ戻す。 */
export function boardToLayout(b: Board): string[][] {
  const out: string[][] = [];
  for (let r = 0; r < b.height; r++) {
    const row: string[] = [];
    for (let c = 0; c < b.width; c++) {
      const t = b.cells[idx(b, r, c)];
      if (!t) {
        row.push('HOLE');
        continue;
      }
      let s = connToString(t.conn);
      if (t.fish) s = `FISH:${s}`;
      if (t.kind === 'goal') s = `GOAL:${s}`;
      if (t.fixed) s = `FIXED:${s}`;
      row.push(s);
    }
    out.push(row);
  }
  return out;
}

/** 猫が歩くだけでゴールへ行け、魚も全部取れる状態か。 */
export function isSolvedLayout(def: LevelDef): boolean {
  const b = createBoard(def);
  const reach = reachable(b, { r: def.catStart[0], c: def.catStart[1] });
  let goalOk = false;
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const t = tileAt(b, r, c);
      if (!t) continue;
      const k = idx(b, r, c);
      if (t.fish && !reach.has(k)) return false;
      if (t.kind === 'goal' && reach.has(k)) goalOk = true;
    }
  }
  return goalOk;
}

/**
 * クリア済みの盤面から逆向きにランダムなスライドを steps 回かけて初期状態を作る。
 * 直前の手を打ち消す手は選ばないので、実際の最短手数は steps に近くなる。
 * （厳密な最短手数はソルバーで確定させること。）
 */
export function scramble(
  solved: LevelDef,
  steps: number,
  seed: number,
): { layout: string[][]; catStart: [number, number] } {
  const rand = rng(seed);
  let board = createBoard(solved);
  let cat: Pos = { r: solved.catStart[0], c: solved.catStart[1] };
  let last: Pos | null = null;

  for (let i = 0; i < steps; i++) {
    const targets = slideTargets(board).filter((t) => !(last && t.r === last.r && t.c === last.c));
    if (targets.length === 0) break;
    const pick = targets[Math.floor(rand() * targets.length)]!;
    // 押した後、その位置は穴になる。押し返す手は「今の猫の位置」ではなく穴の隣なので、
    // 直前に押したタイルが移動した先を覚えておいて次の手から除外する。
    const before = board;
    const res = applySlide(board, cat, pick);
    board = res.board;
    cat = res.cat;
    last = findMovedBack(before, pick);
  }
  return { layout: boardToLayout(board), catStart: [cat.r, cat.c] };
}

/** 直前のスライドを打ち消す手（押したタイルが移動した先）を返す。 */
function findMovedBack(before: Board, target: Pos): Pos {
  // 押したタイルは穴の位置へ 1 マス動く。穴の方向を求める。
  const holesBefore: Pos[] = [];
  for (let r = 0; r < before.height; r++) {
    for (let c = 0; c < before.width; c++) {
      if (before.cells[idx(before, r, c)] == null) holesBefore.push({ r, c });
    }
  }
  let nearest = holesBefore[0]!;
  let bestD = Infinity;
  for (const h of holesBefore) {
    if (h.r !== target.r && h.c !== target.c) continue;
    const d = Math.abs(h.r - target.r) + Math.abs(h.c - target.c);
    if (d < bestD) {
      bestD = d;
      nearest = h;
    }
  }
  const dr = Math.sign(nearest.r - target.r);
  const dc = Math.sign(nearest.c - target.c);
  return { r: target.r + dr, c: target.c + dc };
}
