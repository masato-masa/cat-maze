import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressStore, mapKV } from '../../src/ui/storage.ts';
import { ALL_LEVELS } from '../../src/levels/index.ts';

describe('ProgressStore', () => {
  let store: ProgressStore;
  beforeEach(() => {
    store = new ProgressStore(mapKV(new Map()));
  });

  it('最初は W1-1 だけ解放されている', () => {
    expect(store.isUnlocked('W1-1')).toBe(true);
    expect(store.isUnlocked('W1-2')).toBe(false);
  });

  it('クリアすると次が解放される', () => {
    store.record('W1-1', 3, 1);
    expect(store.isUnlocked('W1-2')).toBe(true);
    expect(store.getStars('W1-1')).toBe(3);
  });

  it('ワールドをまたいでも解放がつながる', () => {
    for (const l of ALL_LEVELS.slice(0, 6)) store.record(l.id, 1, 9);
    expect(store.isUnlocked('W2-1')).toBe(true);
  });

  it('星は下がらず、手数は良い方が残る', () => {
    store.record('W1-1', 3, 1);
    store.record('W1-1', 1, 8);
    expect(store.getStars('W1-1')).toBe(3);
    expect(store.bestMoves('W1-1')).toBe(1);
  });

  it('未クリアのステージは星 0', () => {
    expect(store.getStars('W1-3')).toBe(0);
    expect(store.bestMoves('W1-3')).toBeNull();
  });

  it('壊れた保存データを読んでも落ちない', () => {
    const kv = mapKV(new Map([['catmaze_progress', '{{{ not json']]));
    expect(() => new ProgressStore(kv)).not.toThrow();
    expect(new ProgressStore(kv).getStars('W1-1')).toBe(0);
  });

  it('配列が入っていても落ちない', () => {
    const kv = mapKV(new Map([['catmaze_progress', '[1,2,3]']]));
    expect(new ProgressStore(kv).getStars('W1-1')).toBe(0);
  });

  it('形の違うレコードは捨てる', () => {
    const kv = mapKV(new Map([['catmaze_progress', '{"W1-1":{"stars":9,"moves":1},"W1-2":{"stars":2,"moves":3}}']]));
    const s = new ProgressStore(kv);
    expect(s.getStars('W1-1')).toBe(0);
    expect(s.getStars('W1-2')).toBe(2);
  });

  it('保存した内容は読み直せる', () => {
    const m = new Map<string, string>();
    new ProgressStore(mapKV(m)).record('W1-1', 2, 4);
    expect(new ProgressStore(mapKV(m)).getStars('W1-1')).toBe(2);
  });

  it('firstUnclearedId は続きから遊ぶステージを返す', () => {
    expect(store.firstUnclearedId()).toBe('W1-1');
    store.record('W1-1', 2, 3);
    expect(store.firstUnclearedId()).toBe('W1-2');
  });

  it('totalStars と worldStars は合計を返す', () => {
    store.record('W1-1', 3, 1);
    store.record('W1-2', 2, 3);
    expect(store.totalStars()).toBe(5);
    expect(store.worldStars('W1')).toBe(5);
    expect(store.worldStars('W2')).toBe(0);
  });

  it('clear で全部消える', () => {
    store.record('W1-1', 3, 1);
    store.clear();
    expect(store.getStars('W1-1')).toBe(0);
    expect(store.isUnlocked('W1-2')).toBe(false);
  });
});
