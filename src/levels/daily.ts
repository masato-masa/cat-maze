import { createBoard, idx } from '../core/board.ts';
import { E, N, S, W } from '../core/conn.ts';
import type { Conn } from '../core/conn.ts';
import { applySlide } from '../core/slide.ts';
import type { Board, LevelDef, Pos } from '../core/types.ts';
import { boardToLayout, isSolvedLayout, rng, scramble } from '../solver/generate.ts';
import { solve } from '../solver/search.ts';
import { W3 } from './w3.ts';
import { W4 } from './w4.ts';
import { W5 } from './w5.ts';

/**
 * きょうの めいろ — 日付から 1 日 1 問を作る。
 *
 * 白紙から乱数で盤を作ると「適当に置いた」盤になる（調査 6: 配置のまとまりの無さで
 * 自動生成は見抜かれる）。そこで手作りの W3〜W5 を骨格にし、
 * 解いた形 → 左右・上下の反転 → 日付のシードでかき混ぜる、の順で作る。
 * 固定タイル・魚・ゴールの配置は手作りのまま残る。
 *
 * 同じ日付からは必ず同じ盤が出る（シードが日付だけで決まる）。
 */

export const DAILY_PREFIX = 'D-';
/** W2 まで終えると、魚と固定タイルが出そろう。それまでは閉じておく。 */
export const DAILY_UNLOCK_AFTER = 'W2-6';

const BASES: LevelDef[] = [...W3, ...W4, ...W5];
/** この範囲の最短手数になったものだけ採る。手作りの終盤（5〜6 手）と同じくらい。 */
const MIN_MOVES = 5;
const MAX_MOVES = 8;
/** かき混ぜの手数。最短手数はこれより短くなることが多い。 */
const SCRAMBLE_STEPS = [8, 10, 12];
const ATTEMPTS = 24;

/** 端末の日付で「きょう」の ID を作る。日付の変わり目は端末の時刻に従う。 */
export function dailyId(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${DAILY_PREFIX}${y}${m}${day}`;
}

export function isDailyId(id: string): boolean {
  return /^D-\d{8}$/.test(id);
}

/** "D-20261101" → 文字列ハッシュ（FNV-1a）。0 にはしない（xorshift が止まるため）。 */
function seedOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0 || 1;
}

function mirrorConn(c: Conn, h: boolean, v: boolean): Conn {
  let out = c;
  if (h) out = (out & (N | S)) | (out & E ? W : 0) | (out & W ? E : 0);
  if (v) out = (out & (E | W)) | (out & N ? S : 0) | (out & S ? N : 0);
  return out;
}

/** 盤を左右・上下に反転する。迷路の筋はそのまま、見た目だけが変わる。 */
function mirror(def: LevelDef, h: boolean, v: boolean): LevelDef {
  const b = createBoard(def);
  const cells: Board['cells'] = new Array(b.cells.length).fill(null);
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const t = b.cells[idx(b, r, c)];
      if (!t) continue;
      const nr = v ? b.height - 1 - r : r;
      const nc = h ? b.width - 1 - c : c;
      cells[idx(b, nr, nc)] = { ...t, conn: mirrorConn(t.conn, h, v) };
    }
  }
  const [cr, cc] = def.catStart;
  return {
    ...def,
    layout: boardToLayout({ ...b, cells }),
    catStart: [v ? b.height - 1 - cr : cr, h ? b.width - 1 - cc : cc],
  };
}

/** 手作りの面を最短手順で解いた形にする。かき混ぜの出発点。 */
function solvedForm(def: LevelDef): LevelDef | null {
  const sol = solve(def, def.optimalMoves);
  if (!sol) return null;
  let board = createBoard(def);
  let cat: Pos = { r: def.catStart[0], c: def.catStart[1] };
  for (const p of sol) {
    const res = applySlide(board, cat, p);
    board = res.board;
    cat = res.cat;
  }
  const out = { ...def, layout: boardToLayout(board), catStart: [cat.r, cat.c] as [number, number] };
  return isSolvedLayout(out) ? out : null;
}

const solvedCache = new Map<string, LevelDef | null>();
function cachedSolved(def: LevelDef): LevelDef | null {
  if (!solvedCache.has(def.id)) solvedCache.set(def.id, solvedForm(def));
  return solvedCache.get(def.id)!;
}

/**
 * 日付の ID から面を作る。
 * 梯子: 骨格とかき混ぜを変えて ATTEMPTS 回試し、手数の範囲を外れたら範囲を広げ、
 * 最後は骨格の面をそのまま出す（必ず何か出る）。
 */
export function dailyLevel(id: string, attempts = ATTEMPTS): LevelDef {
  const rand = rng(seedOf(id));
  const base = (): LevelDef => BASES[Math.floor(rand() * BASES.length)]!;
  const wrap = (def: LevelDef, optimal: number): LevelDef => ({
    ...def,
    id,
    name: 'きょうの めいろ',
    optimalMoves: optimal,
    parMoves: optimal + 2,
    hint: undefined,
  });

  for (const [lo, hi] of [
    [MIN_MOVES, MAX_MOVES],
    [MIN_MOVES - 1, MAX_MOVES],
    [3, MAX_MOVES + 2],
  ] as const) {
    for (let i = 0; i < attempts; i++) {
      const src = base();
      const solved = cachedSolved(src);
      const steps = SCRAMBLE_STEPS[Math.floor(rand() * SCRAMBLE_STEPS.length)]!;
      const seed = Math.floor(rand() * 0x7fffffff) + 1;
      const h = rand() < 0.5;
      const v = rand() < 0.5;
      if (!solved) continue;
      const flipped = mirror(solved, h, v);
      const { layout, catStart } = scramble(flipped, steps, seed);
      const cand: LevelDef = { ...flipped, layout, catStart };
      if (isSolvedLayout(cand)) continue;
      const sol = solve(cand, hi);
      if (!sol || sol.length < lo) continue;
      return wrap(cand, sol.length);
    }
  }
  const fallback = base();
  return wrap(fallback, fallback.optimalMoves);
}
