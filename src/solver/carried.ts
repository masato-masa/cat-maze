// 「一石二鳥」（猫が足場ごと運ばれるスライド）が最短解にどれだけ要るかを測る。
// 面の生成では、条件で縛らずに「重み」として使う（候補の中で、運ばれる手が要る面を選びやすくする）。
import { newGame, slide } from '../core/game.ts';
import { slideTargets } from '../core/slide.ts';
import type { GameState, LevelDef } from '../core/types.ts';
import { solvedHere, stateKey } from './search.ts';

const INF = 99;

/** 手数 n の解すべてのうち、猫が運ばれたスライドの回数の最小値。解が無ければ INF(99)。 */
export function minCarried(def: LevelDef, n: number): number {
  const memo = new Map<string, number>();
  const go = (s: GameState, depth: number): number => {
    if (solvedHere(s)) return 0;
    if (depth === 0) return INF;
    const key = `${stateKey(s)}#${depth}`;
    const m = memo.get(key);
    if (m !== undefined) return m;
    let best = INF;
    for (const t of slideTargets(s.board)) {
      const next = slide(s, t);
      const carried = next.cat.r !== s.cat.r || next.cat.c !== s.cat.c ? 1 : 0;
      const sub = go(next, depth - 1);
      if (sub < INF) best = Math.min(best, sub + carried);
    }
    memo.set(key, best);
    return best;
  };
  return go(newGame(def), n);
}

/** 候補の重み。運ばれる手が 1 回要れば 1、2 回以上なら 2（それ以上は増やさない）。 */
export function carriedWeight(def: LevelDef, n: number): number {
  const m = minCarried(def, n);
  return m >= INF ? 0 : Math.min(2, m);
}
