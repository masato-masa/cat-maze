import { describe, it, expect } from 'vitest';
import { renderBoard, renderTargets } from '../../src/cli/render.ts';
import { newGame } from '../../src/core/game.ts';
import type { LevelDef } from '../../src/core/types.ts';

const def: LevelDef = {
  id: 'R1',
  name: 'render',
  width: 3,
  height: 1,
  layout: [['E', 'GOAL:EW', 'HOLE']],
  catStart: [0, 0],
  optimalMoves: 0,
  parMoves: 0,
};

describe('renderBoard', () => {
  it('猫・ゴール・穴が文字として現れる', () => {
    const out = renderBoard(newGame(def));
    expect(out).toContain('C');
    expect(out).toContain('G');
    expect(out).toContain('.');
  });

  it('行数は盤面の高さと一致する', () => {
    expect(renderBoard(newGame(def)).trimEnd().split('\n')).toHaveLength(1);
  });

  it('固定タイルは # で描く', () => {
    const d: LevelDef = { ...def, width: 4, layout: [['E', 'FIXED:EW', 'GOAL:W', 'HOLE']] };
    expect(renderBoard(newGame(d))).toContain('#');
  });

  it('固定されたゴールはゴールとして描く', () => {
    const d: LevelDef = { ...def, layout: [['E', 'FIXED:GOAL:EW', 'HOLE']] };
    expect(renderBoard(newGame(d))).toContain('G');
    expect(renderBoard(newGame(d))).not.toContain('#');
  });

  it('道は罫線文字で描く', () => {
    const d: LevelDef = { ...def, width: 4, layout: [['E', 'EW', 'GOAL:W', 'HOLE']] };
    expect(renderBoard(newGame(d))).toContain('─');
  });

  it('renderTargets は押せるタイルを番号付きで返す', () => {
    const { list, targets } = renderTargets(newGame(def));
    expect(targets.length).toBeGreaterThan(0);
    expect(list).toContain('1:');
  });
});
