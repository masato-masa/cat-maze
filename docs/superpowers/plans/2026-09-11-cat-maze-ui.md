# ねこめいろ プレイ画面 UI 刷新 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プレイ画面から画像素材を外してコードで描き直し、猫に反応を持たせ、操作の遅延を取り除く。

**Architecture:** 盤面の描画（`tile-svg.ts`）を画像参照から単色 + SVG に置き換える。猫を `CatSprite` クラスに切り出して表情とまばたきを持たせる。入力を Pointer Events に一本化し、タイルの DOM を毎手作り直すのをやめる。効果音は WebAudio で合成し、ファイルを持たない。

**Tech Stack:** Vite 8 / TypeScript 7 / vanilla TS（フレームワークなし）/ vitest 5 + jsdom / Web Animations API / WebAudio

**Spec:** `docs/superpowers/specs/2026-09-11-cat-maze-ui-design.md`

## Global Constraints

- 応答もコード内のコメントも文言も**日本語**
- 色は**必ず CSS トークン経由**。SVG に `fill="#..."` を直書きしない（既存テスト
  「色を直書きしない」が守っている規約）
- 数値は**にゃんどく（`C:\claude\test`）の `src/ui/styles.css` からの実測値**を使う。
  目分量で似せた数字を入れない
- `roadSvg()` の描画方式（中心から `<line>`＋中心に `<circle>`、縁取り層＋塗り層の
  2 層）は**変えない**。線幅と色だけ変える
- ホーム画面・ステージ選択画面・`core/` ・ `levels/` ・ `solver/` ・ `cli/` は**触らない**
- `prefers-reduced-motion: reduce` で動きを止める（`base.css` の既存の仕組みに任せる）
- Windows 環境。日本語を含むファイルの編集は **Write ツール**を使う。bash heredoc は使わない
- コミットメッセージは日本語。末尾に `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

### 実測値（にゃんどく `styles.css` より）

```
--ease: cubic-bezier(0.4, 0, 0.2, 1)
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--card-radius: 16px   --cell-radius: 8px   --gap: 6px   --pad: 16px
盤: width min(92vw, 452px) / background #fff / padding 16px / border-radius 16px
セル: transition background-color 0.18s var(--ease)
猫: width/height 88% / cat-breathe 3.6s ease-in-out infinite / scale(1) → scale(1.035)
丸ボタン: 60x60 / padding 10px / border-radius 999px / svg 40x40 / gap 24px
         :active:not(:disabled) { transform: scale(0.9) } / :disabled { opacity: 0.35 }
バナー: 背景 rgb(246 245 239 / .66) + blur(3px)
       カード radius 22px / padding 28px 34px 30px / shadow 0 18px 50px rgb(115 80 86 / .16)
       カード上部の猫 84px
```

---

## ファイル構成

| ファイル | 扱い | 責務 |
|---|---|---|
| `src/assets/img/*.png`（6 枚） | 削除 | — |
| `src/assets/cats/{normal,blink,happy,sad}.png` | 新規 | 猫の 4 表情。にゃんどくからコピー |
| `src/ui/tile-svg.ts` | 全面改修 | 1 タイルの DOM の生成と差分更新。画像を持たない |
| `src/ui/cat-sprite.ts` | 新規 | 猫の DOM・表情・まばたき・向き |
| `src/ui/sfx.ts` | 新規 | WebAudio 合成の効果音と `navigator.vibrate` |
| `src/ui/icons.ts` | 新規 | 丸ボタンの線画アイコン 3 つ |
| `src/ui/board-view.ts` | 改修 | 盤の DOM 管理。差分更新・猫の移動アニメ |
| `src/ui/input.ts` | 改修 | Pointer Events に一本化 |
| `src/ui/screens/game.ts` | 改修 | 画面構成・状態差分から音と表情を出す・先行入力 |
| `src/styles/base.css` | 改修 | トークン |
| `src/styles/board.css` | 改修 | 盤・タイル・道・猫 |
| `src/styles/game.css` | 改修 | レイアウト・丸ボタン・クリア演出 |

---

### Task 1: タイルを画像なしのコード描画にする

**Files:**
- Modify: `src/ui/tile-svg.ts`（全面）
- Modify: `src/styles/base.css`（トークン）
- Modify: `src/styles/board.css`（タイル・道）
- Delete: `src/assets/img/tile.png`, `tile_fixed.png`, `hole.png`, `house.png`, `fish.png`
- Test: `tests/ui/tile-svg.test.ts`

**Interfaces:**
- Consumes: `Tile`（`src/core/types.ts`）、`isOpen` / `ALL_DIRS`（`src/core/conn.ts`）
- Produces: `tileSvg(tile: Tile): string` — シグネチャは据え置き。返す HTML から
  `<img>` が消える。Task 7 でここを `createTileEl` / `updateTileEl` に割る

- [ ] **Step 1: 失敗するテストを書く**

`tests/ui/tile-svg.test.ts` の既存テストのうち 3 つを書き換え、4 つを足す。
`tile()` ヘルパと既存の他のテストはそのまま残す。

```ts
  it('画像をいっさい使わない', () => {
    const svg = tileSvg(tile('NESW', 'goal', true, true));
    expect(svg).not.toContain('<img');
    expect(svg).not.toContain('.png');
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

  it('魚があれば魚を SVG で描く', () => {
    const svg = tileSvg(tile('NS', 'road', false, true));
    expect(svg).toContain('tile-fish');
    expect(svg).toContain('tile-fish-body');
    expect(tileSvg(tile('NS'))).not.toContain('tile-fish');
  });

  it('道は形によらず同じ太さで描く', () => {
    const svg = tileSvg(tile('NESW'));
    expect((svg.match(/stroke-width="40"/g) ?? []).length).toBe(1);
    expect((svg.match(/stroke-width="32"/g) ?? []).length).toBe(1);
  });
```

既存の「固定タイルには専用のクラスと画像が付く」「ゴールには家の画像を描く」
「魚があれば魚の画像を描く」の 3 つは上のものに置き換えて削除する。
「猫の画像を返す」は Task 3 で扱うのでこのタスクでは触らない。

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/tile-svg.test.ts`
Expected: FAIL。「画像をいっさい使わない」で `<img` が見つかる

- [ ] **Step 3: `tile-svg.ts` を書き換える**

`catSvg()` は Task 3 まで現状のまま残す（`cat.png` の import も残す）。

```ts
// タイルは画像を持たない。地は単色、道・家・魚はすべて SVG でコードから描く。
// 木目のテクスチャを敷いていた頃は、意味を持たない模様が盤面で一番目立ち、
// 肝心の道がその下に埋もれていた。描く要素を減らして道を主役に戻す。
import { ALL_DIRS, isOpen } from '../core/conn.ts';
import type { Dir } from '../core/conn.ts';
import type { Tile } from '../core/types.ts';

import catUrl from '../assets/img/cat.png';

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

/** ねこ。盤面とは別のレイヤに置く。 */
export function catSvg(): string {
  return `<img class="cat-img" src="${catUrl}" alt="ねこ" />`;
}
```

- [ ] **Step 4: `base.css` のトークンを差し替える**

`:root` の該当行を書き換え、`--road-lit` を足す。

```css
  --road: #d68d4c;
  --road-lit: #e5a468;      /* 到達可能なマスの道 */
  --road-outline: #8a5230;  /* 旧 #47230f。ほぼ黒で硬かったので地に馴染ませる */
  --tile: #fff6e8;
  --tile-fixed: #e8dcc8;    /* 旧 #d9c6ab。固定タイルが 2 番目に目立つ必要はない */
```

`--hole` は削除する（穴は盤の地をそのまま見せるため）。
同じく `--ease` と `--shadow` を実測値へ。

```css
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --anim: 180ms;
```

`@media (prefers-color-scheme: dark)` の側も同じキーを引き直す。

```css
    --road: #dc9c5c;
    --road-lit: #eeb377;
    --road-outline: #5c3418;
    --tile: #453729;
    --tile-fixed: #4f4132;
```

ダークの `--hole` も削除する。

- [ ] **Step 5: `board.css` のタイルと道を書き換える**

削除するもの：`.tile-bg-img` のルール一式、`.grid-cell.hole` の
`background-image` と `background-color`。

```css
/* 穴はタイルが無いマス。盤の地（白いカード）をそのまま見せ、
   内側の影だけで「開いている」ことを示す。 */
