import { describe, it, expect } from 'vitest';
import { ALL_LEVELS, WORLDS, getLevel, nextLevelId, worldOf } from '../../src/levels/index.ts';
import { validateLevel } from '../../src/levels/schema.ts';
import { newGame } from '../../src/core/game.ts';

describe('levels', () => {
  it('W1 は 6 ステージある', () => {
    expect(WORLDS[0]!.levels).toHaveLength(6);
  });

  it('すべてのステージが妥当', () => {
    for (const def of ALL_LEVELS) {
      expect(validateLevel(def), `${def.id}: ${validateLevel(def).join(' / ')}`).toEqual([]);
    }
  });

  it('ステージ ID は重複しない', () => {
    const ids = ALL_LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('初期状態でクリア済みのステージは無い', () => {
    for (const def of ALL_LEVELS) {
      expect(newGame(def).cleared, `${def.id} は最初からクリア済み`).toBe(false);
    }
  });

  it('すべてのステージにヒントがある', () => {
    for (const def of ALL_LEVELS) expect(def.hint, `${def.id} にヒントが無い`).toBeTruthy();
  });

  it('getLevel は ID で引ける', () => {
    expect(getLevel('W1-1')!.id).toBe('W1-1');
    expect(getLevel('nope')).toBeUndefined();
  });

  it('nextLevelId は次のステージを返し、最後は null', () => {
    expect(nextLevelId('W1-1')).toBe('W1-2');
    expect(nextLevelId(ALL_LEVELS[ALL_LEVELS.length - 1]!.id)).toBeNull();
  });

  it('worldOf はステージの属するワールドを返す', () => {
    expect(worldOf('W1-3')!.id).toBe('W1');
    expect(worldOf('nope')).toBeUndefined();
  });
});
