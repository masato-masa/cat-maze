// 密度の高い盤面をランダムに作り、ソルバーで狙った最短手数のものだけを拾う作業用ツール。
import { createBoard, idx, reachable } from '../src/core/board.ts';
import { connToString } from '../src/core/conn.ts';
import { newGame, slide } from '../src/core/game.ts';
import { rng } from '../src/solver/generate.ts';
import { solve } from '../src/solver/search.ts';
import type { LevelDef } from '../src/core/types.ts';

/** 接続数の分布。行き止まりを減らし、直線・カーブ・T 字を多めにする。 */
const CONN_POOL = [
  3, 6, 12, 9, // カーブ
  3, 6, 12, 9,
  5, 10, 5, 10, // 直線
  7, 14, 13, 11, // T 字
  1, 2, 4, 8, // 行き止まり
  0, // 空き地
];

export type GenOpts = {
  w: number;
  h: number;
  want: number;
  seeds: number;
  fixedCount: number;
  /** 最初の最適手で猫が運ばれる盤面だけを拾う */
  requireCarry?: boolean;
  /** 初期状態で猫が歩ける範囲の下限（0 なら制限なし） */
  minReach?: number;
  /** 初期状態で猫が歩ける範囲の上限 */
  maxReach?: number;
  take?: number;
  /** 使用するタイル形状のプール（conn 値）。省略時は既定プール。 */
  pool?: number[];
  /** ゴールタイルを固定する（W1〜W3 で使う。動くゴールは W4 の主題なので出さない） */
  fixedGoal?: boolean;
  /** 置く魚の数 */
  fishCount?: number;
  /** 最適解のどこかでゴールタイル自身を押す盤面だけを拾う（W4 用） */
  requireGoalSlide?: boolean;
  /** 1 候補あたりの探索時間の上限（ミリ秒）。超えたら捨てる */
  budgetMs?: number;
};

export function show(layout: string[][], cat: [number, number]): string {
  const w = Math.max(...layout.flat().map((s) => s.length)) + 3;
  return layout
    .map((row, r) =>
      row.map((c, i) => (r === cat[0] && i === cat[1] ? `<${c}>` : c).padEnd(w)).join(''),
    )
    .join('\n');
}

export function generate(opts: GenOpts): LevelDef[] {
  const { w, h, want, seeds, fixedCount } = opts;
  const take = opts.take ?? 3;
  const out: LevelDef[] = [];

  for (let seed = 1; seed <= seeds && out.length < take; seed++) {
    const rand = rng(seed * 7919 + w * 131 + h * 17 + want * 3 + fixedCount);
    const pool = opts.pool ?? CONN_POOL;
    const n = w * h;
    const cells: string[] = [];
    for (let i = 0; i < n; i++) {
      cells.push(connToString(pool[Math.floor(rand() * pool.length)]!));
    }
    const holeAt = Math.floor(rand() * n);
    cells[holeAt] = 'HOLE';

    const free = [...Array(n).keys()].filter((i) => i !== holeAt);
    const goalAt = free[Math.floor(rand() * free.length)]!;
    if (cells[goalAt] === 'X') cells[goalAt] = 'NESW';
    cells[goalAt] = `GOAL:${cells[goalAt]}`;
    if (opts.fixedGoal) cells[goalAt] = `FIXED:${cells[goalAt]}`;

    const catFree = free.filter((i) => i !== goalAt);
    const catAt = catFree[Math.floor(rand() * catFree.length)]!;

    const fishPool = catFree.filter((i) => i !== catAt);
    for (let k = 0; k < (opts.fishCount ?? 0) && fishPool.length; k++) {
      const j = Math.floor(rand() * fishPool.length);
      const at = fishPool.splice(j, 1)[0]!;
      if (cells[at] === 'X') continue; // 道の無いマスに魚は置かない
      cells[at] = `FISH:${cells[at]}`;
    }

    const fixedPool = catFree.filter((i) => i !== catAt);
    for (let k = 0; k < fixedCount && fixedPool.length; k++) {
      const j = Math.floor(rand() * fixedPool.length);
      const at = fixedPool.splice(j, 1)[0]!;
      cells[at] = `FIXED:${cells[at]}`;
    }

    const layout: string[][] = [];
    for (let r = 0; r < h; r++) layout.push(cells.slice(r * w, r * w + w));
    const catStart: [number, number] = [Math.floor(catAt / w), catAt % w];

    const def: LevelDef = {
      id: `gen-${seed}`, name: `gen-${seed}`, width: w, height: h,
      layout, catStart, optimalMoves: 0, parMoves: 99,
    };

    const board = createBoard(def);
    const reach = reachable(board, { r: catStart[0], c: catStart[1] }).size;
    if (opts.minReach != null && reach < opts.minReach) continue;
    if (opts.maxReach != null && reach > opts.maxReach) continue;

    const t0 = Date.now();
    const sol = solve(def, want + 1);
    const ms = Date.now() - t0;
    if (opts.budgetMs != null && ms > opts.budgetMs) continue;
    if (!sol || sol.length !== want) continue;

    if (opts.requireCarry) {
      const s0 = newGame(def);
      const s1 = slide(s0, sol[0]!);
      if (s1.cat.r === s0.cat.r && s1.cat.c === s0.cat.c) continue;
    }

    if (opts.requireGoalSlide) {
      let st = newGame(def);
      let slidGoal = false;
      for (const t of sol) {
        const tile = st.board.cells[t.r * w + t.c];
        if (tile?.kind === 'goal') slidGoal = true;
        st = slide(st, t);
      }
      if (!slidGoal) continue;
    }

    out.push({ ...def, optimalMoves: want, parMoves: want + 2 });
  }
  return out;
}

export function report(label: string, defs: LevelDef[]): void {
  if (defs.length === 0) {
    console.log(`### ${label}: 該当なし`);
    return;
  }
  for (const d of defs) {
    console.log(`### ${label} / ${d.id} 最短=${d.optimalMoves}`);
    console.log(show(d.layout, d.catStart));
    console.log('');
  }
}
