// タイルを使い回して requestAnimationFrame を二段に重ね、
// 「前の位置で描いてから次フレームで位置を変える」ことで CSS トランジションを起こす方式は
// 2048 の js/html_actuator.js を元にしている。
// 背景セル層と絶対配置タイル層を重ねる DOM 構造も同じ考え方。
// Copyright (c) 2014 Gabriele Cirulli — MIT License
// https://github.com/gabrielecirulli/2048
import { idx } from '../core/board.ts';
import type { Board, GameState, Pos } from '../core/types.ts';
import { CatSprite } from './cat-sprite.ts';
import { createTileEl, updateTileEl } from './tile-svg.ts';

export type RenderOpts = {
  reachable: Set<number>;
  slidable: Pos[];
  /** ヒントで光らせるタイル */
  hint?: Pos | null;
};

export class BoardView {
  private root: HTMLElement;
  private gridLayer: HTMLElement;
  private tileLayer: HTMLElement;
  private actorLayer: HTMLElement;
  private catEl: HTMLElement;
  private cat: CatSprite;
  private tiles = new Map<number, HTMLElement>();
  private width: number;
  private height: number;
  private first = true;
  /** 減モーション設定。跳ねの高さをここで 0 にする。 */
  private reduceMotion: boolean;
  /** .board-wrap の大きさが変わるたびに --avail-h を測り直す。jsdom には無い。 */
  private resizeObserver: ResizeObserver | undefined;

