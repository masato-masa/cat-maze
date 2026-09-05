import { ALL_DIRS, delta, isOpen, opposite, parseConn } from './conn.ts';
import type { Dir } from './conn.ts';
import type { Board, LevelDef, Pos, Tile, TileKind } from './types.ts';

export function idx(b: Board, r: number, c: number): number {
  return r * b.width + c;
}

export function posEq(a: Pos, p: Pos): boolean {
  return a.r === p.r && a.c === p.c;
}

export function inBounds(b: Board, r: number, c: number): boolean {
  return r >= 0 && r < b.height && c >= 0 && c < b.width;
}

export function tileAt(b: Board, r: number, c: number): Tile | null {
  if (!inBounds(b, r, c)) return null;
  return b.cells[idx(b, r, c)] ?? null;
}

export function isHole(b: Board, r: number, c: number): boolean {
  return inBounds(b, r, c) && b.cells[idx(b, r, c)] == null;
}

export function holes(b: Board): Pos[] {
  const out: Pos[] = [];
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      if (b.cells[idx(b, r, c)] == null) out.push({ r, c });
    }
  }
  return out;
}

/**
 * "FIXED:NS" のような 1 セル分の記述をタイルに変換する。"HOLE" なら null。
 * 修飾子は重ねられる: "FIXED:GOAL:NW" は動かないゴール。
 */
function parseCell(spec: string, id: number): Tile | null {
  if (spec === 'HOLE') return null;
  let kind: TileKind = 'road';
  let fixed = false;
  let fish = false;
  let rest = spec;
  for (;;) {
    const m = /^(FIXED|GOAL|FISH):(.*)$/.exec(rest);
    if (!m) break;
    if (m[1] === 'FIXED') fixed = true;
    else if (m[1] === 'GOAL') kind = 'goal';
    else fish = true;
    rest = m[2]!;
  }
  return { id, conn: parseConn(rest), kind, fixed, fish };
}

export function createBoard(def: LevelDef): Board {
  const cells: (Tile | null)[] = [];
  let id = 0;
  for (let r = 0; r < def.height; r++) {
    const row = def.layout[r];
    if (!row || row.length !== def.width) {
      throw new Error(`${def.id}: layout の ${r} 行目の長さが width(${def.width}) と一致しない`);
    }
    for (let c = 0; c < def.width; c++) cells.push(parseCell(row[c]!, id++));
  }
  return { width: def.width, height: def.height, cells };
}

/** 隣接する 2 セルの間を猫が通れるか。両側が互いの方向へ開いている必要がある。 */
export function passable(b: Board, from: Pos, d: Dir): boolean {
  const { dr, dc } = delta(d);
  const a = tileAt(b, from.r, from.c);
  const t = tileAt(b, from.r + dr, from.c + dc);
  if (!a || !t) return false; // 盤外または穴
  return isOpen(a.conn, d) && isOpen(t.conn, opposite(d));
}

/** 猫が歩行のみで到達できるセルの集合（idx の集合）。 */
export function reachable(b: Board, from: Pos): Set<number> {
  const seen = new Set<number>();
  if (!tileAt(b, from.r, from.c)) return seen;
  const stack: Pos[] = [from];
  seen.add(idx(b, from.r, from.c));
  while (stack.length) {
    const p = stack.pop()!;
    for (const d of ALL_DIRS) {
      if (!passable(b, p, d)) continue;
      const { dr, dc } = delta(d);
      const q = { r: p.r + dr, c: p.c + dc };
      const k = idx(b, q.r, q.c);
      if (seen.has(k)) continue;
      seen.add(k);
      stack.push(q);
    }
  }
  return seen;
}