.grid-cell.hole {
  box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.10);
}

.tile-visual {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: var(--tile);
}

.tile-visual.tile-fixed {
  background: var(--tile-fixed);
}

/* 道は形（直線／カーブ／T字／十字）にかかわらず、常にこの1つの太さ・
   縁取り色で描く。線幅は SVG 側の属性で与えている。 */
.tile-road-outline line,
.tile-road-outline circle {
  stroke: var(--road-outline);
  fill: var(--road-outline);
}

.tile-road-fill line,
.tile-road-fill circle {
  stroke: var(--road);
  fill: var(--road);
}

.tile-road-outline line,
.tile-road-fill line {
  stroke-linecap: round;
}

/* 家と魚は道と同じペンで描く。道と同系統の線で描かれることで盤面に溶ける。 */
.tile-house-roof,
.tile-house-body {
  fill: var(--goal);
  stroke: var(--road-outline);
  stroke-width: 7;
  stroke-linejoin: round;
}

.tile-house-door {
  fill: var(--road-outline);
}

.tile-fish-body,
.tile-fish-tail {
  fill: var(--fish);
  stroke: var(--road-outline);
  stroke-width: 6;
  stroke-linejoin: round;
}

.tile-fish-eye {
  fill: var(--road-outline);
}
```

`.tile-mark` の位置指定は SVG になっても同じ考え方で使う。
`.tile-goal` は 52%、`.tile-fish` は 36% にする。

```css
.tile-mark {
  position: absolute;
  display: block;
  pointer-events: none;
}

.tile-mark.tile-goal {
  top: 24%;
  left: 24%;
  width: 52%;
  height: 52%;
}

.tile-mark.tile-fish {
  top: 32%;
  left: 32%;
  width: 36%;
  height: 36%;
}
```

`.grid-cell` の角丸も 12px → 8px に、`.tile-visual::after` の角丸も 8px に合わせる。

- [ ] **Step 6: 画像 5 枚を削除する**

```bash
git rm src/assets/img/tile.png src/assets/img/tile_fixed.png src/assets/img/hole.png src/assets/img/house.png src/assets/img/fish.png
```

- [ ] **Step 7: テストと型チェックを通す**

Run: `npx vitest run tests/ui/ && npx tsc --noEmit`
Expected: PASS。`tile-svg.test.ts` が全部通り、削除した画像への参照が残っていない

- [ ] **Step 8: 残った参照が無いことを確認**

Run: `grep -rn "tile\.png\|tile_fixed\|hole\.png\|house\.png\|fish\.png" src tests`
Expected: 出力なし

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "$(printf '盤面のタイルを画像からコード描画に変える\n\n木目テクスチャが盤面で一番目立ち、肝心の道がその下に埋もれていた。\nタイルを単色、家と魚を SVG にして、道を 30/24 から 40/32 へ太くした。\n穴は盤の地をそのまま見せる。画像 5 枚を削除。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 2: 到達可能の表示を「道が明るくなる」に変える

**Files:**
- Modify: `src/ui/tile-svg.ts`（`tile-reach-glow` の div を出すのをやめる — Task 1 の
  書き換えで既に消えている。ここでは確認のみ）
- Modify: `src/styles/board.css`
- Test: `tests/ui/tile-svg.test.ts`

**Interfaces:**
- Consumes: Task 1 の `tileSvg`
- Produces: なし（CSS の挙動のみ）

- [ ] **Step 1: 失敗するテストを書く**

```ts
  it('明滅する光の膜を持たない', () => {
    expect(tileSvg(tile('NESW'))).not.toContain('tile-reach-glow');
  });
```

- [ ] **Step 2: テストを走らせる**

Run: `npx vitest run tests/ui/tile-svg.test.ts -t '明滅する光の膜'`
Expected: PASS（Task 1 の書き換えで既に div を出していないため）。
FAIL した場合は `tileSvg` に `tile-reach-glow` が残っているので消す

- [ ] **Step 3: `board.css` の光エフェクトを削除し、道の明るさに置き換える**

削除：`.tile-reach-glow` のルール、`.tile.reachable .tile-reach-glow`、
`@keyframes reach-glow-pulse`。

```css
/* 猫が歩いて行けるマスは、そのマスの道を明るくする。
   以前は黄色い放射グラデを明滅させていたが、盤全体が点滅して見えた。
   歩ける範囲が「明るい道として一本に繋がって見える」ほうが情報として正しい。 */
.tile.reachable .tile-road-fill line,
.tile.reachable .tile-road-fill circle {
  stroke: var(--road-lit);
  fill: var(--road-lit);
}

.tile-road-fill line,
.tile-road-fill circle {
  transition: stroke var(--anim) var(--ease), fill var(--anim) var(--ease);
}
```

`.grid-cell.reachable::after` の黄色い塗りも削除する（穴には道が無いので
到達可能になりえない）。`--reach` トークンも `base.css` から削除する。

- [ ] **Step 4: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(printf '到達可能の表示を道の明るさに変える\n\n黄色い放射グラデの明滅は強すぎて盤全体が点滅して見えた。\n歩ける範囲が明るい道として一本に繋がって見えるほうが情報として正しい。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 3: 猫スプライト（4 表情・まばたき・呼吸）

**Files:**
- Create: `src/assets/cats/{normal,blink,happy,sad}.png`（にゃんどくからコピー）
- Create: `src/ui/cat-sprite.ts`
- Modify: `src/ui/tile-svg.ts`（`catSvg()` を削除）
- Modify: `src/ui/board-view.ts`（`CatSprite` を使う）
- Modify: `src/styles/board.css`
- Delete: `src/assets/img/cat.png`
- Test: `tests/ui/cat-sprite.test.ts`（新規）、`tests/ui/tile-svg.test.ts`（`catSvg` のテストを削除）

**Interfaces:**
- Consumes: なし
- Produces:
  - `class CatSprite`
    - `constructor()` — 内部に `.cat-flip > .cat-img` の DOM を作る
    - `readonly el: HTMLElement` — `.cat-flip` 要素。呼び出し側が親に append する
    - `setMood(mood: 'idle' | 'happy' | 'sad', ms?: number): void` — `ms` を渡すと
      その時間だけ切り替えて `idle` に戻る
    - `faceWest(west: boolean): void` — 西向きなら `scaleX(-1)`
    - `destroy(): void` — タイマーを止める

- [ ] **Step 1: 猫の画像をコピーする**

```bash
mkdir -p src/assets/cats
cp "C:/claude/test/public/cats/normal.png" src/assets/cats/
cp "C:/claude/test/public/cats/blink.png" src/assets/cats/
cp "C:/claude/test/public/cats/happy.png" src/assets/cats/
cp "C:/claude/test/public/cats/sad.png" src/assets/cats/
```

にゃんどくの猫は第三者の素材ではなく自作なので流用してよい。

- [ ] **Step 2: 失敗するテストを書く**

`tests/ui/cat-sprite.test.ts`（新規）。

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CatSprite } from '../../src/ui/cat-sprite.ts';

let cat: CatSprite | null = null;
afterEach(() => {
  cat?.destroy();
  cat = null;
  vi.useRealTimers();
});

const src = (c: CatSprite): string => c.el.querySelector('img')!.getAttribute('src')!;

describe('CatSprite', () => {
  it('はじめは普通の顔', () => {
    cat = new CatSprite();
    expect(src(cat)).toContain('normal');
  });

  it('表情を切り替えられる', () => {
    cat = new CatSprite();
    cat.setMood('happy');
    expect(src(cat)).toContain('happy');
    cat.setMood('sad');
    expect(src(cat)).toContain('sad');
  });

  it('時間を指定すると、その時間だけ切り替えて戻る', () => {
    vi.useFakeTimers();
    cat = new CatSprite();
    cat.setMood('happy', 700);
    expect(src(cat)).toContain('happy');
    vi.advanceTimersByTime(700);
    expect(src(cat)).toContain('normal');
  });

  it('待機中はまばたきする', () => {
    vi.useFakeTimers();
    cat = new CatSprite();
    vi.advanceTimersByTime(10_000);
    // まばたきの最中か、開いた直後のどちらか。少なくとも一度は blink を通る
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push(src(cat));
      vi.advanceTimersByTime(200);
    }
    expect(seen.some((s) => s.includes('blink'))).toBe(true);
  });

  it('普通の顔以外のときはまばたきしない', () => {
    vi.useFakeTimers();
    cat = new CatSprite();
    cat.setMood('happy');
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push(src(cat));
      vi.advanceTimersByTime(200);
    }
    expect(seen.every((s) => s.includes('happy'))).toBe(true);
  });

  it('西を向くと左右が反転する', () => {
    cat = new CatSprite();
    cat.faceWest(true);
    expect(cat.el.style.getPropertyValue('--flip')).toBe('-1');
    cat.faceWest(false);
    expect(cat.el.style.getPropertyValue('--flip')).toBe('1');
  });

  it('destroy 後はまばたきのタイマーが動かない', () => {
    vi.useFakeTimers();
    const c = new CatSprite();
    c.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
```

