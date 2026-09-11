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
