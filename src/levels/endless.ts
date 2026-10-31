import { idx } from '../core/board.ts';
import { E, N, S, W } from '../core/conn.ts';
import type { Board, LevelDef, Tile } from '../core/types.ts';
import { slideTargets } from '../core/slide.ts';
import { createBoard } from '../core/board.ts';
import { boardToLayout, isSolvedLayout, rng, scramble } from '../solver/generate.ts';
import { solve } from '../solver/search.ts';
import { dailyLevel } from './daily.ts';

/**
 * むげん — 面の番号から盤を作る。同じ番号からは必ず同じ盤が出る。
 *
 * きょうの めいろ（daily.ts）は手作りの 18 面を骨格にしている。毎日 1 問ならそれで足りるが、
 * 続けて何十面も遊ぶと骨格が見えてしまう。ここでは「解けた盤」そのものを作る:
 *   1. 猫の位置からゴールまでの道を引く（曲がり角を含む一本道）
 *   2. 残りのマスに道・空き地・固定タイルを置き、穴を開ける
 *   3. かき混ぜて、ソルバーで最短手数を測り、目標の範囲だけ採る
 * 置いた物に役割を持たせるため、魚は道の上にだけ置き、固定タイルは押せるタイルを残す数に抑える。
 */

export const ENDLESS_PREFIX = 'E-';

export function isEndlessId(id: string): boolean {
  return /^E-\d+$/.test(id);
}

export function endlessId(n: number): string {
  return `${ENDLESS_PREFIX}${n}`;
}

export function endlessNumber(id: string): number {
  return Number(id.slice(ENDLESS_PREFIX.length));
}

type Tier = { size: number; lo: number; hi: number; fish: number; fixed: number; pathLen: [number, number] };

/** 番号が進むほど大きく・長くする。境目で急に跳ねないよう、範囲を半分ずつ重ねる。 */
export function tierFor(n: number): Tier {
  if (n <= 5) return { size: 4, lo: 2, hi: 3, fish: 0, fixed: 0.1, pathLen: [4, 6] };
  if (n <= 12) return { size: 4, lo: 3, hi: 4, fish: 0.3, fixed: 0.15, pathLen: [5, 7] };
  if (n <= 25) return { size: 5, lo: 4, hi: 5, fish: 0.4, fixed: 0.2, pathLen: [6, 9] };
  if (n <= 50) return { size: 5, lo: 5, hi: 6, fish: 0.6, fixed: 0.25, pathLen: [7, 10] };
  return { size: 5, lo: 6, hi: 8, fish: 0.7, fixed: 0.25, pathLen: [8, 11] };
}

const DIRS = [
  { dr: -1, dc: 0, bit: N, back: S },
  { dr: 0, dc: 1, bit: E, back: W },
  { dr: 1, dc: 0, bit: S, back: N },
  { dr: 0, dc: -1, bit: W, back: E },
] as const;

/** 道以外のマスに置く形。直線・曲がり・T 字・空き地を混ぜる。 */
const FILLERS = [N | S, E | W, N | E, E | S, S | W, W | N, N | E | S, E | S | W, S | W | N, W | N | E, 0];

/** 解けた盤を 1 つ作る。作れなければ null。 */
function solvedBoard(rand: () => number, t: Tier): LevelDef | null {
  const n = t.size;
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rand() * a.length)]!;
  const want = t.pathLen[0] + Math.floor(rand() * (t.pathLen[1] - t.pathLen[0] + 1));

  // 1. 一本道（自分と交差しない）。行き止まったらそこで切る。
  const start = { r: Math.floor(rand() * n), c: Math.floor(rand() * n) };
  const path = [start];
  const onPath = new Set([start.r * n + start.c]);
  while (path.length < want) {
    const cur = path[path.length - 1]!;
    const options = DIRS.filter((d) => {
      const r = cur.r + d.dr;
      const c = cur.c + d.dc;
      return r >= 0 && r < n && c >= 0 && c < n && !onPath.has(r * n + c);
    });
    if (options.length === 0) break;
    const d = pick(options);
    const next = { r: cur.r + d.dr, c: cur.c + d.dc };
    path.push(next);
    onPath.add(next.r * n + next.c);
  }
  if (path.length < t.pathLen[0]) return null;

  const cells: Board['cells'] = new Array(n * n).fill(null);
  let id = 0;
  const conns = new Array<number>(n * n).fill(0);
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const d = DIRS.find((x) => a.r + x.dr === b.r && a.c + x.dc === b.c)!;
    conns[a.r * n + a.c]! |= d.bit;
    conns[b.r * n + b.c]! |= d.back;
  }
  const goal = path[path.length - 1]!;

  // 2. 穴はゴール・猫から離れた道以外のマスに 1 つ。
  const others = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!onPath.has(r * n + c)) others.push({ r, c });
  if (others.length === 0) return null;
  const hole = pick(others);

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const k = r * n + c;
      if (r === hole.r && c === hole.c) continue;
      const isPath = onPath.has(k);
      const isGoal = r === goal.r && c === goal.c;
      const tile: Tile = {
        id: id++,
        conn: isPath ? conns[k]! : pick(FILLERS),
        kind: isGoal ? 'goal' : 'road',
        fixed: !isPath && rand() < t.fixed,
        fish: false,
      };
      cells[k] = tile;
    }
  }
  // 魚は道の途中（猫の位置とゴールを除く）に 1 匹まで。
  if (rand() < t.fish && path.length > 3) {
    const f = path[1 + Math.floor(rand() * (path.length - 2))]!;
    cells[f.r * n + f.c]!.fish = true;
  }

  const def: LevelDef = {
    id: '',
    name: '',
    width: n,
    height: n,
    layout: boardToLayout({ width: n, height: n, cells }),
    catStart: [start.r, start.c],
    optimalMoves: 0,
    parMoves: 0,
  };
  return isSolvedLayout(def) ? def : null;
}

/** かき混ぜた盤の質。押せるタイルが 1 枚しかない盤は、考えずに押すだけになる。 */
function goodStart(def: LevelDef): boolean {
  return slideTargets(createBoard(def)).length >= 2;
}

/**
 * 番号 n の面を作る。
 * 梯子: 目標の手数で ATTEMPTS 回 → 手数の範囲を下へ 1 広げて同じ回数 → きょうの めいろの方式（必ず出る）。
 */
export function endlessLevel(n: number, attempts = 60): LevelDef {
  const id = endlessId(n);
  const rand = rng((Math.imul(n, 0x9e3779b1) ^ 0x5bd1e995) >>> 0 || 1);
  const t = tierFor(n);
  const wrap = (def: LevelDef, optimal: number): LevelDef => ({
    ...def,
    id,
    name: `むげん ${n}`,
    optimalMoves: optimal,
    parMoves: optimal + 2,
    hint: undefined,
  });

  for (const lo of [t.lo, Math.max(1, t.lo - 1)]) {
    for (let i = 0; i < attempts; i++) {
      const solved = solvedBoard(rand, t);
      const steps = t.hi * 2 + Math.floor(rand() * 4);
      const seed = Math.floor(rand() * 0x7fffffff) + 1;
      if (!solved) continue;
      const { layout, catStart } = scramble(solved, steps, seed);
      const cand: LevelDef = { ...solved, layout, catStart };
      if (isSolvedLayout(cand) || !goodStart(cand)) continue;
      const sol = solve(cand, t.hi);
      if (!sol || sol.length < lo) continue;
      return wrap(cand, sol.length);
    }
  }
  const fallback = dailyLevel(`D-${String(n).padStart(8, '0')}`);
  return wrap(fallback, fallback.optimalMoves);
}
