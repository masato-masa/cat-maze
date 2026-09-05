import { describe, it, expect } from 'vitest';
import { ALL_LEVELS, WORLDS, getLevel, nextLevelId, worldOf } from '../../src/levels/index.ts';
import { validateLevel } from '../../src/levels/schema.ts';
import { newGame } from '../../src/core/game.ts';

describe('levels', () => {
  it('5 ワールド・全 30 ステージある', () => {
    expect(WORLDS).toHaveLength(5);
    expect(ALL_LEVELS).toHaveLength(30);
    for (const w of WORLDS) expect(w.levels, `${w.id}`).toHaveLength(6);
  });

  it('W1〜W3 のゴールは固定（動くゴールは W4 の主題）', () => {
    for (const def of ALL_LEVELS) {
      if (!/^W[123]-/.test(def.id)) continue;
      const goal = def.layout.flat().find((c) => c.includes('GOAL'));
      expect(goal, `${def.id} のゴールが固定されていない`).toContain('FIXED:');
    }
  });

  // 新概念は「安全な練習ステージ」で単独導入するため、ワールドの先頭では
  // 手数が前ワールドの終わりより下がってよい（仕様書 §9.2）。
  // 上がっていくべきなのは「ワールド内の並び」と「ワールドごとの上限」。
  it('ワールド内では手数が減らない', () => {
    for (const w of WORLDS) {
      for (let i = 1; i < w.levels.length; i++) {
        expect(w.levels[i]!.optimalMoves, `${w.levels[i]!.id}`).toBeGreaterThanOrEqual(
          w.levels[i - 1]!.optimalMoves,
        );
      }
    }
  });

  it('ワールドごとの最大手数は下がらない', () => {
    const max = WORLDS.map((w) => Math.max(...w.levels.map((l) => l.optimalMoves)));
    for (let i = 1; i < max.length; i++) {
      expect(max[i]!, `${WORLDS[i]!.id} の最大手数が前より小さい`).toBeGreaterThanOrEqual(max[i - 1]!);
    }
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
