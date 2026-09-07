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
  it('道の無いタイルには通路画像を出さない', () => {
    expect(tileSvg(tile('X'))).not.toContain('tile-road-img');
  });

  it('開いている方角の数に応じた専用の通路パーツを選ぶ', () => {
    expect(tileSvg(tile('N'))).toContain('piece-end');
    expect(tileSvg(tile('NS'))).toContain('road_straight');
    expect(tileSvg(tile('NE'))).toContain('road_corner');
    expect(tileSvg(tile('NES'))).toContain('road_t');
    expect(tileSvg(tile('NESW'))).toContain('road_cross');
  });

  it('行き止まりだけ専用クラスが付く', () => {
    expect(tileSvg(tile('N'))).toContain('piece-end');
    expect(tileSvg(tile('NS'))).not.toContain('piece-end');
  });

  it('固定タイルには専用のクラスと画像が付く', () => {
    const svg = tileSvg(tile('NS', 'road', true));
    expect(svg).toContain('tile-fixed');
    expect(svg).toContain('tile_fixed');
    expect(tileSvg(tile('NS'))).not.toContain('tile-fixed');
  });

  it('ゴールには家の画像を描く', () => {
    expect(tileSvg(tile('NS', 'goal'))).toContain('tile-goal');
  });

  it('固定されたゴールも表現できる', () => {
    const svg = tileSvg(tile('NS', 'goal', true));
    expect(svg).toContain('tile-goal');
    expect(svg).toContain('tile-fixed');
  });

  it('魚があれば魚の画像を描く', () => {
    expect(tileSvg(tile('NS', 'road', false, true))).toContain('tile-fish');
    expect(tileSvg(tile('NS'))).not.toContain('tile-fish');
  });

  it('色を直書きしない（テーマは CSS で切り替える）', () => {
    const svg = tileSvg(tile('NESW', 'goal', true, true));
    expect(svg).not.toMatch(/fill="#|stroke="#|fill="rgb|style="/);
  });

  it('猫の画像を返す', () => {
    expect(catSvg()).toContain('cat-img');
    expect(catSvg()).toContain('cat.png');
  });
});
