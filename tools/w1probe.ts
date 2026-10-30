import { probe } from './probe.ts';

// W1-1 はじめの一歩: 押すと道が繋がる
probe('W1-1', [
  ['X', 'FIXED:X', 'X', 'X'],
  ['E', 'HOLE', 'EW', 'GOAL:W'],
  ['X', 'FIXED:X', 'X', 'X'],
  ['X', 'FIXED:X', 'X', 'X'],
], [1, 0]);

// W1-2 のりもの: 歩けない。猫ごと運ぶしかない
probe('W1-2', [
  ['X', 'FIXED:X', 'X', 'X'],
  ['E', 'HOLE', 'FIXED:GOAL:W', 'X'],
  ['X', 'FIXED:X', 'X', 'X'],
  ['X', 'FIXED:X', 'X', 'X'],
], [1, 0]);

// W1-3 候補A: 運搬してから接続
probe('W1-3a', [
  ['X', 'FIXED:X', 'X', 'X'],
  ['E', 'HOLE', 'ES', 'X'],
  ['X', 'FIXED:X', 'NE', 'FIXED:GOAL:W'],
  ['X', 'FIXED:X', 'X', 'X'],
], [1, 0]);

// W1-3 候補B: 縦に運ぶ
probe('W1-3b', [
  ['FIXED:X', 'S', 'X', 'X'],
  ['E', 'HOLE', 'X', 'X'],
  ['FIXED:X', 'NE', 'EW', 'FIXED:GOAL:W'],
  ['FIXED:X', 'FIXED:X', 'X', 'X'],
], [1, 0]);
