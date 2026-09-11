// タイルは画像を持たない。地は単色、道・家・魚はすべて SVG でコードから描く。
// 木目のテクスチャを敷いていた頃は、意味を持たない模様が盤面で一番目立ち、
// 肝心の道がその下に埋もれていた。描く要素を減らして道を主役に戻す。
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

/** ゴールの家。道と同じ縁取り色で輪郭を描くので、盤面に溶ける。 */
function houseSvg(): string {
  return (
    '<svg class="tile-mark tile-goal" viewBox="0 0 100 100" aria-hidden="true">' +
    '<path class="tile-house-roof" d="M50 8 L92 44 L8 44 Z" />' +
    '<path class="tile-house-body" d="M18 44 H82 V92 H18 Z" />' +
    '<path class="tile-house-door" d="M40 62 H60 V92 H40 Z" />' +
    '</svg>'
  );
}

function fishSvg(): string {
  return (
    '<svg class="tile-mark tile-fish" viewBox="0 0 100 100" aria-hidden="true">' +
    '<ellipse class="tile-fish-body" cx="44" cy="50" rx="32" ry="20" />' +
    '<path class="tile-fish-tail" d="M70 50 L96 28 L96 72 Z" />' +
    '<circle class="tile-fish-eye" cx="26" cy="44" r="4" />' +
    '</svg>'
  );
}

export function tileSvg(tile: Tile): string {
  const wrapClass = ['tile-visual', tile.fixed ? 'tile-fixed' : ''].filter(Boolean).join(' ');
  const parts: string[] = [];

  const road = roadSvg(tile.conn);
  if (road) {
    parts.push(`<svg class="tile-road-svg" viewBox="0 0 100 100" aria-hidden="true">${road}</svg>`);
  }
  if (tile.kind === 'goal') parts.push(houseSvg());
  if (tile.fish) parts.push(fishSvg());

  return `<div class="${wrapClass}">${parts.join('')}</div>`;
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
  visual.insertAdjacentHTML('beforeend', fishSvg());
  updateTileEl(el, tile, true);
  return el;
}

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

  const fish = visual.querySelector<SVGElement>('.tile-fish')!;

  if (force || el.dataset['kind'] !== tile.kind) {
    el.dataset['kind'] = tile.kind;
    el.querySelector('.tile-goal')?.remove();
    // 魚は常に最前面に描きたいので、魚の手前（DOM 上は直前）に差し込む。
    if (tile.kind === 'goal') fish.insertAdjacentHTML('beforebegin', houseSvg());
  }

  if (tile.fish) fish.removeAttribute('hidden');
  else fish.setAttribute('hidden', '');

  visual.classList.toggle('tile-fixed', tile.fixed);
}
