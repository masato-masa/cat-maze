import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// レビュー指摘（実機で発覚）: --step は .grid-cell/.tile/.cat の
// transform: translate() の中で使われる。translate() 内のパーセンテージは
// 要素自身のボックス基準で解決されるため、--avail-w/--avail-h の計算式に
// 生の `%` が混ざると宣言ごと無効になり、タイル・猫が全部 (0,0) へ潰れる
// （欠陥だった `--avail-h: calc(100% - 32px)` がまさにこれ）。
// jsdom にはレイアウトが無くこの種の破綻を検出できないので、CSS の
// テキストを読んで式の形そのものを検査する。
describe('board.css の --step 計算式', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../../src/styles/board.css', import.meta.url)),
    'utf-8',
  );

  /** `.board { ... }` ブロックの中身だけを取り出す。 */
  function boardBlock(): string {
    const start = css.indexOf('.board {');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = css.indexOf('}', start);
    return css.slice(start, end);
  }

  /** `--name: 値;` の値部分だけを取り出す。 */
  function declValue(block: string, name: string): string {
    const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
    expect(m).not.toBeNull();
    return m![1]!.trim();
  }

  it('--avail-w / --avail-h の値に生のパーセンテージを含まない', () => {
    const block = boardBlock();
    const availW = declValue(block, '--avail-w');
    const availH = declValue(block, '--avail-h');
    expect(availW).not.toContain('%');
    expect(availH).not.toContain('%');
  });

  it('--step の外寸(width/height)は padding 込みで計算する', () => {
    const block = boardBlock();
    // box-sizing: border-box の下では width/height が外寸そのものになるので、
    // 中身の calc(--step * --cols/--rows) に padding 分（16px × 2 = 32px）を
    // 足しておかないと、内側の絶対配置レイヤー（inset: 16px）がはみ出す。
    expect(declValue(block, 'width')).toContain('+ 32px');
    expect(declValue(block, 'height')).toContain('+ 32px');
  });
});
