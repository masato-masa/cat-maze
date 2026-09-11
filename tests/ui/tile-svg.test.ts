// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createTileEl, updateTileEl, tileSvg } from '../../src/ui/tile-svg.ts';
import { parseConn } from '../../src/core/conn.ts';
import type { Tile } from '../../src/core/types.ts';

const tile = (spec: string, kind: Tile['kind'] = 'road', fixed = false, fish = false): Tile => ({
  id: 0,
  conn: parseConn(spec),
  kind,
  fixed,
  fish,
});

describe('tileSvg', () => {
  it('画像をいっさい使わない', () => {
    const svg = tileSvg(tile('NESW', 'goal', true, true));
    expect(svg).not.toContain('<img');
    expect(svg).not.toContain('.png');
  });

  it('道の無いタイルには通路 SVG を出さない', () => {
    expect(tileSvg(tile('X'))).not.toContain('tile-road-svg');
  });

  it('開いている方角の数だけ線を引く（太さ・縁取りは形によらず共通）', () => {
    expect((tileSvg(tile('N')).match(/<line/g) ?? []).length).toBe(2); // 縁取り + 塗りの2層
    expect((tileSvg(tile('NS')).match(/<line/g) ?? []).length).toBe(4);
    expect((tileSvg(tile('NESW')).match(/<line/g) ?? []).length).toBe(8);
  });

  it('道が無いタイルには中心の丸も出さない', () => {
    expect(tileSvg(tile('X'))).not.toContain('tile-road-outline');
    expect(tileSvg(tile('NS'))).toContain('tile-road-outline');
  });

  it('道は形によらず同じ太さで描く', () => {
    const svg = tileSvg(tile('NESW'));
    expect((svg.match(/stroke-width="40"/g) ?? []).length).toBe(1);
    expect((svg.match(/stroke-width="32"/g) ?? []).length).toBe(1);
  });

  it('固定タイルには専用のクラスが付く（画像は使わない）', () => {
    const svg = tileSvg(tile('NS', 'road', true));
    expect(svg).toContain('tile-fixed');
    expect(svg).not.toContain('tile_fixed');
    expect(tileSvg(tile('NS'))).not.toContain('tile-fixed');
  });

  it('ゴールには家を SVG で描く', () => {
    const svg = tileSvg(tile('NS', 'goal'));
    expect(svg).toContain('tile-goal');
    expect(svg).toContain('tile-house-roof');
  });

  it('固定されたゴールも表現できる', () => {
    const svg = tileSvg(tile('NS', 'goal', true));
    expect(svg).toContain('tile-goal');
    expect(svg).toContain('tile-fixed');
  });

  it('魚があれば魚を SVG で描く', () => {
    const svg = tileSvg(tile('NS', 'road', false, true));
    expect(svg).toContain('tile-fish');
    expect(svg).toContain('tile-fish-body');
    expect(tileSvg(tile('NS'))).not.toContain('tile-fish');
  });

  it('色を直書きしない（テーマは CSS で切り替える）', () => {
    const svg = tileSvg(tile('NESW', 'goal', true, true));
    expect(svg).not.toMatch(/fill="#|stroke="#|fill="rgb|style="/);
  });

  it('明滅する光の膜を持たない', () => {
    expect(tileSvg(tile('NESW'))).not.toContain('tile-reach-glow');
  });
});

describe('タイルの差分更新', () => {
  it('同じ内容で呼んでも道の SVG 要素を作り直さない', () => {
    const t = tile('NE');
    const el = createTileEl(t);
    const before = el.querySelector('.tile-road-svg');
    updateTileEl(el, t);
    expect(el.querySelector('.tile-road-svg')).toBe(before);
  });

  it('conn が変わったときだけ道を描き直す', () => {
    const el = createTileEl(tile('NE'));
    const before = el.querySelector('.tile-road-svg');
    updateTileEl(el, tile('NESW'));
    const after = el.querySelector('.tile-road-svg');
    expect(after).not.toBe(before);
    expect((after!.innerHTML.match(/<line/g) ?? []).length).toBe(8);
  });

  it('魚の付け外しは hidden の切り替えだけで行う', () => {
    const el = createTileEl(tile('NS', 'road', false, true));
    const fish = el.querySelector<SVGElement>('.tile-fish')!;
    updateTileEl(el, tile('NS', 'road', false, false));
    expect(el.querySelector('.tile-fish')).toBe(fish); // 要素は残る
    expect(fish.hasAttribute('hidden')).toBe(true);
    updateTileEl(el, tile('NS', 'road', false, true));
    expect(fish.hasAttribute('hidden')).toBe(false);
  });

  it('魚を持たないタイルにも魚の器だけは用意しておく', () => {
    const el = createTileEl(tile('NS'));
    expect(el.querySelector('.tile-fish')).not.toBeNull();
    expect(el.querySelector<SVGElement>('.tile-fish')!.hasAttribute('hidden')).toBe(true);
  });

  it('固定かどうかはクラスの付け外しで表す', () => {
    const el = createTileEl(tile('NS'));
    const visual = el.querySelector('.tile-visual')!;
    updateTileEl(el, tile('NS', 'road', true));
    expect(visual.classList.contains('tile-fixed')).toBe(true);
  });
});
