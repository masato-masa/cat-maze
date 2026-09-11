// タイルの地は単色、道はコードで描く SVG。
// 木目のテクスチャを敷いていた頃は、意味を持たない模様が盤面で一番目立ち、
// 肝心の道がその下に埋もれていた。描く要素を減らして道を主役に戻す。
//
// 家と魚だけは猫と同じ画風の 1 枚絵にしてある。道と違って形が 1 つしかなく、
// 「複数の形で太さ・縁取りを完全に一致させる」という道側の要件が無いので、
// 画像で表情を持たせたほうが盤面が楽しくなる。
import { ALL_DIRS, isOpen } from '../core/conn.ts';
import type { Dir } from '../core/conn.ts';
import type { Tile } from '../core/types.ts';

import fishUrl from '../assets/marks/fish.png';
import houseUrl from '../assets/marks/house.png';

/** タイルの内部座標系は 100x100。中心は (50,50)。 */
const EDGE: Record<Dir, [number, number]> = {
  0: [50, 0],
  1: [100, 50],
  2: [50, 100],
  3: [0, 50],
};

/** 道の太さ。縁取りの層のほうが太く、その上に細い塗りの層を重ねる。 */
const ROAD_OUTLINE_W = 40;
const ROAD_FILL_W = 32;
const HUB_OUTLINE_R = 20;
const HUB_FILL_R = 16;

function roadSvg(conn: number): string {
  const open = ALL_DIRS.filter((d) => isOpen(conn, d));
  if (open.length === 0) return '';

  const lines = open
    .map((d) => `<line x1="50" y1="50" x2="${EDGE[d][0]}" y2="${EDGE[d][1]}" />`)
    .join('');

  return (
    `<g class="tile-road-outline" stroke-width="${ROAD_OUTLINE_W}">` +
    `${lines}<circle cx="50" cy="50" r="${HUB_OUTLINE_R}" /></g>` +
    `<g class="tile-road-fill" stroke-width="${ROAD_FILL_W}">` +
    `${lines}<circle cx="50" cy="50" r="${HUB_FILL_R}" /></g>`
  );
}

/** ゴールの家。猫と同じ画風で描いた 1 枚絵。 */
function houseImg(): string {
  return `<img class="tile-mark tile-goal" src="${houseUrl}" alt="" draggable="false" />`;
}

function fishImg(): string {
  return `<img class="tile-mark tile-fish" src="${fishUrl}" alt="" draggable="false" />`;
}

/**
 * タイルの DOM を組む。初回だけ呼ぶ。
 *
 * 以前は毎手・全タイルで innerHTML を作り直していた。1 手ごとに全タイルの
 * 中身が捨てられて作り直されるので、盤が大きいほど操作がもたついた。
 * 実際にタイルの見た目が変わるのは「魚を取ったとき」と
 * 「conn の違うタイルが同じ id を引き継いだとき」だけなので、差分で足りる。
 */
export function createTileEl(tile: Tile): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tile';
  el.innerHTML = `<div class="tile-visual"></div>`;
  const visual = el.firstElementChild as HTMLElement;
  visual.insertAdjacentHTML('beforeend', fishImg());
  updateTileEl(el, tile, true);
  return el;
}

/** 魚が弾けて消えるまでの時間。CSS の fish-taken と合わせてある。 */
const FISH_POP_MS = 420;

/** 変わったものだけ触る。前回の値は data 属性に持たせておく。 */
export function updateTileEl(el: HTMLElement, tile: Tile, force = false): void {
  const visual = el.querySelector<HTMLElement>('.tile-visual')!;

  if (force || el.dataset['conn'] !== String(tile.conn)) {
    el.dataset['conn'] = String(tile.conn);
    el.querySelector('.tile-road-svg')?.remove();
    const road = roadSvg(tile.conn);
    if (road) {
      visual.insertAdjacentHTML(
        'afterbegin',
        `<svg class="tile-road-svg" viewBox="0 0 100 100" aria-hidden="true">${road}</svg>`,
      );
    }
  }

  const fish = visual.querySelector<HTMLElement>('.tile-fish')!;

  if (force || el.dataset['kind'] !== tile.kind) {
    el.dataset['kind'] = tile.kind;
    el.querySelector('.tile-goal')?.remove();
    // 魚は常に最前面に描きたいので、魚の手前（DOM 上は直前）に差し込む。
    if (tile.kind === 'goal') fish.insertAdjacentHTML('beforebegin', houseImg());
  }

  const had = el.dataset['fish'] === '1';
  el.dataset['fish'] = tile.fish ? '1' : '0';

  if (tile.fish) {
    fish.classList.remove('taken');
    fish.removeAttribute('hidden');
  } else if (had && !force) {
    // 取られた瞬間。無言で消えると何が起きたのか伝わらないので、
    // 一度弾けさせてから隠す。
    fish.classList.add('taken');
    window.setTimeout(() => {
      fish.classList.remove('taken');
      fish.setAttribute('hidden', '');
    }, FISH_POP_MS);
  } else {
    fish.classList.remove('taken');
    fish.setAttribute('hidden', '');
  }

  visual.classList.toggle('tile-fixed', tile.fixed);
}