- [ ] **Step 3: テストが落ちることを確認**

Run: `npx vitest run tests/ui/cat-sprite.test.ts`
Expected: FAIL。`src/ui/cat-sprite.ts` が存在しない

- [ ] **Step 4: `src/ui/cat-sprite.ts` を書く**

```ts
// 猫の見た目。にゃんどくの src/ui/Cat.tsx を vanilla TS に移した。
// 移植で外してはいけない点が 2 つある。
//   1. 4 枚を先に読ませる。まばたきの瞬間に取りに行くと、そこで猫が一瞬消える
//   2. まばたきの間隔をばらつかせる。等間隔だと生き物ではなく点滅に見える
import blinkUrl from '../assets/cats/blink.png';
import happyUrl from '../assets/cats/happy.png';
import normalUrl from '../assets/cats/normal.png';
import sadUrl from '../assets/cats/sad.png';

export type Mood = 'idle' | 'happy' | 'sad';

const SRC = { normal: normalUrl, blink: blinkUrl, happy: happyUrl, sad: sadUrl };

/** まばたきで目を閉じている時間 */
const BLINK_MS = 130;

let preloaded = false;
function preload(): void {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  for (const src of Object.values(SRC)) {
    const img = new Image();
    img.src = src;
  }
}

export class CatSprite {
  /** 親に append する要素。位置は親（.cat）が持ち、こちらは向きだけを持つ。 */
  readonly el: HTMLElement;
  private img: HTMLImageElement;
  private mood: Mood = 'idle';
  private blinking = false;
  private closeTimer = 0;
  private openTimer = 0;
  private moodTimer = 0;

  constructor(seed = 0) {
    preload();
    this.el = document.createElement('div');
    this.el.className = 'cat-flip';
    this.el.style.setProperty('--flip', '1');
    this.img = document.createElement('img');
    this.img.className = 'cat-img';
    this.img.alt = 'ねこ';
    this.img.draggable = false;
    this.el.append(this.img);
    this.paint();
    this.scheduleBlink(seed);
  }

  setMood(mood: Mood, ms?: number): void {
    window.clearTimeout(this.moodTimer);
    this.moodTimer = 0;
    this.mood = mood;
    this.blinking = false;
    this.paint();
    if (ms !== undefined && mood !== 'idle') {
      this.moodTimer = window.setTimeout(() => this.setMood('idle'), ms);
    }
  }

  faceWest(west: boolean): void {
    this.el.style.setProperty('--flip', west ? '-1' : '1');
  }

  destroy(): void {
    window.clearTimeout(this.closeTimer);
    window.clearTimeout(this.openTimer);
    window.clearTimeout(this.moodTimer);
    this.closeTimer = this.openTimer = this.moodTimer = 0;
  }

  private paint(): void {
    const src =
      this.mood === 'happy'
        ? SRC.happy
        : this.mood === 'sad'
          ? SRC.sad
          : this.blinking
            ? SRC.blink
            : SRC.normal;
    this.img.src = src;
  }

  /** 間隔をばらつかせる。初回だけ seed でずらし、以降はランダム。 */
  private scheduleBlink(seed: number, first = true): void {
    const wait = first ? 900 + (seed % 5) * 700 : 2600 + Math.random() * 4200;
    this.closeTimer = window.setTimeout(() => {
      if (this.mood === 'idle') {
        this.blinking = true;
        this.paint();
        this.openTimer = window.setTimeout(() => {
          this.blinking = false;
          this.paint();
          this.scheduleBlink(seed, false);
        }, BLINK_MS);
        return;
      }
      this.scheduleBlink(seed, false);
    }, wait);
  }
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npx vitest run tests/ui/cat-sprite.test.ts`
Expected: PASS

- [ ] **Step 6: `board-view.ts` で `CatSprite` を使う**

`import { catSvg, tileSvg }` を `import { tileSvg }` に変え、
`import { CatSprite } from './cat-sprite.ts';` を足す。

コンストラクタの猫を作っている箇所を差し替える。

```ts
    this.catEl = document.createElement('div');
    this.catEl.className = 'cat';
    this.cat = new CatSprite();
    this.catEl.append(this.cat.el);
    this.actorLayer.appendChild(this.catEl);
```

フィールドに `private cat: CatSprite;` を足し、`destroy()` の先頭で
`this.cat.destroy();` を呼ぶ。外から表情を触れるようにアクセサを足す。

```ts
  /** 猫の表情と向き。ゲーム画面が状態の変化に合わせて呼ぶ。 */
  get catSprite(): CatSprite {
    return this.cat;
  }
```

- [ ] **Step 7: `tile-svg.ts` から `catSvg` を削除する**

`catSvg` の関数定義と `import catUrl from '../assets/img/cat.png';` を消す。
`tests/ui/tile-svg.test.ts` の「猫の画像を返す」テストと `catSvg` の import も消す。

```bash
git rm src/assets/img/cat.png
```

`src/assets/img/` は空になるのでディレクトリごと消える。

- [ ] **Step 8: `board.css` に猫の CSS を足す**

`.cat-img` の既存ルールを差し替え、`.cat-flip` を足す。
呼吸の値はにゃんどくの `cat-breathe` の実測値。

```css
/* 猫は 3 層。位置（.cat）／向き（.cat-flip）／呼吸（.cat-img）。
   1 つの要素に重ねると、歩行アニメの transform と互いを打ち消し合う。 */
.cat-flip {
  position: absolute;
  top: 18%;
  left: 18%;
  width: 64%;
  height: 64%;
  transform: scaleX(var(--flip, 1));
}

.cat-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  -webkit-user-drag: none;
  animation: cat-breathe 3.6s ease-in-out infinite;
}

/* ごく浅い呼吸。止まっている絵より生き物らしく見えるが、
   気づかれるほど大きく動かすと目障りになる。 */
@keyframes cat-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.035);
  }
}
```

- [ ] **Step 9: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 10: コミット**

