import { describe, it, expect } from 'vitest';
import { catSvg, tileSvg } from '../../src/ui/tile-svg.ts';
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

  it('猫の画像を返す', () => {
    expect(catSvg()).toContain('cat-img');
    expect(catSvg()).toContain('cat.png');
  });
});
