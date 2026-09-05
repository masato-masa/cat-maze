import { describe, it, expect } from 'vitest';
import { GameSession, newGame, shortestPath, slide, walk, walkTo } from '../../src/core/game.ts';
import { starsFor } from '../../src/core/rules.ts';
import type { LevelDef } from '../../src/core/types.ts';

/** 1x4。猫 -> 魚 -> ゴール が横一列。穴は右端。 */
const def: LevelDef = {
  id: 'T3',
  name: 'game',
  width: 4,
  height: 1,
  layout: [['E', 'FISH:EW', 'GOAL:W', 'HOLE']],
  catStart: [0, 0],
  optimalMoves: 0,
  parMoves: 2,
};

describe('game', () => {
  it('初期状態を作る', () => {
    const s = newGame(def);
    expect(s.cat).toEqual({ r: 0, c: 0 });
    expect(s.moves).toBe(0);
    expect(s.fishTotal).toBe(1);
    expect(s.fishTaken).toBe(0);
    expect(s.cleared).toBe(false);
  });

  it('歩行では手数が増えない', () => {
    const s = walk(newGame(def), 1);
    expect(s.cat).toEqual({ r: 0, c: 1 });
    expect(s.moves).toBe(0);
  });

  it('歩けない方向へは動かない', () => {
    const s = newGame(def);
    expect(walk(s, 3)).toBe(s);
  });

  it('魚のマスに入ると取得する', () => {
    expect(walk(newGame(def), 1).fishTaken).toBe(1);
  });

  it('魚は一度しか数えない', () => {
    let s = walk(newGame(def), 1);
    s = walk(s, 3);
    s = walk(s, 1);
    expect(s.fishTaken).toBe(1);
  });

  it('魚を取らずにゴールに乗ってもクリアにならない', () => {
    const d: LevelDef = { ...def, layout: [['FISH:E', 'EW', 'GOAL:W', 'HOLE']], catStart: [0, 2] };
    const s = newGame(d);
    expect(s.cat).toEqual({ r: 0, c: 2 });
    expect(s.fishTotal).toBe(1);
    expect(s.cleared).toBe(false);
  });

  it('魚を全部取ってゴールに乗るとクリア', () => {
    let s = newGame(def);
    s = walk(s, 1);
    s = walk(s, 1);
    expect(s.fishTaken).toBe(1);
    expect(s.cleared).toBe(true);
  });

  it('スライドで手数が増える', () => {
    expect(slide(newGame(def), { r: 0, c: 2 }).moves).toBe(1);
  });

  it('shortestPath は到達可能なら経路を返す', () => {
    expect(shortestPath(newGame(def), { r: 0, c: 2 })).toEqual([1, 1]);
    expect(shortestPath(newGame(def), { r: 0, c: 3 })).toBeNull();
    expect(shortestPath(newGame(def), { r: 0, c: 0 })).toEqual([]);
  });

  it('walkTo は経路上の魚も回収する', () => {
    const s = walkTo(newGame(def), { r: 0, c: 2 });
    expect(s.cat).toEqual({ r: 0, c: 2 });
    expect(s.fishTaken).toBe(1);
    expect(s.cleared).toBe(true);
  });

  it('Undo でスライド前の状態に戻る', () => {
    const sess = new GameSession(def);
    sess.walk(1);
    const before = sess.current;
    sess.slide({ r: 0, c: 2 });
    expect(sess.current.moves).toBe(1);
    sess.undo();
    expect(sess.current.moves).toBe(0);
    expect(sess.current.cat).toEqual(before.cat);
  });

  it('歩行だけでは Undo できない', () => {
    const sess = new GameSession(def);
    sess.walk(1);
    expect(sess.canUndo).toBe(false);
  });

  it('reset で初期状態に戻る', () => {
    const sess = new GameSession(def);
    sess.slide({ r: 0, c: 2 });
    sess.reset();
    expect(sess.current.moves).toBe(0);
    expect(sess.current.cat).toEqual({ r: 0, c: 0 });
    expect(sess.canUndo).toBe(false);
  });

  it('星は手数で決まる', () => {
    const d = { ...def, optimalMoves: 3, parMoves: 5 };
    expect(starsFor(d, 3)).toBe(3);
    expect(starsFor(d, 4)).toBe(2);
    expect(starsFor(d, 5)).toBe(2);
    expect(starsFor(d, 6)).toBe(1);
  });
});
