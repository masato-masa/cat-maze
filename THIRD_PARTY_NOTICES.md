# サードパーティ表示

本プロジェクトは以下のオープンソースソフトウェアのコードおよび実装方式を流用しています。

---

## 2048 — Gabriele Cirulli

https://github.com/gabrielecirulli/2048

流用箇所:

| 本プロジェクトのファイル | 流用元 | 内容 |
|---|---|---|
| `src/ui/input.ts` | `js/keyboard_input_manager.js` | イベントエミッタ、キーコードから方向への写像、スワイプ判定 |
| `src/ui/storage.ts` | `js/local_storage_manager.js` | localStorage の利用可否プローブと fakeStorage フォールバック |
| `src/ui/board-view.ts` | `js/html_actuator.js` | requestAnimationFrame の二段構えで CSS トランジションを起こす描画方式 |
| `src/styles/board.css`, `src/ui/screens/game.ts` | `index.html`, `style/main.css` | 背景セル層と絶対配置タイル層を重ねる盤面の DOM 構造、およびクリア時オーバーレイの構造 |

```
The MIT License (MIT)

Copyright (c) 2014 Gabriele Cirulli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## Simon Tatham's Portable Puzzle Collection

https://www.chiark.greenend.org.uk/~sgtatham/puzzles/ （ミラー: https://github.com/ghewgill/puzzles ）

流用箇所:

| 本プロジェクトのファイル | 流用元 | 内容 |
|---|---|---|
| `src/core/conn.ts` | `net.c` | 方角ビットを時計回りに並べ、90 度回転をビットローテートで表す方式 |
| `src/ui/tile-svg.ts` | `net.c` | タイル中心から開いている辺へ線を引き、行き止まりの先端に印を置くパイプ描画 |

Simon Tatham's Portable Puzzle Collection は MIT ライセンスで配布されています。
Copyright (c) 2004-2025 Simon Tatham and contributors.

---

## 流用していないもの

- BdR76/phaserlevelselect — ライセンス表記が無く、同梱素材が Cut the Rope 由来のため、コードも素材も使用していません。ステージ選択画面は自前の実装です。
