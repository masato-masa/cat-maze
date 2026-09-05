import type { Conn } from './conn.ts';

export type Pos = { r: number; c: number };

/** タイルの役割。動かせるかどうかは kind ではなく fixed で表す。 */
export type TileKind = 'road' | 'goal';

export type Tile = {
  /** 不変の識別子。UI がアニメーションでタイルを追跡するために使う。 */
  id: number;
  conn: Conn;
  kind: TileKind;
  /** true ならスライドできない。ゴールタイルを固定することもできる。 */
  fixed: boolean;
  fish: boolean;
};

export type Board = {
  width: number;
  height: number;
  /** 行優先の一次元配列。null は穴。穴の位置はここからのみ導出する。 */
  cells: (Tile | null)[];
};

export type LevelDef = {
  id: string;
  name: string;
  width: number;
  height: number;
  /**
   * 各要素は接続を表す方角文字列。"X"=空き地、"HOLE"=穴。
   * "FIXED:" / "GOAL:" / "FISH:" は前置修飾子で、重ねて書ける。
   * 例: "FIXED:GOAL:NW" は動かないゴール、"FISH:EW" は魚の乗った直線路。
   */
  layout: string[][];
  catStart: [number, number];
  optimalMoves: number;
  parMoves: number;
  hint?: string;
};

export type GameState = {
  board: Board;
  cat: Pos;
  /** スライドの実行回数。歩行では増えない。 */
  moves: number;
  fishTaken: number;
  fishTotal: number;
  cleared: boolean;
};
