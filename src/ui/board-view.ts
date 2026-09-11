// タイルを使い回して requestAnimationFrame を二段に重ね、
// 「前の位置で描いてから次フレームで位置を変える」ことで CSS トランジションを起こす方式は
// 2048 の js/html_actuator.js を元にしている。
// 背景セル層と絶対配置タイル層を重ねる DOM 構造も同じ考え方。
// Copyright (c) 2014 Gabriele Cirulli — MIT License
// https://github.com/gabrielecirulli/2048
import { idx } from '../core/board.ts';
import type { Board, GameState, Pos } from '../core/types.ts';
import { CatSprite } from './cat-sprite.ts';
import { tileSvg } from './tile-svg.ts';

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
  private clickCb: ((p: Pos) => void) | null = null;
  private width: number;
  private height: number;
  private first = true;

  constructor(root: HTMLElement, board: Board) {
    this.root = root;
    this.width = board.width;
    this.height = board.height;

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

    root.addEventListener('click', this.onClick);
  }

  private onClick = (ev: Event): void => {
    if (!this.clickCb) return;
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-r]');
    if (!el) return;
    this.clickCb({ r: Number(el.dataset['r']), c: Number(el.dataset['c']) });
  };

  onCellClick(cb: (p: Pos) => void): void {
    this.clickCb = cb;
  }

  private place(el: HTMLElement, r: number, c: number): void {
    el.style.setProperty('--r', String(r));
    el.style.setProperty('--c', String(c));
  }

  /** 1 マスの実ピクセルサイズ。--step は viewport 単位を含む calc() なので、
   * カスタムプロパティの文字列をパースせず実測する。 */
  private stepPx(): number {
    return this.root.getBoundingClientRect().width / this.width;
  }

  /** 猫の表情と向き。ゲーム画面が状態の変化に合わせて呼ぶ。 */
  get catSprite(): CatSprite {
    return this.cat;
  }

  /** 猫を CSS トランジションなしで即座に配置する／通常のトランジションに戻す。 */
  setCatAnimated(on: boolean): void {
    this.catEl.style.transition = on ? '' : 'none';
  }

  /**
   * 経路（始点を含む）に沿って猫を 1 本の連続したアニメーションで動かす。
   * 区間ごとに transition を打ち直す方式だと、境界で減速→再加速して
   * 止まって見えてしまうため、Web Animations API で経路全体を
   * 一定速度のキーフレームとして一度に再生する。
   */
  walkCatThrough(path: Pos[], stepMs: number): Promise<void> {
    // jsdom など Web Animations API のない環境では即座に最終位置へ（place() 済み）。
    if (path.length < 2 || typeof this.catEl.animate !== 'function') return Promise.resolve();
    const step = this.stepPx();
    const keyframes = path.map((p) => ({
      transform: `translate(${p.c * step}px, ${p.r * step}px)`,
    }));
    const anim = this.catEl.animate(keyframes, {
      duration: stepMs * (path.length - 1),
      easing: 'linear',
    });
    return anim.finished.then(
      () => anim.cancel(),
      () => {},
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
      cell.classList.toggle('reachable', opts.reachable.has(k));
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
          el = document.createElement('div');
          el.className = 'tile';
          el.dataset['r'] = String(r);
          el.dataset['c'] = String(c);
          this.place(el, r, c);
          this.tileLayer.appendChild(el);
          this.tiles.set(tile.id, el);
        }
        // 見た目（魚の有無など）は毎回作り直す。タイル数は多くないので十分速い。
        el.innerHTML = tileSvg(tile);
        el.dataset['r'] = String(r);
        el.dataset['c'] = String(c);
        el.classList.toggle('slidable', slid.has(idx(b, r, c)));
        el.classList.toggle('reachable', opts.reachable.has(idx(b, r, c)));
        el.classList.toggle('hinted', idx(b, r, c) === hintKey);
        moved.push([el, r, c]);
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
    } else {
      // 一度前の位置のまま描かせてから次フレームで動かす（これでトランジションが走る）
      requestAnimationFrame(applyPositions);
    }

    this.catEl.classList.toggle('cleared', state.cleared);
  }

  destroy(): void {
    this.cat.destroy();
    this.root.removeEventListener('click', this.onClick);
    this.clickCb = null;
    this.tiles.clear();
    this.root.innerHTML = '';
  }
}
