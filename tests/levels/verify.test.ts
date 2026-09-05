import { describe, it, expect } from 'vitest';
import { ALL_LEVELS } from '../../src/levels/index.ts';
import { solve } from '../../src/solver/search.ts';

describe('ステージの最短手数', () => {
  for (const def of ALL_LEVELS) {
    it(`${def.id} はちょうど ${def.optimalMoves} 手で解ける`, () => {
      const sol = solve(def, def.optimalMoves);
      expect(sol, `${def.id} は ${def.optimalMoves} 手では解けない`).not.toBeNull();
      expect(sol!.length).toBe(def.optimalMoves);
    });

    it(`${def.id} は ${def.optimalMoves - 1} 手では解けない`, () => {
      if (def.optimalMoves === 0) return;
      expect(solve(def, def.optimalMoves - 1)).toBeNull();
    });
  }
});
