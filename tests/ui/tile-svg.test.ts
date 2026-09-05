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
  it('開いている方角の数だけ線分を描く', () => {
    expect((tileSvg(tile('NS')).match(/<line/g) ?? []).length).toBe(2);
    expect((tileSvg(tile('NESW')).match(/<line/g) ?? []).length).toBe(4);
    expect((tileSvg(tile('X')).match(/<line/g) ?? []).length).toBe(0);
  });

  it('行き止まりには先端の丸が付く', () => {
    expect(tileSvg(tile('N'))).toContain('tile-cap');
    expect(tileSvg(tile('NS'))).not.toContain('tile-cap');
  });

  it('道の無いタイルには中心の丸も出さない', () => {
    expect(tileSvg(tile('X'))).not.toContain('tile-road-hub');
    expect(tileSvg(tile('NS'))).toContain('tile-road-hub');
  });

  it('固定タイルには専用のクラスと鋲が付く', () => {
    const svg = tileSvg(tile('NS', 'road', true));
    expect(svg).toContain('tile-fixed');
    expect(svg).toContain('tile-stud');
    expect(tileSvg(tile('NS'))).not.toContain('tile-fixed');
  });

  it('ゴールには家のマークを描く', () => {
    expect(tileSvg(tile('NS', 'goal'))).toContain('tile-goal');
  });

  it('固定されたゴールも表現できる', () => {
    const svg = tileSvg(tile('NS', 'goal', true));
    expect(svg).toContain('tile-goal');
    expect(svg).toContain('tile-fixed');
  });

  it('魚があれば魚のマークを描く', () => {
    expect(tileSvg(tile('NS', 'road', false, true))).toContain('tile-fish');
    expect(tileSvg(tile('NS'))).not.toContain('tile-fish');
  });

  it('色を直書きしない（テーマは CSS で切り替える）', () => {
    const svg = tileSvg(tile('NESW', 'goal', true, true));
    expect(svg).not.toMatch(/fill="#|stroke="#|fill="rgb|style="/);
  });

  it('猫の SVG を返す', () => {
    expect(catSvg()).toContain('cat-body');
  });
});
