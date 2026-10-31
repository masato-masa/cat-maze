import { describe, expect, it } from 'vitest';
import { dailyId, dailyLevel, isDailyId } from '../../src/levels/daily.ts';
import { getLevel } from '../../src/levels/index.ts';
import { validateLevel } from '../../src/levels/schema.ts';
import { solve } from '../../src/solver/search.ts';

const days = Array.from({ length: 30 }, (_, i) => dailyId(new Date(2026, 10, 1 + i)));

describe('きょうの めいろ', () => {
  it('日付から ID を作る', () => {
    expect(dailyId(new Date(2026, 10, 1))).toBe('D-20261101');
    expect(isDailyId('D-20261101')).toBe(true);
    expect(isDailyId('W1-1')).toBe(false);
  });

  it('同じ日付からは同じ盤が出る', () => {
    expect(dailyLevel('D-20261101')).toEqual(dailyLevel('D-20261101'));
    expect(dailyLevel('D-20261101').layout).not.toEqual(dailyLevel('D-20261102').layout);
  });

  it.each(days)('%s は妥当で、宣言した最短手数ちょうどで解ける', (id) => {
    const def = dailyLevel(id);
    expect(validateLevel(def)).toEqual([]);
    expect(solve(def, def.optimalMoves)?.length).toBe(def.optimalMoves);
    expect(solve(def, def.optimalMoves - 1)).toBeNull();
    expect(def.optimalMoves).toBeGreaterThanOrEqual(5);
  });

  it('予算を 0 にしても、最後の段で必ず面が出る', () => {
    const def = dailyLevel('D-20261101', 0);
    expect(validateLevel(def)).toEqual([]);
    expect(solve(def, def.optimalMoves)).not.toBeNull();
  });

  it('getLevel で開ける', () => {
    expect(getLevel('D-20261101')?.name).toBe('きょうの めいろ');
  });
});
