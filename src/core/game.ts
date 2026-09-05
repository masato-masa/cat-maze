import { createBoard, idx, passable, reachable, tileAt } from './board.ts';
import { ALL_DIRS, delta } from './conn.ts';
import type { Dir } from './conn.ts';
import { countFish, isCleared } from './rules.ts';
import { applySlide } from './slide.ts';
import type { Board, GameState, LevelDef, Pos } from './types.ts';

/** 猫が乗ったマスの魚を回収した新しい状態を返す。 */
function pickUp(s: GameState): GameState {
  const t = tileAt(s.board, s.cat.r, s.cat.c);
  if (!t || !t.fish) return s;
  const cells = s.board.cells.slice();
  cells[idx(s.board, s.cat.r, s.cat.c)] = { ...t, fish: false };
  const board: Board = { ...s.board, cells };
  return { ...s, board, fishTaken: s.fishTaken + 1 };
}

/** 魚の回収とクリア判定を反映させる。状態遷移の最後に必ず通す。 */
function settle(s: GameState): GameState {
  const picked = pickUp(s);
  const cleared = isCleared(picked);
  return cleared === picked.cleared ? picked : { ...picked, cleared };
}

export function newGame(def: LevelDef): GameState {
  const board = createBoard(def);
  return settle({
    board,
    cat: { r: def.catStart[0], c: def.catStart[1] },
    moves: 0,
    fishTaken: 0,
    fishTotal: countFish(board),
    cleared: false,
  });
}

export function canWalk(s: GameState, d: Dir): boolean {
  return passable(s.board, s.cat, d);
}

/** 歩行。手数は増えない。歩けない場合は同一オブジェクトを返す。 */
export function walk(s: GameState, d: Dir): GameState {
  if (!canWalk(s, d)) return s;
  const { dr, dc } = delta(d);
  return settle({ ...s, cat: { r: s.cat.r + dr, c: s.cat.c + dc } });
}

export function reachableSet(s: GameState): Set<number> {
  return reachable(s.board, s.cat);
}

/** 猫から to までの最短経路を方向の列で返す。到達不能なら null。 */
export function shortestPath(s: GameState, to: Pos): Dir[] | null {
  const b = s.board;
  const start = idx(b, s.cat.r, s.cat.c);
  const goal = idx(b, to.r, to.c);
  if (start === goal) return [];
  const prev = new Map<number, { from: number; d: Dir }>();
  const queue: Pos[] = [s.cat];
  const seen = new Set<number>([start]);
  while (queue.length) {
    const p = queue.shift()!;
    for (const d of ALL_DIRS) {
      if (!passable(b, p, d)) continue;
      const { dr, dc } = delta(d);
      const q = { r: p.r + dr, c: p.c + dc };
      const k = idx(b, q.r, q.c);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, { from: idx(b, p.r, p.c), d });
      if (k === goal) {
        const out: Dir[] = [];
        for (let cur = k; cur !== start; ) {
          const e = prev.get(cur)!;
          out.push(e.d);
          cur = e.from;
        }
        return out.reverse();
      }
      queue.push(q);
    }
  }
  return null;
}

/** 到達領域内の目的地まで歩く。経路上の魚も回収する。 */
export function walkTo(s: GameState, to: Pos): GameState {
  const path = shortestPath(s, to);
  if (!path) return s;
  let cur = s;
  for (const d of path) cur = walk(cur, d);
  return cur;
}

/** スライド。1 手を消費する。 */
export function slide(s: GameState, target: Pos): GameState {
  const r = applySlide(s.board, s.cat, target);
  return settle({ ...s, board: r.board, cat: r.cat, moves: s.moves + 1 });
}

/**
 * Undo スタックを持つセッション。
 * スナップショットは 1 手（1 スライド）単位。歩行は手数を消費しないため
 * 単独では Undo 点を作らず、直前のスライド直前の状態まで巻き戻る。
 */
export class GameSession {
  readonly def: LevelDef;
  private state: GameState;
  private history: GameState[] = [];

  constructor(def: LevelDef) {
    this.def = def;
    this.state = newGame(def);
  }

  get current(): GameState {
    return this.state;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  walk(d: Dir): GameState {
    this.state = walk(this.state, d);
    return this.state;
  }

  walkTo(to: Pos): GameState {
    this.state = walkTo(this.state, to);
    return this.state;
  }

  slide(target: Pos): GameState {
    this.history.push(this.state);
    this.state = slide(this.state, target);
    return this.state;
  }

  undo(): GameState {
    const prev = this.history.pop();
    if (prev) this.state = prev;
    return this.state;
  }

  reset(): GameState {
    this.history = [];
    this.state = newGame(this.def);
    return this.state;
  }
}
