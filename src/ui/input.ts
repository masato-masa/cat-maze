// キーボードとスワイプの扱いは 2048 の js/keyboard_input_manager.js を元にしている。
// イベントエミッタ、キーから方向への写像、修飾キーを無視する判定が該当する。
// 2048 の方向は 0=Up 1=Right 2=Down 3=Left で、本作の Dir(0=N 1=E 2=S 3=W) と一致する。
// Copyright (c) 2014 Gabriele Cirulli — MIT License
// https://github.com/gabrielecirulli/2048
import type { Dir } from '../core/conn.ts';
import type { Pos } from '../core/types.ts';

export type InputEvent = 'walk' | 'tap' | 'slide' | 'undo' | 'restart' | 'back' | 'hint';

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

/**
 * タップとドラッグを分ける閾値（px）。指はまっすぐ動かないので、
 * 小さすぎるとタップがスライドに化ける。
 */
const DRAG_THRESHOLD = 7;

export class InputManager {
  private listeners = new Map<InputEvent, ((d?: Dir | Pos) => void)[]>();
  private target: EventTarget;
  private pointerEl: HTMLElement | null = null;
  private startX = 0;
  private startY = 0;
  private startPos: Pos | null = null;
  private down = false;

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

  destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown as EventListener);
    if (this.pointerEl) {
      this.pointerEl.removeEventListener('pointerdown', this.onPointerDown);
      this.pointerEl.removeEventListener('pointerup', this.onPointerUp);
      this.pointerEl.removeEventListener('pointercancel', this.onPointerCancel);
      this.pointerEl = null;
    }
    this.listeners.clear();
  }
}
