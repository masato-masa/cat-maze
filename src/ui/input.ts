// キーボードとスワイプの扱いは 2048 の js/keyboard_input_manager.js を元にしている。
// イベントエミッタ、キーから方向への写像、修飾キーを無視する判定、
// touchstart で始点を記録し touchend の dx/dy から方向を決めるスワイプ判定が該当する。
// 2048 の方向は 0=Up 1=Right 2=Down 3=Left で、本作の Dir(0=N 1=E 2=S 3=W) と一致する。
// Copyright (c) 2014 Gabriele Cirulli — MIT License
// https://github.com/gabrielecirulli/2048
import type { Dir } from '../core/conn.ts';
import type { Pos } from '../core/types.ts';

export type InputEvent = 'walk' | 'slide' | 'undo' | 'restart' | 'back' | 'hint';

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3,
  w: 0,
  d: 1,
  s: 2,
  a: 3,
  k: 0,
  l: 1,
  j: 2,
  h: 3,
};

const KEY_ACTION: Record<string, InputEvent> = {
  u: 'undo',
  Backspace: 'undo',
  z: 'undo',
  r: 'restart',
  Escape: 'back',
  '?': 'hint',
};

/** スワイプと判定する最小移動量（px）。2048 と同じ 10px。 */
const SWIPE_THRESHOLD = 10;

export class InputManager {
  private listeners = new Map<InputEvent, ((d?: Dir | Pos) => void)[]>();
  private target: EventTarget;
  private swipeEl: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private startPos: Pos | null = null;
  /**
   * スワイプのあとにブラウザが click を出すことがある。
   * そのまま通すと「歩く」と「スライド」が二重に起きてしまうので、
   * 直後の 1 回だけ握りつぶす。次の touchstart で新しい操作が始まるため、
   * 時間ではなく回数で打ち切るほうが後続のタップを巻き込まない。
   */
  private swallowNextClick = false;

  constructor(target: EventTarget) {
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown as EventListener);
  }

  on(event: InputEvent, cb: (d?: Dir | Pos) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(cb);
    this.listeners.set(event, list);
  }

  private emit(event: InputEvent, d?: Dir | Pos): void {
    for (const cb of this.listeners.get(event) ?? []) cb(d);
  }

  private onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;

    const dir = KEY_DIR[ev.key];
    if (dir !== undefined) {
      ev.preventDefault();
      this.emit('walk', dir);
      return;
    }
    const action = KEY_ACTION[ev.key];
    if (action) {
      ev.preventDefault();
      this.emit(action);
    }
  };

  /** 盤面の上でのスワイプを歩行として扱う。 */
  bindSwipe(el: HTMLElement): void {
    this.swipeEl = el;
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchend', this.onTouchEnd, { passive: true });
    // タップ処理より先に見たいので捕捉フェーズで受ける
    el.addEventListener('click', this.onClickCapture, true);
  }

  private onClickCapture = (ev: Event): void => {
    if (!this.swallowNextClick) return;
    this.swallowNextClick = false;
    ev.stopPropagation();
    ev.preventDefault();
  };

  private onTouchStart = (ev: TouchEvent): void => {
    this.swallowNextClick = false; // 新しい操作の始まり
    if (ev.touches.length > 1) return;
    const t = ev.touches[0];
    if (!t) return;
    this.startX = t.clientX;
    this.startY = t.clientY;
    const el = (t.target as HTMLElement | null)?.closest<HTMLElement>('[data-r]') ?? null;
    this.startPos = el ? { r: Number(el.dataset['r']), c: Number(el.dataset['c']) } : null;
  };

  /**
   * スワイプはタイルを押す操作として扱う。押す向きは穴の位置から一意に決まるので、
   * スワイプ自体の向きは見ず、指を下ろしたマス（=押したいタイル）だけを渡す。
   */
  private onTouchEnd = (ev: TouchEvent): void => {
    if (ev.touches.length > 0) return;
    const t = ev.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - this.startX;
    const dy = t.clientY - this.startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= SWIPE_THRESHOLD) return; // タップはクリック側で処理する
    this.swallowNextClick = true;
    if (this.startPos) this.emit('slide', this.startPos);
  };

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    if (this.swipeEl) {
      this.swipeEl.removeEventListener('touchstart', this.onTouchStart as EventListener);
      this.swipeEl.removeEventListener('touchend', this.onTouchEnd as EventListener);
      this.swipeEl.removeEventListener('click', this.onClickCapture, true);
      this.swipeEl = null;
    }
    this.listeners.clear();
  }
}
