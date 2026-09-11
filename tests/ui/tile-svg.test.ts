// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createTileEl, updateTileEl } from '../../src/ui/tile-svg.ts';
import { parseConn } from '../../src/core/conn.ts';
import type { Tile } from '../../src/core/types.ts';

const tile = (spec: string, kind: Tile['kind'] = 'road', fixed = false, fish = false): Tile => ({
  id: 0,
  conn: parseConn(spec),
  kind,
  fixed,
  fish,
});

// レビュー指摘: これらのテストは元々 tileSvg() という関数を検証していたが、
// src/ の中で tileSvg() を呼ぶ箇所は無く（本番経路は createTileEl /
// updateTileEl だけを使う）、テストの中にしか生き残っていなかった。
// マークアップの作り方も createTileEl とは違っていた（魚の器を「あるとき
// だけ」出す、家を魚より後ろに置く、など）ため、本番経路を壊しても緑のまま
// 通ってしまう欠陥があった。tileSvg() 自体は削除し、ここでは
// createTileEl(tile).outerHTML を対象に、同じ意図（何を描き、何を描かない
// か）を検証する。
describe('createTileEl が描く見た目', () => {
  const html = (t: Tile): string => createTileEl(t).outerHTML;

  it('タイルの地と道には画像を使わない', () => {
    // 木目テクスチャが道を埋もれさせていた頃の反省。地と道はコードで描く。
    // 家と魚だけは猫と同じ画風の 1 枚絵を使う（形が 1 つしかないので、
    // 道のような「複数の形で太さを完全一致させる」要件が無い）。
    const el = createTileEl(tile('NESW', 'goal', true, true));
    const imgs = [...el.querySelectorAll('img')].map((i) => i.className);
    expect(imgs.sort()).toEqual(['tile-mark tile-fish', 'tile-mark tile-goal']);

    // 道の SVG そのものに画像は無い
    expect(el.querySelector('.tile-road-svg')!.outerHTML).not.toContain('image');
  });

  it('道の無いタイルには通路 SVG を出さない', () => {
    expect(html(tile('X'))).not.toContain('tile-road-svg');
  });

  it('開いている方角の数だけ線を引く（太さ・縁取りは形によらず共通）', () => {
    expect((html(tile('N')).match(/<line/g) ?? []).length).toBe(2); // 縁取り + 塗りの2層
    expect((html(tile('NS')).match(/<line/g) ?? []).length).toBe(4);
    expect((html(tile('NESW')).match(/<line/g) ?? []).length).toBe(8);
  });

  it('道が無いタイルには中心の丸も出さない', () => {
    expect(html(tile('X'))).not.toContain('tile-road-outline');
    expect(html(tile('NS'))).toContain('tile-road-outline');
  });

  it('道は形によらず同じ太さで描く', () => {
    const out = html(tile('NESW'));
    expect((out.match(/stroke-width="40"/g) ?? []).length).toBe(1);
    expect((out.match(/stroke-width="32"/g) ?? []).length).toBe(1);
  });

  it('固定タイルには専用のクラスが付く（画像は使わない）', () => {
    // createTileEl は tile-fixed を wrapper のクラス文字列に焼き込むのではなく
    // .tile-visual への classList.toggle で付け外しする。
    const out = html(tile('NS', 'road', true));
    expect(out).toContain('tile-fixed');
    expect(out).not.toContain('tile_fixed');
    expect(html(tile('NS'))).not.toContain('tile-fixed');
  });

  it('ゴールには家の画像を描く', () => {
    const out = html(tile('NS', 'goal'));
    expect(out).toContain('tile-goal');
    expect(out).toContain('house');
  });

  it('固定されたゴールも表現できる', () => {
    const out = html(tile('NS', 'goal', true));
    expect(out).toContain('tile-goal');
    expect(out).toContain('tile-fixed');
  });

  it('魚があれば魚を見せ、無ければ隠す', () => {
    // createTileEl は魚の器を常に用意しておき、hidden 属性で切り替える
    // （tileSvg のように「あるときだけ」要素ごと出す方式ではない）。
    const withFish = createTileEl(tile('NS', 'road', false, true));
    const fish = withFish.querySelector<HTMLElement>('.tile-fish')!;
    expect(fish).not.toBeNull();
    expect(fish.hasAttribute('hidden')).toBe(false);
    expect(withFish.outerHTML).toContain('fish');

    const withoutFish = createTileEl(tile('NS'));
    expect(withoutFish.querySelector<HTMLElement>('.tile-fish')!.hasAttribute('hidden')).toBe(true);
  });

  it('道は色を直書きしない（テーマは CSS で切り替える）', () => {
    // 家と魚は画像なので対象外。コードで描く道だけを見る。
    const road = html(tile('NESW')).match(/<svg class="tile-road-svg".*?<\/svg>/s)![0];
    expect(road).not.toMatch(/fill="#|stroke="#|fill="rgb|style="/);
  });

  it('明滅する光の膜を持たない', () => {
    expect(html(tile('NESW'))).not.toContain('tile-reach-glow');
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

  it('魚の付け外しは要素を作り直さずに行う', () => {
    const el = createTileEl(tile('NS', 'road', false, true));
    const fish = el.querySelector<HTMLElement>('.tile-fish')!;
    updateTileEl(el, tile('NS', 'road', false, false));
    expect(el.querySelector('.tile-fish')).toBe(fish); // 要素は残る
    updateTileEl(el, tile('NS', 'road', false, true));
    expect(fish.hasAttribute('hidden')).toBe(false);
  });

  it('魚を取ると、消える前に弾ける演出が入る', () => {
    // 取った瞬間に無言で消えると、何が起きたのか伝わらない。
    const el = createTileEl(tile('NS', 'road', false, true));
    const fish = el.querySelector<HTMLElement>('.tile-fish')!;
    updateTileEl(el, tile('NS', 'road', false, false));
    expect(fish.classList.contains('taken')).toBe(true);
    expect(fish.hasAttribute('hidden')).toBe(false); // 演出中はまだ見えている
  });

  it('最初から魚が無いタイルでは弾けさせない', () => {
    const el = createTileEl(tile('NS'));
    const fish = el.querySelector<HTMLElement>('.tile-fish')!;
    expect(fish.classList.contains('taken')).toBe(false);
    expect(fish.hasAttribute('hidden')).toBe(true);
  });

  it('魚を持たないタイルにも魚の器だけは用意しておく', () => {
    const el = createTileEl(tile('NS'));
    expect(el.querySelector('.tile-fish')).not.toBeNull();
    expect(el.querySelector<HTMLElement>('.tile-fish')!.hasAttribute('hidden')).toBe(true);
  });

  it('固定かどうかはクラスの付け外しで表す', () => {
    const el = createTileEl(tile('NS'));
    const visual = el.querySelector('.tile-visual')!;
    updateTileEl(el, tile('NS', 'road', true));
    expect(visual.classList.contains('tile-fixed')).toBe(true);
  });
});
