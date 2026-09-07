// 盤面の絵はすべて ChatGPT で生成したイラスト素材（src/assets/img）を貼り合わせて作る。
// 通路は「行き止まり」用のキャップ付き素材(road_end)と、直線素材(road_straight)の
// 半分（中心から端まで）だけを、開いている方角の数だけ重ねて表現する。
// カーブ・T字・十字を別素材にすると道幅が微妙にズレるので、
// 太さの基準にしたい直線素材を使い回すことで幅を完全に一致させている。
import { ALL_DIRS, isOpen } from '../core/conn.ts';
import type { Tile } from '../core/types.ts';

import catUrl from '../assets/img/cat.png';
import fishUrl from '../assets/img/fish.png';
import houseUrl from '../assets/img/house.png';
import roadEndUrl from '../assets/img/road_end.png';
import roadStraightUrl from '../assets/img/road_straight.png';
import tileFixedUrl from '../assets/img/tile_fixed.png';
import tileUrl from '../assets/img/tile.png';

type Rotation = 0 | 90 | 180 | 270;
type RoadLayer = { src: string; rot: Rotation; half: boolean };

/**
 * 開いている方角ごとに 1 枚ずつレイヤーを重ねて通路を組み立てる。
 * ・1 方向だけ開いている（行き止まり）: 丸いキャップ付きの road_end を使う。
 * ・2 方向以上: road_straight を中心から半分だけ見せる形（CSS で下半分をクリップ）
 *   にして、開いている方角の数だけ重ねる。直線・カーブ・T字・十字のどれでも
 *   同じ素材の使い回しになるので、道幅が完全に揃う。
 * 各素材は「上(N)方向」基準で描かれているので、実際の方角に合わせて 90 度単位で回す。
 */
function roadLayers(conn: number): RoadLayer[] {
  const open = ALL_DIRS.filter((d) => isOpen(conn, d));
  if (open.length === 0) return [];

  if (open.length === 1) {
    const d = open[0]!;
    return [{ src: roadEndUrl, rot: ((d * 90) % 360) as Rotation, half: false }];
  }

  return open.map((d) => ({ src: roadStraightUrl, rot: ((d * 90) % 360) as Rotation, half: true }));
}

/**
 * 1 タイル分の見た目。背景・通路・ゴール・魚をすべて画像レイヤーとして重ねる。
 * 到達可能／移動可能／ヒントの強調表示は CSS 側（.tile.reachable 等）が担当する。
 */
export function tileSvg(tile: Tile): string {
  const bgUrl = tile.fixed ? tileFixedUrl : tileUrl;
  const wrapClass = ['tile-visual', tile.fixed ? 'tile-fixed' : ''].filter(Boolean).join(' ');

  const parts: string[] = [`<img class="tile-bg-img" src="${bgUrl}" alt="" />`];

  for (const layer of roadLayers(tile.conn)) {
    const cls = [
      'tile-road-img',
      layer.half ? 'road-half' : 'road-end',
      layer.rot !== 0 ? `rot-${layer.rot}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    parts.push(`<img class="${cls}" src="${layer.src}" alt="" />`);
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
