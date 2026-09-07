// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InputManager } from '../../src/ui/input.ts';

let im: InputManager | null = null;
afterEach(() => {
  im?.destroy();
  im = null;
});

/** jsdom には TouchEvent が無いので、必要なプロパティだけ持つイベントを作る。 */
function touch(type: string, points: { x: number; y: number; target?: EventTarget }[], changed = points): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const list = points.map((p) => ({ clientX: p.x, clientY: p.y, target: p.target ?? null }));
  Object.defineProperty(ev, 'touches', { value: list });
  Object.defineProperty(ev, 'changedTouches', {
    value: changed.map((p) => ({ clientX: p.x, clientY: p.y, target: p.target ?? null })),
  });
  return ev;
}

function swipe(
  el: HTMLElement,
  from: { x: number; y: number; target?: EventTarget },
  to: { x: number; y: number },
): void {
  el.dispatchEvent(touch('touchstart', [from]));
  el.dispatchEvent(touch('touchend', [], [to]));
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
  slide: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
} {
  const board = document.createElement('div');
  const child = cell(1, 2);
  board.append(child);
  document.body.append(board);
  const slide = vi.fn();
  const click = vi.fn();
  board.addEventListener('click', click);
  im = new InputManager(document);
  im.on('slide', slide);
  im.bindSwipe(board);
  return { board, child, slide, click };
}

describe('スワイプ', () => {
  it('指を下ろしたマスの位置でパネルを押す', () => {
    const { child, slide } = setup();
    swipe(child, { x: 100, y: 100, target: child }, { x: 160, y: 104 });
    expect(slide).toHaveBeenCalledWith({ r: 1, c: 2 });
  });

  it('向きに関わらず、押したマスが伝わる', () => {
    const { child, slide } = setup();
    swipe(child, { x: 100, y: 100, target: child }, { x: 104, y: 160 });
    expect(slide).toHaveBeenCalledWith({ r: 1, c: 2 });
  });

  it('ほとんど動いていなければ何もしない（タップとして扱う）', () => {
    const { child, slide } = setup();
    swipe(child, { x: 100, y: 100, target: child }, { x: 105, y: 103 });
    expect(slide).not.toHaveBeenCalled();
  });

  // スワイプのあとブラウザが click を出すことがある。
  // そのまま通すと「歩く」と「スライド」が二重に起きてしまう。
  it('スワイプ直後の click は握りつぶす', () => {
    const { child, slide, click } = setup();
    swipe(child, { x: 100, y: 100, target: child }, { x: 160, y: 104 });
    expect(slide).toHaveBeenCalledWith({ r: 1, c: 2 });
    child.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(click).not.toHaveBeenCalled();
  });

  it('スワイプしていない普通のタップは通す', () => {
    const { child, slide, click } = setup();
    swipe(child, { x: 100, y: 100, target: child }, { x: 102, y: 101 });
    expect(slide).not.toHaveBeenCalled();
    child.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(click).toHaveBeenCalledTimes(1);
  });
});
