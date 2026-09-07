// タイルの背景・ねこ・ゴールの家・さかなは ChatGPT で生成したイラスト素材
// （src/assets/img）を使う。通路だけは、形（直線／カーブ／T字／十字）ごとに
// 個別の画像を生成すると太さや縁取りがどうしても微妙にズレてしまうため、
// コードで統一的に描く。中心から開いている方角へ線を引き、中心にハブの円を
// 置くだけなので、どんな組合せでも太さ・縁取りが 1px も違わず完全に一致する。
import { ALL_DIRS, isOpen } from '../core/conn.ts';
import type { Dir } from '../core/conn.ts';
import type { Tile } from '../core/types.ts';

import catUrl from '../assets/img/cat.png';
import fishUrl from '../assets/img/fish.png';
import houseUrl from '../assets/img/house.png';
import tileFixedUrl from '../assets/img/tile_fixed.png';
import tileUrl from '../assets/img/tile.png';

/** タイルの内部座標系は 100x100。中心は (50,50)。 */
const EDGE: Record<Dir, [number, number]> = {
  0: [50, 0],
  1: [100, 50],
  2: [50, 100],
  3: [0, 50],
};

/**
 * 通路を SVG で描く。太い縁取り色のレイヤーを先に描き、その上に一回り細い
 * 道の色のレイヤーを重ねることで「縁取り付きの道」に見せる。中心にハブの円を
 * 置くことで、何本の道が集まっても継ぎ目が出ない。
 */
function roadSvg(conn: number): string {
  const open = ALL_DIRS.filter((d) => isOpen(conn, d));
  if (open.length === 0) return '';

  const lines = open.map((d) => `<line x1="50" y1="50" x2="${EDGE[d][0]}" y2="${EDGE[d][1]}" />`).join('');

  return (
    `<g class="tile-road-outline">${lines}<circle cx="50" cy="50" r="15" /></g>` +
    `<g class="tile-road-fill">${lines}<circle cx="50" cy="50" r="12" /></g>`
  );
}

/**
 * 「ねこが歩いて行ける」ことを示すキラキラ。道の真ん中に大小2つの星を置く。
 * 表示・非表示と明滅アニメーションは CSS 側（.tile.reachable .tile-spark）が担当する。
 */
const SPARK_SVG =
  '<svg class="tile-spark" viewBox="0 0 100 100" aria-hidden="true">' +
  '<path class="spark-big" ' +
  'd="M50 12 C54 38 62 46 88 50 C62 54 54 62 50 88 C46 62 38 54 12 50 C38 46 46 38 50 12 Z" />' +
  '<path class="spark-small" ' +
  'd="M74 16 C75.5 22 80 26.5 86 28 C80 29.5 75.5 34 74 40 C72.5 34 68 29.5 62 28 C68 26.5 72.5 22 74 16 Z" />' +
  '</svg>';

/**
 * 1 タイル分の見た目。木目タイルの画像の上に、道を SVG で重ね、
 * さらにゴールの家／さかなの画像・キラキラを重ねる。
 * 到達可能／移動可能／ヒントの強調表示は CSS 側（.tile.reachable 等）が担当する。
 */
export function tileSvg(tile: Tile): string {
  const bgUrl = tile.fixed ? tileFixedUrl : tileUrl;
  const wrapClass = ['tile-visual', tile.fixed ? 'tile-fixed' : ''].filter(Boolean).join(' ');

  const parts: string[] = [`<img class="tile-bg-img" src="${bgUrl}" alt="" />`];

  const road = roadSvg(tile.conn);
  if (road) {
    parts.push(`<svg class="tile-road-svg" viewBox="0 0 100 100" aria-hidden="true">${road}</svg>`);
  }

  parts.push(SPARK_SVG);

  if (tile.kind === 'goal') {
    parts.push(`<img class="tile-mark tile-goal" src="${houseUrl}" alt="" />`);
  }
  if (tile.fish) {
    parts.push(`<img class="tile-mark tile-fish" src="${fishUrl}" alt="" />`);
  }

  return `<div class="${wrapClass}">${parts.join('')}</div>`;
}

/** ねこ。盤面とは別のレイヤに置く。 */
export function catSvg(): string {
  return `<img class="cat-img" src="${catUrl}" alt="ねこ" />`;
}