```bash
git add -A
git commit -m "$(printf '猫を 4 表情のスプライトにする\n\nにゃんどくの猫（普通・まばたき・嬉しい・悲しい）を持ってきて、\nまばたきと呼吸を持つ CatSprite に切り出した。\nまばたきの間隔はばらつかせる。等間隔だと点滅に見える。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 4: 歩行の向きと跳ね

**Files:**
- Modify: `src/ui/board-view.ts`（`walkCatThrough`）
- Test: `tests/ui/board-view.test.ts`（新規）

**Interfaces:**
- Consumes: Task 3 の `CatSprite.faceWest`
- Produces: `walkCatThrough(path: Pos[], stepMs: number): Promise<void>` —
  シグネチャ据え置き。キーフレーム数が `path.length * 2 - 1` になる

- [ ] **Step 1: 失敗するテストを書く**

`tests/ui/board-view.test.ts`（新規）。jsdom には Web Animations API が無いので
`animate` を差し替えて、渡されたキーフレームを覗く。

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { BoardView } from '../../src/ui/board-view.ts';
import { createBoard } from '../../src/core/board.ts';
import { getLevel } from '../../src/levels/index.ts';

function view(): { v: BoardView; catEl: HTMLElement } {
  const root = document.createElement('div');
  document.body.append(root);
  const v = new BoardView(root, createBoard(getLevel('W1-1')!));
  return { v, catEl: root.querySelector<HTMLElement>('.cat')! };
}

/** animate を差し替えて、渡されたキーフレームを取り出す。 */
function captureKeyframes(el: HTMLElement): () => Keyframe[] {
  let captured: Keyframe[] = [];
  (el as unknown as { animate: unknown }).animate = (kf: Keyframe[]) => {
    captured = kf;
    return { finished: Promise.resolve(), cancel: () => {} };
  };
  return () => captured;
}

describe('猫の歩行アニメーション', () => {
  it('マスの中間に跳ねの山を挟む', async () => {
    const { v, catEl } = view();
    const get = captureKeyframes(catEl);
    await v.walkCatThrough(
      [
        { r: 1, c: 0 },
        { r: 1, c: 1 },
        { r: 1, c: 2 },
      ],
      120,
    );
    // 3 マス分の位置 + その間 2 つの山 = 5
    expect(get()).toHaveLength(5);
  });

  it('西へ進むと猫が左を向く', async () => {
    const { v, catEl } = view();
    captureKeyframes(catEl);
    const flip = (): string => v.catSprite.el.style.getPropertyValue('--flip');
    await v.walkCatThrough([{ r: 1, c: 2 }, { r: 1, c: 1 }], 120);
    expect(flip()).toBe('-1');
    await v.walkCatThrough([{ r: 1, c: 1 }, { r: 1, c: 2 }], 120);
    expect(flip()).toBe('1');
  });

  it('縦にだけ動くときは向きを変えない', async () => {
    const { v, catEl } = view();
    captureKeyframes(catEl);
    v.catSprite.faceWest(true);
    await v.walkCatThrough([{ r: 0, c: 1 }, { r: 1, c: 1 }], 120);
    expect(v.catSprite.el.style.getPropertyValue('--flip')).toBe('-1');
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/board-view.test.ts`
Expected: FAIL。キーフレームが 3 個しか無い

- [ ] **Step 3: `walkCatThrough` を書き換える**

```ts
  /** 1 マス歩くたびに猫が跳ねる高さ（マスの大きさに対する割合）。 */
  private static readonly HOP = 0.06;

  /**
   * 経路（始点を含む）に沿って猫を 1 本の連続したアニメーションで動かす。
   * 区間ごとに transition を打ち直す方式だと、境界で減速→再加速して
   * 止まって見えてしまうため、Web Animations API で経路全体を
   * 一定速度のキーフレームとして一度に再生する。
   *
   * マスとマスの中間に「跳ねの山」を 1 つ挟む。位置そのものは linear のまま
   * なので歩く速さは一定で、上下の動きだけが歩幅を感じさせる。
   */
  walkCatThrough(path: Pos[], stepMs: number): Promise<void> {
    if (path.length < 2) return Promise.resolve();

    // 進行方向が西なら左を向く。縦にしか動かないときは向きを変えない。
    const dc = path[path.length - 1]!.c - path[0]!.c;
    if (dc !== 0) this.cat.faceWest(dc < 0);

    if (typeof this.catEl.animate !== 'function') return Promise.resolve();

    const step = this.stepPx();
    const hop = step * BoardView.HOP;
    const at = (p: Pos, lift: number): Keyframe => ({
      transform: `translate(${p.c * step}px, ${p.r * step - lift}px)`,
    });

    const keyframes: Keyframe[] = [at(path[0]!, 0)];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      keyframes.push(at({ r: (a.r + b.r) / 2, c: (a.c + b.c) / 2 }, hop));
      keyframes.push(at(b, 0));
    }

    const anim = this.catEl.animate(keyframes, {
      duration: stepMs * (path.length - 1),
      easing: 'linear',
    });
    return anim.finished.then(
      () => anim.cancel(),
      () => {},
    );
  }
```

`prefers-reduced-motion` のときは跳ねを 0 にする。コンストラクタで一度だけ測る。

```ts
    this.reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
```

`const hop = this.reduceMotion ? 0 : step * BoardView.HOP;` とする。

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/ui/board-view.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "$(printf '猫が歩くときに跳ねて、進む向きを向くようにする\n\nマスとマスの中間に跳ねの山を 1 つ挟む。位置そのものは linear のままなので\n歩く速さは一定で、上下の動きだけが歩幅を感じさせる。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 5: 入力を Pointer Events に一本化する

**Files:**
- Modify: `src/ui/input.ts`
- Modify: `src/ui/board-view.ts`（`click` リスナを削除）
- Modify: `src/ui/screens/game.ts`（`onCellClick` → `input.on('tap')`）
- Test: `tests/ui/swipe.test.ts`（全面書き換え）、`tests/ui/input.test.ts`（据え置き）

**Interfaces:**
- Consumes: なし
- Produces:
  - `InputEvent` に `'tap'` を追加（`'walk' | 'tap' | 'slide' | 'undo' | 'restart' | 'back' | 'hint'`）
  - `bindSwipe(el)` → `bindPointer(el)` に改名。`tap` と `slide` の両方を発火する
  - `BoardView.onCellClick` は削除。呼び出し側は `input.on('tap', ...)` を使う

- [ ] **Step 1: 失敗するテストを書く**

`tests/ui/swipe.test.ts` を全面的に書き換える。

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InputManager } from '../../src/ui/input.ts';

let im: InputManager | null = null;
afterEach(() => {
  im?.destroy();
  im = null;
});

/** jsdom には PointerEvent が無いので、必要なプロパティだけ持つイベントを作る。 */
function pointer(type: string, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientX', { value: x });
  Object.defineProperty(ev, 'clientY', { value: y });
  Object.defineProperty(ev, 'isPrimary', { value: true });
  return ev;
}

function cell(r: number, c: number): HTMLElement {
  const el = document.createElement('div');
  el.dataset['r'] = String(r);
  el.dataset['c'] = String(c);
  return el;
}

function setup(): {
  board: HTMLElement;
  child: HTMLElement;
  tap: ReturnType<typeof vi.fn>;
  slide: ReturnType<typeof vi.fn>;
} {
  const board = document.createElement('div');
  const child = cell(1, 2);
  board.append(child);
  document.body.append(board);
  const tap = vi.fn();
  const slide = vi.fn();
  im = new InputManager(document);
  im.on('tap', tap);
  im.on('slide', slide);
  im.bindPointer(board);
  return { board, child, tap, slide };
}

function drag(el: HTMLElement, from: [number, number], to: [number, number]): void {
  el.dispatchEvent(pointer('pointerdown', from[0], from[1]));
  el.dispatchEvent(pointer('pointerup', to[0], to[1]));
}