  constructor(root: HTMLElement, board: Board) {
    this.root = root;
    this.width = board.width;
    this.height = board.height;
    this.reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    root.className = 'board';
    root.style.setProperty('--cols', String(board.width));
    root.style.setProperty('--rows', String(board.height));
    root.innerHTML =
      '<div class="grid-layer"></div><div class="tile-layer"></div><div class="actor-layer"></div>';

    this.gridLayer = root.querySelector('.grid-layer')!;
    this.tileLayer = root.querySelector('.tile-layer')!;
    this.actorLayer = root.querySelector('.actor-layer')!;

    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.style.setProperty('--r', String(r));
        cell.style.setProperty('--c', String(c));
        cell.dataset['r'] = String(r);
        cell.dataset['c'] = String(c);
        this.gridLayer.appendChild(cell);
      }
    }

    this.catEl = document.createElement('div');
    this.catEl.className = 'cat';
    this.cat = new CatSprite();
    this.catEl.append(this.cat.el);
    this.actorLayer.appendChild(this.catEl);

    // 初回描画の前に一度同期的に測っておく（最初から正しい大きさで出したい）。
    this.updateAvailHeight();
    if (typeof ResizeObserver !== 'undefined' && root.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.updateAvailHeight());
      this.resizeObserver.observe(root.parentElement);
    }
  }

  /** .board-wrap（root の親）の内寸を実測し、盤の中身に使える高さを
   * --avail-h に px で書き込む。CSS 側の calc() は --step の中で
   * transform: translate() に使われるため、ここは必ず絶対長（px）で
   * 上書きする。パーセンテージのままだと式ごと無効になり、
   * タイル・猫が全部 (0,0) へ潰れる。 */
  private updateAvailHeight(): void {
    const wrap = this.root.parentElement;
    if (!wrap) return;
    const cs = getComputedStyle(wrap);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    // .board-wrap の内寸から、盤自身の上下 padding（16px × 2）を引いた分が
    // 盤の中身（--step の計算）に使える高さ。
    const avail = wrap.clientHeight - padTop - padBottom - 32;
    // 極端に低いビューポート等で 0 以下になった場合は書き換えず、
    // CSS 側のフォールバック値（60vh）に任せる。盤が消えるのを防ぐ。
    if (avail > 0) this.root.style.setProperty('--avail-h', `${avail}px`);
  }

  private place(el: HTMLElement, r: number, c: number): void {
    el.style.setProperty('--r', String(r));
    el.style.setProperty('--c', String(c));
  }

  /** 1 マスの実ピクセルサイズ。--step は viewport 単位を含む calc() なので、
   * カスタムプロパティの文字列をパースせず実測する。
   * `this.root`（.board）は box-sizing: border-box のもとで
   * `width: calc(var(--step) * var(--cols) + 32px)` なので、root 自身の
   * 幅には盤の padding 32px が含まれてしまい、割ると 1 マスあたり
   * `32px / cols` 分だけ過大評価してしまう（歩行アニメがタイルの位置から
   * ずれてスナップする欠陥だった）。.tile-layer は `inset: 16px` で
   * ちょうど中身の幅と一致するので、そちらを測る。padding 分を
   * ハードコードして引く形にすると CSS 側の padding が変わったときに
   * また同じ罠を踏むので避ける。 */
  private stepPx(): number {
    return this.tileLayer.getBoundingClientRect().width / this.width;
  }

  /** 猫の表情と向き。ゲーム画面が状態の変化に合わせて呼ぶ。 */
  get catSprite(): CatSprite {
    return this.cat;
  }

  /** 猫を CSS トランジションなしで即座に配置する／通常のトランジションに戻す。 */
  setCatAnimated(on: boolean): void {
    this.catEl.style.transition = on ? '' : 'none';
  }

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

    // jsdom など Web Animations API のない環境では即座に最終位置へ（place() 済み）。
    if (typeof this.catEl.animate !== 'function') return Promise.resolve();

    const step = this.stepPx();
    const hop = this.reduceMotion ? 0 : step * BoardView.HOP;
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

  /** 経路アニメーションの途中で歩行が中断された（undo/やりなおし等）ときに呼ぶ。 */
  cancelCatAnimation(): void {
    if (typeof this.catEl.getAnimations === 'function') {
      for (const a of this.catEl.getAnimations()) a.cancel();
    }
    this.setCatAnimated(true);
  }

  render(state: GameState, opts: RenderOpts): void {
    const b = state.board;
    const slid = new Set(opts.slidable.map((p) => idx(b, p.r, p.c)));
    const hintKey = opts.hint ? idx(b, opts.hint.r, opts.hint.c) : -1;

    // 背景セル（穴・到達領域）の更新
    for (const cell of Array.from(this.gridLayer.children) as HTMLElement[]) {
      const r = Number(cell.dataset['r']);
      const c = Number(cell.dataset['c']);
      const k = idx(b, r, c);
      cell.classList.toggle('hole', b.cells[k] == null);
    }

    const seen = new Set<number>();
    const moved: [HTMLElement, number, number][] = [];

    for (let r = 0; r < b.height; r++) {
      for (let c = 0; c < b.width; c++) {
        const tile = b.cells[idx(b, r, c)];
        if (!tile) continue;
        seen.add(tile.id);
        let el = this.tiles.get(tile.id);
        if (!el) {
          el = createTileEl(tile);
          el.dataset['r'] = String(r);
          el.dataset['c'] = String(c);
          this.place(el, r, c);
          this.tileLayer.appendChild(el);
          this.tiles.set(tile.id, el);
        } else {
          // 見た目が変わった箇所だけ更新する（conn の変化、魚の付け外しなど）。
          updateTileEl(el, tile);
        }
        el.dataset['r'] = String(r);
        el.dataset['c'] = String(c);
        el.classList.toggle('slidable', slid.has(idx(b, r, c)));
        el.classList.toggle('reachable', opts.reachable.has(idx(b, r, c)));
        el.classList.toggle('hinted', idx(b, r, c) === hintKey);
        // クリアしたら家が跳ねる。猫の cat-hop と揃えて、同じ瞬間に弾ませる。
        el.classList.toggle('cleared', state.cleared && tile.kind === 'goal');
        if (el.style.getPropertyValue('--r') !== String(r) ||
            el.style.getPropertyValue('--c') !== String(c)) {
          moved.push([el, r, c]);
        }
      }
    }

    for (const [id, el] of this.tiles) {
      if (seen.has(id)) continue;
      el.remove();
      this.tiles.delete(id);
    }

    const applyPositions = (): void => {
      for (const [el, r, c] of moved) this.place(el, r, c);
      this.place(this.catEl, state.cat.r, state.cat.c);
    };

    if (this.first) {
      // 初回はアニメーションさせない
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

    this.catEl.classList.toggle('cleared', state.cleared);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.cat.destroy();
    this.tiles.clear();
    this.root.innerHTML = '';
  }
}
