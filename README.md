# ねこめいろ（Cat Maze）

**▶ あそぶ: https://masato-masa.github.io/cat-maze/**

盤面のタイルをスライドして迷路を作り替えながら、猫を歩かせておうちへ導く手数最適化パズル。

## このゲームの核

> **1回のスライドで「道が繋がる」と同時に「猫が目的地側へ運ばれる」— この一石二鳥の手を見つける瞬間。**

猫が乗っているタイルをスライドすると、猫は足場ごと運ばれる。
つまりスライドは道を作る手段であると同時に、猫の移動手段でもある。

プレイヤーは常に2つの問いを同時に抱える。

1. どう道を繋ぐか（空間パズル）
2. 自分はどこに立っておくか（自分もまた動かされる駒である）

## あそびかた

| 操作 | やること | 手数 |
|---|---|---|
| 矢印キー / WASD / スワイプ | 猫が歩く | **0手** |
| タイルをタップ | 穴の方向へスライド | **1手** |

- 盤面には「穴」が1つある。穴は猫が通れない壁であり、同時にスライドの自由度そのもの。
- 穴と同じ行・列のタイルは、まとめて穴の方向へ押せる。何枚動いても1手。
- 石（動かないタイル）を越えて押すことはできない。
- 魚がある面は、すべて集めてからおうちへ。
- 評価はスライド回数だけで決まる。★3 は理論上の最短手数ちょうど。
- Undo は無制限。使っても星は下がらない。

## ワールド

| ワールド | 主題 | ステージ数 |
|---|---|---|
| W1 うらにわ | 歩行とスライド、猫が運ばれること | 6 |
| W2 いしだたみ | 固定タイルが押せる範囲を切る | 6 |
| W3 さかなつり | 収集物とルートの順序 | 6 |
| W4 うごくおうち | ゴールもスライドできる | 6 |
| W5 やねのうえ | 総合 | 6 |

全30ステージ。すべてソルバーで最短手数を検証してある。

## 開発

```bash
npm install
npm run dev       # 開発サーバ
npm test          # テスト
npm run build     # 型チェック + 本番ビルド
npm run verify    # 全ステージの最短手数をソルバーで検証
npm run play      # テキスト版で遊ぶ（ルールの手触り確認用）
```

`npm run play W3-4` のようにステージ ID を渡すとそこから始まる。

### 公開する

```bash
npm run deploy
```

本番ビルドして `dist/` を `gh-pages` ブランチへ push する。
GitHub Pages はそのブランチを公開する設定にしてある。
本番ビルドのときだけベースパスが `/cat-maze/` になる（開発サーバは `/` のまま）。

CI から自動デプロイしたい場合は `.github/workflows/` にワークフローを置けばよいが、
push するトークンに `workflow` スコープが要る。付与するには一度だけ次を実行する。

```bash
gh auth refresh -s workflow
```

### 構成

```
src/
  core/      純粋関数のルールエンジン。UI も乱数も時刻も知らない
  solver/    反復深化ソルバーと、ステージ検証 CLI
  levels/    全ステージの定義
  cli/       テキスト版プレイヤー
  ui/        DOM + CSS の画面。core を呼ぶだけ
```

ルールの実装は `core/` の1箇所にしかない。ソルバーも UI もそれをそのまま使う。
そのため「ソルバーだけが知っているルール」は存在しない。

### ステージを追加するには

1. `src/levels/wN.ts` に盤面を書く（`optimalMoves` は仮の値でよい）
2. `npm run verify` を走らせる
3. 宣言した手数と実際の最短手数が違えば `MISMATCH` が出るので、実際の値に直すか盤面を作り直す

`node --experimental-strip-types src/solver/cli.ts solve W3-4` で最短手順を確認できる。

## ドキュメント

- 設計仕様書: [docs/superpowers/specs/2026-09-05-cat-maze-design.md](docs/superpowers/specs/2026-09-05-cat-maze-design.md)
- 実装計画: [docs/superpowers/plans/2026-09-05-cat-maze.md](docs/superpowers/plans/2026-09-05-cat-maze.md)

## ライセンスと流用元

UI の入力管理・localStorage の扱い・タイルのアニメーション描画・盤面の DOM 構造は
[2048](https://github.com/gabrielecirulli/2048)（MIT, Gabriele Cirulli）の実装を流用している。
タイルの方角ビットの持ち方とパイプの描き方は
[Simon Tatham's Portable Puzzle Collection](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/)（MIT）の `net.c` に倣った。

詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照。