describe('ポインタ操作', () => {
  it('7px を超えて動かしたらスライド。指を下ろしたマスが伝わる', () => {
    const { child, tap, slide } = setup();
    drag(child, [100, 100], [160, 104]);
    expect(slide).toHaveBeenCalledWith({ r: 1, c: 2 });
    expect(tap).not.toHaveBeenCalled();
  });

  it('向きに関わらず、押したマスが伝わる', () => {
    const { child, slide } = setup();
    drag(child, [100, 100], [104, 160]);
    expect(slide).toHaveBeenCalledWith({ r: 1, c: 2 });
  });

  it('7px 以内ならタップ。歩行として伝わる', () => {
    const { child, tap, slide } = setup();
    drag(child, [100, 100], [104, 103]);
    expect(tap).toHaveBeenCalledWith({ r: 1, c: 2 });
    expect(slide).not.toHaveBeenCalled();
  });

  it('ちょうど 7px はタップ', () => {
    const { child, tap } = setup();
    drag(child, [100, 100], [107, 100]);
    expect(tap).toHaveBeenCalledWith({ r: 1, c: 2 });
  });

  it('盤の外で指を下ろしたら何も起きない', () => {
    const { board, tap, slide } = setup();
    drag(board, [10, 10], [12, 12]);
    expect(tap).not.toHaveBeenCalled();
    expect(slide).not.toHaveBeenCalled();
  });

  it('pointerdown を挟まない pointerup は無視する', () => {
    const { child, tap } = setup();
    child.dispatchEvent(pointer('pointerup', 100, 100));
    expect(tap).not.toHaveBeenCalled();
  });

  it('destroy 後はイベントを受け取らない', () => {
    const { child, tap } = setup();
    im!.destroy();
    drag(child, [100, 100], [102, 101]);
    expect(tap).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/swipe.test.ts`
Expected: FAIL。`bindPointer` が存在しない

- [ ] **Step 3: `input.ts` を書き換える**

`touchstart` / `touchend` / `click` の 3 本立てと `swallowNextClick` を削除し、
Pointer Events に一本化する。キーボードの部分は一切変えない。

```ts
export type InputEvent = 'walk' | 'tap' | 'slide' | 'undo' | 'restart' | 'back' | 'hint';

/**
 * タップとドラッグを分ける閾値（px）。指はまっすぐ動かないので、
 * 小さすぎるとタップがスライドに化ける。
 */
const DRAG_THRESHOLD = 7;
```

クラスのフィールドを差し替える。

```ts
  private pointerEl: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private startPos: Pos | null = null;
  private down = false;
```

`bindSwipe` を `bindPointer` に置き換える。

```ts
  /**
   * 盤面の上のポインタ操作。合成 click を待たずに pointerup で確定させる。
   * click 経由にすると、指を離してからブラウザが click を作るまでの分だけ
   * 反応が遅れて「効かなかった」ように感じる。
   */
  bindPointer(el: HTMLElement): void {
    this.pointerEl = el;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerCancel);
  }

  private onPointerDown = (ev: Event): void => {
    const pe = ev as PointerEvent;
    if (pe.isPrimary === false) return;
    this.down = true;
    this.startX = pe.clientX;
    this.startY = pe.clientY;
    const el = (pe.target as HTMLElement | null)?.closest<HTMLElement>('[data-r]') ?? null;
    this.startPos = el ? { r: Number(el.dataset['r']), c: Number(el.dataset['c']) } : null;
  };

  private onPointerUp = (ev: Event): void => {
    if (!this.down) return;
    this.down = false;
    const pe = ev as PointerEvent;
    const from = this.startPos;
    this.startPos = null;
    if (!from) return;
    const dx = pe.clientX - this.startX;
    const dy = pe.clientY - this.startY;
    // 押す向きは穴の位置から一意に決まるので、ドラッグの向きは見ない。
    // 指を下ろしたマス（=押したいタイル）だけを渡す。
    if (Math.max(Math.abs(dx), Math.abs(dy)) > DRAG_THRESHOLD) this.emit('slide', from);
    else this.emit('tap', from);
  };

  private onPointerCancel = (): void => {
    this.down = false;
    this.startPos = null;
  };
```

`destroy()` の中も差し替える。

```ts
    if (this.pointerEl) {
      this.pointerEl.removeEventListener('pointerdown', this.onPointerDown);
      this.pointerEl.removeEventListener('pointerup', this.onPointerUp);
      this.pointerEl.removeEventListener('pointercancel', this.onPointerCancel);
      this.pointerEl = null;
    }
```

- [ ] **Step 4: `board-view.ts` から click の仕組みを削除する**

`root.addEventListener('click', this.onClick)`、`onClick`、`onCellClick`、
`clickCb` フィールドを削除する。`destroy()` の `removeEventListener('click', ...)`
と `this.clickCb = null;` も削除する。

- [ ] **Step 5: `screens/game.ts` の呼び出しを差し替える**

`view.onCellClick((p) => { ... })` を `input.on('tap', (p) => { ... })` に変える。
`p` は `Dir | Pos | undefined` で来るので、`if (p === undefined) return;` を先頭に足し、
`const target = p as Pos;` で受ける。中身のロジックは変えない。

`input.bindSwipe(boardRoot)` を `input.bindPointer(boardRoot)` に変える。

- [ ] **Step 6: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS。`tests/ui/game-screen.test.ts` がタップを `click` で送っている場合は
`pointerdown` + `pointerup` に書き換える

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "$(printf '入力を Pointer Events に一本化する\n\nタップだけが合成 click を待っていて、指を離してからさらに遅れていた。\npointerup で確定させ、7px の閾値でタップとドラッグを分ける。\nclick を握りつぶす仕組みは不要になったので削除。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 6: タイルの DOM を毎手作り直すのをやめる

**Files:**
- Modify: `src/ui/tile-svg.ts`（`createTileEl` / `updateTileEl` を追加）
- Modify: `src/ui/board-view.ts`（`render`）
- Test: `tests/ui/tile-svg.test.ts`

**Interfaces:**
- Consumes: Task 1 の `tileSvg`
- Produces:
  - `createTileEl(tile: Tile): HTMLElement` — `.tile` を返す。中に `.tile-visual` を持つ
  - `updateTileEl(el: HTMLElement, tile: Tile, force?: boolean): void` — 変わったものだけ触る。
    `force` は `createTileEl` が初回に全部描かせるためだけに使う（外から渡さない）
  - `tileSvg` は残す（テストと差分更新の内部で使う）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { createTileEl, updateTileEl, tileSvg } from '../../src/ui/tile-svg.ts';

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
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/tile-svg.test.ts -t 'タイルの差分更新'`
Expected: FAIL。`createTileEl` が存在しない

- [ ] **Step 3: `tile-svg.ts` に差分更新を足す**

`tileSvg` はそのまま残し、その下に足す。魚は初回から器を作って `hidden` で
隠しておく（付け外しのたびに DOM を作らないため）。

```ts
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

  if (force || el.dataset['kind'] !== tile.kind) {
    el.dataset['kind'] = tile.kind;
    el.querySelector('.tile-goal')?.remove();
    if (tile.kind === 'goal') visual.insertAdjacentHTML('beforeend', houseSvg());
  }

  const fish = visual.querySelector<SVGElement>('.tile-fish')!;
  if (tile.fish) fish.removeAttribute('hidden');
  else fish.setAttribute('hidden', '');

  visual.classList.toggle('tile-fixed', tile.fixed);
}
```

`.tile-fish` が `<svg>` なので、`hidden` 属性が効くよう `board.css` の
`[hidden]` は `base.css` の `[hidden] { display: none !important; }` に任せる
（すでにある）。

- [ ] **Step 4: `board-view.ts` の `render` を差分更新に変える**

タイルを作る箇所と、毎回 `innerHTML` を入れている箇所を差し替える。

```ts
        let el = this.tiles.get(tile.id);
        if (!el) {
          el = createTileEl(tile);
          el.dataset['r'] = String(r);
          el.dataset['c'] = String(c);
          this.place(el, r, c);
          this.tileLayer.appendChild(el);
          this.tiles.set(tile.id, el);
        } else {
          updateTileEl(el, tile);
        }
        el.dataset['r'] = String(r);
        el.dataset['c'] = String(c);
        el.classList.toggle('slidable', slid.has(idx(b, r, c)));
        el.classList.toggle('reachable', opts.reachable.has(idx(b, r, c)));
        el.classList.toggle('hinted', idx(b, r, c) === hintKey);
        if (el.style.getPropertyValue('--r') !== String(r) ||
            el.style.getPropertyValue('--c') !== String(c)) {
          moved.push([el, r, c]);
        }
```

import を `import { createTileEl, updateTileEl } from './tile-svg.ts';` に変える。

`applyPositions` は位置が変わったタイルだけを動かすので、`moved` が空なら
`requestAnimationFrame` を待たずに猫だけ置く。

```ts
    const applyPositions = (): void => {
      for (const [el, r, c] of moved) this.place(el, r, c);
      this.place(this.catEl, state.cat.r, state.cat.c);
    };

    if (this.first) {
      this.root.classList.add('no-anim');
      applyPositions();
      requestAnimationFrame(() => this.root.classList.remove('no-anim'));
      this.first = false;
    } else if (moved.length === 0) {
      // 動いたタイルが無いなら次フレームを待つ理由が無い
      applyPositions();
    } else {
      // 一度前の位置のまま描かせてから次フレームで動かす（これでトランジションが走る）
      requestAnimationFrame(applyPositions);
    }
```

- [ ] **Step 5: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "$(printf 'タイルの DOM を毎手作り直すのをやめる\n\n1 手ごとに全タイルの innerHTML を捨てて作り直していたので、\n盤が大きいほど操作がもたついた。実際に見た目が変わるのは\n魚を取ったときくらいなので、data 属性で前回の値を持って差分更新にする。\n位置が変わっていないタイルは requestAnimationFrame も待たない。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 7: 先行入力と、猫の反応

**Files:**
- Modify: `src/ui/screens/game.ts`
- Test: `tests/ui/game-screen.test.ts`

**Interfaces:**
- Consumes: Task 3 の `BoardView.catSprite`、Task 5 の `input.on('tap')`
- Produces: なし（画面の内部挙動）

- [ ] **Step 1: 失敗するテストを書く**

`tests/ui/game-screen.test.ts` に足す。`walkCatThrough` は jsdom では即座に
解決するので、Promise の解決を待つヘルパを用意する。

```ts
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

// tapCell / swipeCell は Step 1 の末尾に載せた poke 版を使う。

describe('猫の反応', () => {
  it('行けないマスをタップすると悲しい顔になる', async () => {
    open('W1-1');
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    // W1-1 の (3,3) は猫から到達できない
    tapCell(3, 3);
    await flush();
    expect(img()).toContain('sad');
  });

  it('歩ける先をタップしても悲しい顔にはならない', async () => {
    open('W1-1');
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    tapCell(1, 0); // 猫が今いるマス
    await flush();
    expect(img()).not.toContain('sad');
  });

  it('クリアすると嬉しい顔になる', async () => {
    open('W1-1');
    // W1-1 は 1 手で解ける。ヒントの示すタイルを押す
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    const r = Number(hinted.dataset['r']);
    const c = Number(hinted.dataset['c']);
    swipeCell(r, c);
    await flush();
    expect(root.querySelector('.cat-img')!.getAttribute('src')).toContain('happy');
  });
});
```

`swipeCell` は `tapCell` の兄弟。`pointerup` の `clientX` を `100` にすることで
7px を超え、スライドとして扱われる。両方とも同じファイルの先頭に置く。

```ts
/** 盤の (r,c) に対してポインタ操作を送る。dx が 7 を超えるとスライドになる。 */
function poke(r: number, c: number, dx: number): void {
  const el = root.querySelector<HTMLElement>(`.tile-layer [data-r="${r}"][data-c="${c}"]`)!;
  for (const [type, x] of [['pointerdown', 0], ['pointerup', dx]] as const) {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clientX', { value: x });
    Object.defineProperty(ev, 'clientY', { value: 0 });
    Object.defineProperty(ev, 'isPrimary', { value: true });
    el.dispatchEvent(ev);
  }
}

const tapCell = (r: number, c: number): void => poke(r, c, 0);
const swipeCell = (r: number, c: number): void => poke(r, c, 100);
```

上の `tapCell` の定義はこの `poke` 版に置き換える（2 つ定義しない）。

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/game-screen.test.ts -t '猫の反応'`
Expected: FAIL。表情が切り替わらない

- [ ] **Step 3: `screens/game.ts` に反応を足す**

`input.on('tap', ...)` の中で、到達できないマスなら悲しい顔にして揺らす。

```ts
  const cat = view.catSprite;

  /** 行けないマスをタップされたときの反応。今までは完全に無反応だった。 */
  function refuse(): void {
    cat.setMood('sad', 400);
    view.shakeCat();
  }

  input.on('tap', (p) => {
    if (p === undefined) return;
    const target = p as Pos;
    if (!message.hidden) return;
    const s = session.current;
    if (!reachableSet(s).has(idx(s.board, target.r, target.c))) {
      refuse();
      return;
    }
    ...
  });
```

`draw()` の中で、前回の状態と比べて魚とクリアを拾う。

```ts
  let prevFish = session.current.fishTaken;
  let prevCleared = session.current.cleared;

  function draw(): void {
    const s = session.current;
    ...
    if (s.fishTaken > prevFish) cat.setMood('happy', 700);
    if (s.cleared && !prevCleared) cat.setMood('happy');
    prevFish = s.fishTaken;
    prevCleared = s.cleared;
    ...
  }
```

- [ ] **Step 4: `board-view.ts` に `shakeCat` を足す**

位置の transform と喧嘩しないよう、WAAPI で基準位置を含むキーフレームを作る。

```ts
  /** 行けないところへ行こうとしたときの、小さな首かしげ。 */
  shakeCat(): void {
    if (this.reduceMotion || typeof this.catEl.animate !== 'function') return;
    const step = this.stepPx();
    const base = this.catEl.style;
    const r = Number(base.getPropertyValue('--r'));
    const c = Number(base.getPropertyValue('--c'));
    const x = c * step;
    const y = r * step;
    const d = step * 0.04;
    this.catEl.animate(
      [
        { transform: `translate(${x}px, ${y}px)` },
        { transform: `translate(${x - d}px, ${y}px)` },
        { transform: `translate(${x + d}px, ${y}px)` },
        { transform: `translate(${x - d}px, ${y}px)` },
        { transform: `translate(${x}px, ${y}px)` },
      ],
      { duration: 260, easing: 'ease-in-out' },
    );
  }
```

- [ ] **Step 5: 先行入力を足す**

`walking` フラグで入力を捨てているのをやめ、1 つだけ覚える。

```ts
  let walking = false;
  /** 歩いている最中に来たタップ。1 つだけ覚えて、歩き終わったら実行する。
      2 つ以上覚えると、意図しない移動が連鎖する。 */
  let queued: Pos | null = null;

  function walkTo(target: Pos): void {
    const s = session.current;
    if (!reachableSet(s).has(idx(s.board, target.r, target.c))) {
      refuse();
      return;
    }
    const path = shortestPath(s, target);
    if (!path || path.length === 0) return;
    const waypoints = pathPositions(s.cat, path);
    walking = true;
    view.setCatAnimated(false);
    act(() => session.walkTo(target));
    void view.walkCatThrough(waypoints, WALK_STEP_MS).then(() => {
      view.setCatAnimated(true);
      walking = false;
      const next = queued;
      queued = null;
      if (next) walkTo(next);
    });
  }

  input.on('tap', (p) => {
    if (p === undefined || !message.hidden) return;
    const target = p as Pos;
    if (walking) {
      queued = target;
      return;
    }
    walkTo(target);
  });
```

`undo` / `restart` / `back` のハンドラと `stopCatWalk()` で `queued = null;` にする。

- [ ] **Step 6: `reachableSet` の二重計算をやめる**

`walkTo`（旧 `onCellClick`）と `draw` の両方が `reachableSet(s)` を呼んでいる。
`draw` が計算した結果を持ち回す。

```ts
  /** draw() が最後に計算した到達可能なマス。盤が変わるたびに更新される。 */
  let reach: Set<number> = reachableSet(session.current);

  function draw(): void {
    const s = session.current;
    reach = reachableSet(s);
    view.render(s, { reachable: reach, slidable: slideTargets(s.board), hint });
    ...
  }
```

`walkTo` と `input.on('tap')` の中の `reachableSet(s).has(...)` を
`reach.has(...)` に置き換える。`session` の状態を変える操作はすべて `act()` を
通って `draw()` を呼ぶので、`reach` が古いまま読まれることはない。

- [ ] **Step 7: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(printf '歩行中のタップを先行入力として受け、猫に反応を返す\n\n歩いている間のタップを捨てていたので、連続タップが効かなかった。\n1 つだけ覚えて歩き終わりに実行する。\n行けないマスをタップしたときは今まで完全に無反応だったので、\n悲しい顔と小さな首かしげを返す。魚を取ると嬉しい顔になる。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 8: 効果音と触覚

**Files:**
- Create: `src/ui/sfx.ts`
- Modify: `src/ui/screens/game.ts`
- Modify: `src/styles/game.css`（消音トグル）
- Test: `tests/ui/sfx.test.ts`（新規）

**Interfaces:**
- Consumes: なし
- Produces:
  - `play(name: SfxName): void` — `'walk' | 'slide' | 'blocked' | 'fish' | 'clear'`
  - `isMuted(): boolean` / `setMuted(on: boolean): void` — `localStorage` に保存
  - `buzz(pattern: number | number[]): void` — `navigator.vibrate` の薄い包み

- [ ] **Step 1: 失敗するテストを書く**

`tests/ui/sfx.test.ts`（新規）。jsdom には `AudioContext` が無いので、
「落ちないこと」と「消音の保存」を確かめる。

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { play, isMuted, setMuted, buzz } from '../../src/ui/sfx.ts';

beforeEach(() => {
  localStorage.clear();
  setMuted(false);
});

describe('効果音', () => {
  it('AudioContext が無い環境でも落ちない', () => {
    expect(() => play('walk')).not.toThrow();
    expect(() => play('clear')).not.toThrow();
  });

  it('はじめは消音でない', () => {
    expect(isMuted()).toBe(false);
  });

  it('消音の設定が localStorage に残る', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem('cat-maze:muted')).toBe('1');
    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('vibrate が無い環境でも落ちない', () => {
    expect(() => buzz(10)).not.toThrow();
  });

  it('消音中は vibrate も呼ばない', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    setMuted(true);
    buzz(10);
    expect(vibrate).not.toHaveBeenCalled();
    setMuted(false);
    buzz(10);
    expect(vibrate).toHaveBeenCalledWith(10);
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/sfx.test.ts`
Expected: FAIL。`src/ui/sfx.ts` が存在しない

- [ ] **Step 3: `src/ui/sfx.ts` を書く**

にゃんどくの `src/core/sfx.ts` と同じ作法。音声ファイルを持たず、
倍音の少ない波形を軽いローパスに通し、減衰を指数カーブにして耳に刺さらないようにする。

```ts
// 効果音。音声ファイルを持たず WebAudio で合成する。
// 読み込みゼロ・容量ゼロ・遅延ゼロ。にゃんどくの src/core/sfx.ts と同じ作法。
const MUTE_KEY = 'cat-maze:muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 4200;
    master.connect(soften).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** 終端の周波数。指定するとその高さへ滑らかに動く。 */
  slideTo?: number;
}

function tone({ freq, duration, type = 'sine', gain = 0.06, delay = 0, slideTo }: ToneOptions): void {
  const ac = audio();
  if (!ac || !master || muted) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export type SfxName = 'walk' | 'slide' | 'blocked' | 'fish' | 'clear';

export function play(name: SfxName): void {
  switch (name) {
    case 'walk':
      tone({ freq: 320, duration: 0.04, gain: 0.05 });
      break;
    case 'slide':
      tone({ freq: 180, slideTo: 120, duration: 0.12, type: 'triangle', gain: 0.07 });
      break;
    case 'blocked':
      tone({ freq: 110, duration: 0.03, type: 'square', gain: 0.04 });
      break;
    case 'fish':
      tone({ freq: 660, duration: 0.08, gain: 0.06 });
      tone({ freq: 880, duration: 0.08, gain: 0.06, delay: 0.06 });
      break;
    case 'clear':
      [523, 659, 784, 1047].forEach((freq, i) => {
        tone({ freq, duration: 0.12, gain: 0.07, delay: i * 0.09 });
      });
      break;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(on: boolean): void {
  muted = on;
  try {
    if (on) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // プライベートブラウズなどで書けなくても、その回の設定は効く
  }
}

/** 触覚。対応していない環境では何も起きない。 */
export function buzz(pattern: number | number[]): void {
  if (muted) return;
  navigator.vibrate?.(pattern);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/ui/sfx.test.ts`
Expected: PASS

- [ ] **Step 5: `screens/game.ts` に音を繋ぐ**

`GameSession` はイベントを発火しない純粋な状態遷移なので、
**前後の状態を比べて**鳴らす。この設計は変えない。

`screens/game.ts` の先頭に import を足す。

```ts
import { buzz, isMuted, play, setMuted } from '../sfx.ts';
```

`draw()` の差分検出（Task 7 で入れた `prevFish` / `prevCleared`）に音を足し、
手数の増加も見る。

```ts
  let prevMoves = session.current.moves;

  function draw(): void {
    const s = session.current;
    ...
    if (s.moves > prevMoves) {
      play('slide');
      buzz(10);
    }
    if (s.fishTaken > prevFish) {
      play('fish');
      cat.setMood('happy', 700);
    }
    if (s.cleared && !prevCleared) {
      play('clear');
      buzz([40, 60, 40]);
      cat.setMood('happy');
    }
    prevMoves = s.moves;
    prevFish = s.fishTaken;
    prevCleared = s.cleared;
    ...
  }
```

`refuse()` に `play('blocked'); buzz(20);` を足す。

歩行音は 1 マスごとに鳴らすので、`walkTo` の中で経路の長さから刻む。

```ts
    // 歩行音だけは 1 マスずつ鳴らす。移動そのものは 1 本のアニメーションなので、
    // 経路の長さと 1 マスあたりの時間から刻む。
    for (let i = 1; i < waypoints.length; i++) {
      window.setTimeout(() => play('walk'), (i - 1) * WALK_STEP_MS);
    }
```

- [ ] **Step 6: 消音トグルをヘッダに置く**

`game-header` の右端に足す。アイコンは文字で十分（`🔊` / `🔇`）。

```html
<button class="icon-btn mute-btn" type="button" aria-label="おと"></button>
```

```ts
  const muteBtn = q<HTMLButtonElement>('.mute-btn');
  function paintMute(): void {
    muteBtn.textContent = isMuted() ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-pressed', String(isMuted()));
  }
  muteBtn.addEventListener('click', () => {
    setMuted(!isMuted());
    paintMute();
  });
  paintMute();
```

- [ ] **Step 7: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(printf '効果音と触覚を足す\n\nWebAudio で合成するので音声ファイルを持たない。読み込みゼロ・容量ゼロ。\nGameSession はイベントを発火しない純粋な状態遷移なので、\n画面側が前後の状態を比べて鳴らす。消音は localStorage に残す。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 9: プレイ画面のレイアウト

**Files:**
- Create: `src/ui/icons.ts`
- Modify: `src/ui/screens/game.ts`（HTML と初手での説明の消し込み）
- Modify: `src/styles/game.css`
- Modify: `src/styles/board.css`（盤のカード化・高さ制限の解除）
- Test: `tests/ui/game-screen.test.ts`

**Interfaces:**
- Consumes: Task 8 の消音トグル
- Produces: `iconUndo()` / `iconRetry()` / `iconHint()` — それぞれ SVG 文字列を返す

- [ ] **Step 1: 失敗するテストを書く**

```ts
describe('プレイ画面のレイアウト', () => {
  it('操作の説明ははじめだけ出て、1 手打つと消える', () => {
    open('W1-1');
    const line = q('.controls-line');
    expect(line.hidden).toBe(false);
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    swipeCell(Number(hinted.dataset['r']), Number(hinted.dataset['c']));
    expect(line.hidden).toBe(true);
  });

  it('フッタのボタンは丸アイコンで、中に線画を持つ', () => {
    open('W1-1');
    for (const sel of ['.undo-btn', '.retry-btn', '.hint-btn']) {
      const btn = q<HTMLButtonElement>(sel);
      expect(btn.classList.contains('tool')).toBe(true);
      expect(btn.querySelector('svg')).not.toBeNull();
    }
  });

  it('さかなの表示はヘッダの中に入る', () => {
    open('W3-1');
    expect(q('.game-header').querySelector('.fish-pill')).not.toBeNull();
  });
});
```

既存の「操作説明に タップ／スワイプ／あるく が出る」テスト（`game-screen.test.ts`
の 128〜132 行あたり）は、初期状態では引き続き通るのでそのまま残す。

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/game-screen.test.ts -t 'プレイ画面のレイアウト'`
Expected: FAIL

- [ ] **Step 3: `src/ui/icons.ts` を書く**

にゃんどくの `src/ui/icons.tsx` と同じ線画。JSX ではなく文字列を返す。

```ts
// 丸ボタンの線画。にゃんどくと同じ形にそろえてある。
const WRAP = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** もどす — 左へ回る矢印 */
export const iconUndo = (): string =>
  WRAP('<path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-4" />');

/** やりなおし — 一周する矢印 */
export const iconRetry = (): string =>
  WRAP('<path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />');

/** ヒント — 電球 */
export const iconHint = (): string =>
  WRAP('<path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z" />');
```

- [ ] **Step 4: `screens/game.ts` の HTML を書き換える**

ヘッダに消音とさかなのピルを入れ、盤の下の `fish-line` を消し、
フッタを丸ボタンにする。

```html
      <header class="game-header">
        <button class="icon-btn back-btn" type="button" aria-label="もどる">‹</button>
        <div class="level-title">
          <span class="level-id">${world ? world.name : ''} ${def.id}</span>
          <span class="level-name">${def.name}</span>
        </div>
        <div class="header-right">
          <div class="move-counter">
            <span class="moves">0</span>
            <span class="moves-label">さいたん ${def.optimalMoves}</span>
          </div>
          <span class="fish-pill" hidden><span class="fish-count"></span></span>
          <button class="icon-btn mute-btn" type="button" aria-label="おと"></button>
        </div>
      </header>

      <p class="hint-line">${def.hint ?? ''}</p>

      <div class="board-wrap"><div class="board-root"></div></div>

      <p class="controls-line">
        <span class="ctl"><b>タップ / やじるし</b> ねこが あるく</span>
        <span class="ctl"><b>スワイプ</b> タイルを うごかす</span>
      </p>

      <footer class="game-footer">
        <button class="tool undo-btn" type="button" aria-label="もどす">${iconUndo()}</button>
        <button class="tool retry-btn" type="button" aria-label="やりなおし">${iconRetry()}</button>
        <button class="tool hint-btn" type="button" aria-label="ヒント">${iconHint()}</button>
      </footer>
```

`q('.fish-line')` を `q('.fish-pill')` に差し替える。`draw()` の中で
`fishPill.hidden = s.fishTotal === 0;` にする。

説明は 1 手打ったら消す。

```ts
  const controls = q('.controls-line');
  // 説明は最初の 1 手まで。ずっと出しておくと画面が説明くさくなる。
  function updateControls(): void {
    controls.hidden = session.current.moves > 0;
  }
```

`draw()` の末尾で `updateControls();` を呼ぶ。

- [ ] **Step 5: `game.css` を書き換える**

```css
.game-screen {
  gap: 4px;
  height: 100dvh;
  overflow: hidden;
}

.game-header {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fish-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--surface);
  box-shadow: var(--shadow);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--fish);
  white-space: nowrap;
}

.controls-line {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 14px;
  margin: 0;
  font-size: 0.7rem;
  color: var(--ink-soft);
}

/* フッタの丸ボタン。寸法はにゃんどくの .tool の実測値。 */
.game-footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding-top: 8px;
}

.tool {
  appearance: none;
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  padding: 10px;
  border: 0;
  border-radius: 999px;
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.15s var(--ease), opacity 0.15s var(--ease);
}

.tool:active:not(:disabled) {
  transform: scale(0.9);
}

.tool:disabled {
  opacity: 0.35;
  cursor: default;
}

.tool svg {
  width: 40px;
  height: 40px;
}
```

`.game-footer .btn` と `.fish-line` のルールは削除する。

- [ ] **Step 6: `board.css` の盤をカード化する**

```css
.board {
  --gap: 6px;
  /* 高さは残り全部を使う。46vh で止めていた頃は画面上部に大きな空白ができていた。 */
  --avail-w: min(92vw, 452px);
  --avail-h: 100%;
  --step: min(calc(var(--avail-w) / var(--cols)), calc(var(--avail-h) / var(--rows)));
  --cell: calc(var(--step) - var(--gap));

  position: relative;
  width: calc(var(--step) * var(--cols));
  height: calc(var(--step) * var(--rows));
  background: var(--surface);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.grid-layer,
.tile-layer,
.actor-layer {
  position: absolute;
  inset: 16px;
}
```

`--avail-h: 100%` の `100%` は `.board-wrap` の高さを指す。`.board-wrap` は
`flex: 1 1 auto` で高さが決まるので、そのまま参照できる。上下の padding
16px × 2 を引いた分が盤の中身に使える高さなので、`--avail-h` は
`calc(100% - 32px)` とする。

```css
.board {
  --avail-h: calc(100% - 32px);
}

.board-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px 0;
}
```

`.board` は `height` を `calc(var(--step) * var(--rows))` で自分で決めるので、
`.board-wrap` の高さを超えないことは `--step` の `min()` が保証する。

- [ ] **Step 7: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: コミット**

```bash
git add -A
git commit -m "$(printf 'プレイ画面のレイアウトを引き直す\n\n盤を 46vh の制限から外して残り全部を使わせ、白いカードに載せた。\nフッタの横長ボタン 3 つを丸アイコンにし、さかなの行はヘッダのピルへ畳んだ。\n操作の説明は最初の 1 手まで。ずっと出しておくと画面が説明くさい。\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 10: クリア演出

**Files:**
- Modify: `src/ui/screens/game.ts`（カードに猫を足す）
- Modify: `src/styles/game.css`
- Test: `tests/ui/game-screen.test.ts`

**Interfaces:**
- Consumes: Task 3 の `CatSprite`
- Produces: なし

- [ ] **Step 1: 失敗するテストを書く**

```ts
  it('クリアのカードに嬉しい顔の猫が出る', () => {
    open('W1-1');
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    swipeCell(Number(hinted.dataset['r']), Number(hinted.dataset['c']));
    const img = q('.message-card').querySelector('img')!;
    expect(img.getAttribute('src')).toContain('happy');
  });
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `npx vitest run tests/ui/game-screen.test.ts -t 'クリアのカードに'`
Expected: FAIL

- [ ] **Step 3: カードに猫を足す**

HTML のカードの先頭に器を置く。

```html
        <div class="message-card">
          <div class="banner-cat"></div>
          <p class="message-title">クリア!</p>
```

`showClear()` の中で猫を差し込む。画面の猫とは別個体にする（表情が連動すると
盤の猫がカードに引きずられる）。

```ts
    const bannerCat = new CatSprite();
    bannerCat.setMood('happy');
    const slot = q('.banner-cat');
    slot.innerHTML = '';
    slot.append(bannerCat.el);
    bannerCats.push(bannerCat);
```

`bannerCats: CatSprite[]` を用意し、cleanup で全部 `destroy()` する。

- [ ] **Step 4: `game.css` をにゃんどくの実測値へ寄せる**

```css
.game-message {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(246 239 228 / 0.66);
  backdrop-filter: blur(3px);
  z-index: 10;
  animation: fade-in 200ms ease-out;
}

.message-card {
  background: var(--surface);
  border: 0;
  border-radius: 22px;
  box-shadow: 0 18px 50px rgb(115 80 86 / 0.16);
  padding: 28px 34px 30px;
  text-align: center;
  display: grid;
  gap: 4px;
  justify-items: center;
  min-width: 258px;
  width: min(88vw, 360px);
}

.banner-cat {
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
}

/* カードの中の猫は盤の上ではないので、位置と向きの層は要らない */
.banner-cat .cat-flip {
  position: static;
  width: 100%;
  height: 100%;
}
```

盤の上の猫のクリア時のジャンプ（`.cat.cleared` の `cat-hop`、520ms × 2）は
既存のまま残す。Task 4 で入れた WAAPI の歩行アニメーションは終わると
`cancel()` されるので、CSS アニメーションと取り合いにならない。

- [ ] **Step 5: テストと型チェック**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "$(printf 'クリアのカードに猫を出し、影と余白をにゃんどくの値にそろえる\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

### Task 11: 仕上げと公開

**Files:**
- 変更なし（確認と公開のみ）

- [ ] **Step 1: 削除した素材への参照が残っていないことを確認**

Run: `grep -rn "assets/img\|tile\.png\|tile_fixed\|hole\.png\|house\.png\|fish\.png\|cat\.png\|reach-glow\|bindSwipe\|onCellClick" src tests`
Expected: 出力なし

- [ ] **Step 2: 全テストと型チェック**

Run: `npm test && npm run build`
Expected: どちらも PASS

- [ ] **Step 3: 実機で確認する**

Run: `npm run dev`

次の 3 面を開いて目視で確かめる。

| 面 | 見るところ |
|---|---|
| W1-1 | 道が盤面で一番目立つこと。穴が異物に見えないこと。固定タイルが主張しないこと |
| W3-1 | 魚が読めること。取ったときに猫が嬉しい顔になり、音が鳴ること |
| W5-6 | 大きい盤でも画面に収まり、上部に死に空白ができていないこと |

あわせて次も確かめる。

- 行けないマスをタップしたとき、猫が悲しい顔をして揺れること
- 歩いている最中にタップした先へ、歩き終わってから続けて歩くこと
- クリアのカードに嬉しい顔の猫が出ること
- 消音トグルが効き、再読み込みしても消音のままであること
- OS のダークモードで盤面が破綻しないこと

- [ ] **Step 4: 公開する**

検証が全部通ったら、確認を挟まずそのまま公開する。

```bash
git push origin main
npm run deploy
```

- [ ] **Step 5: 公開版で確認する**

`https://masato-masa.github.io/cat-maze/` を開き、Step 3 と同じ 3 面を見る。
ユーザーは公開版で確認するので、ローカルで直しただけは「直っていない」と同じ。
