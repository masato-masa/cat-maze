import { describe, expect, it } from 'vitest';
import { endlessLevel, isEndlessId, tierFor } from '../../src/levels/endless.ts';
import { getLevel, nextLevelId } from '../../src/levels/index.ts';
import { validateLevel } from '../../src/levels/schema.ts';
import { solve } from '../../src/solver/search.ts';
import { ProgressStore, mapKV } from '../../src/ui/storage.ts';

describe('むげん', () => {
  it('ID と次の面', () => {
    expect(isEndlessId('E-12')).toBe(true);
    expect(isEndlessId('D-20261101')).toBe(false);
    expect(nextLevelId('E-12')).toBe('E-13');
  });

  it('同じ番号からは同じ盤が出る', () => {
    expect(endlessLevel(7)).toEqual(endlessLevel(7));
    expect(endlessLevel(7).layout).not.toEqual(endlessLevel(8).layout);
  });

  it.each([1, 2, 5, 6, 12, 13, 25, 26, 40])('%i 面目は妥当で、宣言した最短手数ちょうどで解け、段の範囲に入る', (n) => {
    const def = endlessLevel(n);
    const t = tierFor(n);
    expect(validateLevel(def)).toEqual([]);
    expect(solve(def, def.optimalMoves)?.length).toBe(def.optimalMoves);
    expect(solve(def, def.optimalMoves - 1)).toBeNull();
    expect(def.optimalMoves).toBeGreaterThanOrEqual(t.lo - 1);
    expect(def.optimalMoves).toBeLessThanOrEqual(t.hi);
    expect(def.width).toBe(t.size);
  });

  it('予算を 0 にしても、最後の段で必ず面が出る', () => {
    const def = endlessLevel(30, 0);
    expect(validateLevel(def)).toEqual([]);
    expect(solve(def, def.optimalMoves)).not.toBeNull();
    expect(def.id).toBe('E-30');
  });

  it('getLevel で開ける', () => {
    expect(getLevel('E-3')?.name).toBe('むげん 3');
  });

  it('続けてクリアした一番先の番号を覚える', () => {
    const store = new ProgressStore(mapKV());
    expect(store.endlessBest()).toBe(0);
    store.record('E-1', 3, 2);
    store.record('E-2', 2, 4);
    store.record('E-4', 3, 3);
    expect(store.endlessBest()).toBe(2);
  });
});
