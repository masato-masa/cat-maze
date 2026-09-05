// タイル中心から開いている辺へ線を引き、行き止まりの先端に印を置く描き方は
// Simon Tatham's Portable Puzzle Collection の net.c (MIT) に倣っている。
// https://github.com/ghewgill/puzzles
import { ALL_DIRS, isOpen } from '../core/conn.ts';
import type { Dir } from '../core/conn.ts';
import type { Tile } from '../core/types.ts';

/** タイルの内部座標系は 100x100。中心は (50,50)。 */
const EDGE: Record<Dir, [number, number]> = {
  0: [50, 0],
  1: [100, 50],
  2: [50, 100],
  3: [0, 50],
};

function countOpen(conn: number): number {
  let n = 0;
  for (const d of ALL_DIRS) if (isOpen(conn, d)) n++;
  return n;
}

/** ねこの家（ゴール）。 */
function goalMark(): string {
  return (
    '<g class="tile-goal">' +
    '<path d="M50 26 L78 48 L78 76 L22 76 L22 48 Z" />' +
    '<path class="tile-goal-door" d="M42 76 L42 58 A8 8 0 0 1 58 58 L58 76 Z" />' +
    '</g>'
  );
}

/** さかな。 */
function fishMark(): string {
  return (
    '<g class="tile-fish">' +
    '<path d="M36 50 C44 38, 62 38, 70 50 C62 62, 44 62, 36 50 Z" />' +
    '<path d="M70 50 L82 41 L82 59 Z" />' +
    '<circle cx="46" cy="47" r="2.6" class="tile-fish-eye" />' +
    '</g>'
  );
}

/**
 * 1 タイル分の SVG。色はすべて CSS 変数を通すので、テーマは CSS 側で切り替えられる。
 */
export function tileSvg(tile: Tile): string {
  const parts: string[] = [];

  const bgClass = ['tile-bg', tile.fixed ? 'tile-fixed' : ''].filter(Boolean).join(' ');
  parts.push(`<rect class="${bgClass}" x="2" y="2" width="96" height="96" rx="12" />`);

  if (tile.fixed) {
    // 動かないことが一目で分かるよう、四隅に鋲を打つ
    for (const [x, y] of [
      [14, 14],
      [86, 14],
      [14, 86],
      [86, 86],
    ]) {
      parts.push(`<circle class="tile-stud" cx="${x}" cy="${y}" r="3.5" />`);
    }
  }

  const open = countOpen(tile.conn);
  for (const d of ALL_DIRS) {
    if (!isOpen(tile.conn, d)) continue;
    const [x, y] = EDGE[d];
    parts.push(`<line class="tile-road" x1="50" y1="50" x2="${x}" y2="${y}" />`);
  }
  if (open > 0) parts.push('<circle class="tile-road-hub" cx="50" cy="50" r="11" />');
  if (open === 1) {
    // 行き止まりは先端を丸くして「ここで終わり」を示す
    for (const d of ALL_DIRS) {
      if (!isOpen(tile.conn, d)) continue;
      const [x, y] = EDGE[d];
      parts.push(`<circle class="tile-cap" cx="${(50 + x) / 2}" cy="${(50 + y) / 2}" r="9" />`);
    }
  }

  if (tile.kind === 'goal') parts.push(goalMark());
  if (tile.fish) parts.push(fishMark());

  return `<svg class="tile-svg" viewBox="0 0 100 100" aria-hidden="true">${parts.join('')}</svg>`;
}

/** ねこ。盤面とは別のレイヤに置く。 */
export function catSvg(): string {
  return (
    '<svg class="cat-svg" viewBox="0 0 100 100" aria-hidden="true">' +
    '<g class="cat-body">' +
    '<path d="M28 34 L30 16 L46 27 Z" />' +
    '<path d="M72 34 L70 16 L54 27 Z" />' +
    '<circle cx="50" cy="52" r="26" />' +
    '</g>' +
    '<circle class="cat-eye" cx="41" cy="48" r="3.6" />' +
    '<circle class="cat-eye" cx="59" cy="48" r="3.6" />' +
    '<path class="cat-nose" d="M46 59 L54 59 L50 64 Z" />' +
    '<g class="cat-whisker">' +
    '<line x1="24" y1="56" x2="38" y2="58" />' +
    '<line x1="24" y1="64" x2="38" y2="62" />' +
    '<line x1="76" y1="56" x2="62" y2="58" />' +
    '<line x1="76" y1="64" x2="62" y2="62" />' +
    '</g>' +
    '</svg>'
  );
}
