// 盤面の絵はすべて ChatGPT で生成したイラスト素材（src/assets/img）を貼り合わせて作る。
// タイルの開いている方角（1〜4 方向）に応じて、通路パーツを 1 枚選び回転させるだけで
// 組合せ爆発（16通り）を避けている。回転は CSS クラスで行い、色は一切直書きしない。
import { ALL_DIRS, isOpen, opposite } from '../core/conn.ts';
import type { Dir } from '../core/conn.ts';
import type { Tile } from '../core/types.ts';

import catUrl from '../assets/img/cat.png';
import fishUrl from '../assets/img/fish.png';
import houseUrl from '../assets/img/house.png';
import roadCornerUrl from '../assets/img/road_corner.png';
import roadCrossUrl from '../assets/img/road_cross.png';
import roadEndUrl from '../assets/img/road_end.png';
import roadStraightUrl from '../assets/img/road_straight.png';
import roadTUrl from '../assets/img/road_t.png';
import tileFixedUrl from '../assets/img/tile_fixed.png';
import tileUrl from '../assets/img/tile.png';

type Rotation = 0 | 90 | 180 | 270;
type PieceKind = 'end' | 'straight' | 'corner' | 't' | 'cross';
type RoadPiece = { src: string; rot: Rotation; kind: PieceKind };

/**
 * 開いている方角の組合せから、通路パーツ画像 1 枚と回転角を決める。
 * 各素材は「上方向が開いている」基準（road_corner・road_t は「上+右」基準）で
 * 描かれているので、実際の方角に合わせて 90 度単位で回す。
 * 画像素材そのものは中心ぴったりで縁に届いているとは限らないので、
 * 種類ごとの拡大率・クリップは CSS 側（.tile-road-img.piece-*）で補正する。
 */
function roadPiece(conn: number): RoadPiece | null {
  const open = ALL_DIRS.filter((d) => isOpen(conn, d));
  if (open.length === 0) return null;

  if (open.length === 1) {
    const d = open[0]!;
    return { src: roadEndUrl, rot: ((d * 90) % 360) as Rotation, kind: 'end' };
  }

  if (open.length === 2) {
    const [a, b] = open as [Dir, Dir];
    if (opposite(a) === b) {
      // 直線: N-S 基準なので E-W なら 90 度回す
      return { src: roadStraightUrl, rot: a === 0 || a === 2 ? 0 : 90, kind: 'straight' };
    }
    // カーブ: 隣り合う 2 方向。「小さい方の方角→時計回り隣」を基準(0度)とする
    const d = b === ((a + 1) % 4) ? a : b;
    return { src: roadCornerUrl, rot: ((d * 90) % 360) as Rotation, kind: 'corner' };
  }

  if (open.length === 3) {
    const missing = ALL_DIRS.find((d) => !isOpen(conn, d))!;
    // T字: 「左(W)が塞がっている」基準なので、塞がっている方角を W に合わせて回す
    return { src: roadTUrl, rot: (((missing + 1) % 4) * 90) as Rotation, kind: 't' };
  }

  return { src: roadCrossUrl, rot: 0, kind: 'cross' };
}

/**
 * 1 タイル分の見た目。背景・通路・ゴール・魚をすべて画像レイヤーとして重ねる。
 * 到達可能／移動可能／ヒントの強調表示は CSS 側（.tile.reachable 等）が担当する。
 */
export function tileSvg(tile: Tile): string {
  const bgUrl = tile.fixed ? tileFixedUrl : tileUrl;
  const wrapClass = ['tile-visual', tile.fixed ? 'tile-fixed' : ''].filter(Boolean).join(' ');

  const parts: string[] = [`<img class="tile-bg-img" src="${bgUrl}" alt="" />`];

  const road = roadPiece(tile.conn);
  if (road) {
    const cls = ['tile-road-img', `piece-${road.kind}`, road.rot !== 0 ? `rot-${road.rot}` : '']
      .filter(Boolean)
      .join(' ');
    parts.push(`<img class="${cls}" src="${road.src}" alt="" />`);
  }

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
