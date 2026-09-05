// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InputManager } from '../../src/ui/input.ts';

let im: InputManager | null = null;
afterEach(() => {
  im?.destroy();
  im = null;
});

/** jsdom には TouchEvent が無いので、必要なプロパティだけ持つイベントを作る。 */
function touch(type: string, points: { x: number; y: number }[], changed = points): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const list = points.map((p) => ({ clientX: p.x, clientY: p.y }));
  Object.defineProperty(ev, 'touches', { value: list });
  Object.defineProperty(ev, 'changedTouches', {
    value: changed.map((p) => ({ clientX: p.x, clientY: p.y })),
  });
  return ev;
}

function swipe(el: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }): void {
  el.dispatchEvent(touch('touchstart', [from]));
  el.dispatchEvent(touch('touchend', [], [to]));
}

function setup(): { board: HTMLElement; child: HTMLElement; walk: ReturnType<typeof vi.fn>; click: ReturnType<typeof vi.fn> } {
  const board = document.createElement('div');
  const child = document.createElement('div');
  board.append(child);
  document.body.append(board);
  const walk = vi.fn();
  const click = vi.fn();
  board.addEventListener('click', click);
  im = new InputManager(document);
  im.on('walk', walk);
  im.bindSwipe(board);
  return { board, child, walk, click };
}

describe('スワイプ', () => {
  it('横へ払うと東西へ歩く', () => {
    const { board, walk } = setup();
    swipe(board, { x: 100, y: 100 }, { x: 160, y: 104 });
    expect(walk).toHaveBeenCalledWith(1);
    swipe(board, { x: 160, y: 100 }, { x: 100, y: 104 });
    expect(walk).toHaveBeenLastCalledWith(3);
  });

  it('縦へ払うと南北へ歩く', () => {
    const { board, walk } = setup();
    swipe(board, { x: 100, y: 100 }, { x: 104, y: 160 });
    expect(walk).toHaveBeenCalledWith(2);
    swipe(board, { x: 100, y: 160 }, { x: 104, y: 100 });
    expect(walk).toHaveBeenLastCalledWith(0);
  });

  it('ほとんど動いていなければ歩かない（タップとして扱う）', () => {
    const { board, walk } = setup();
    swipe(board, { x: 100, y: 100 }, { x: 105, y: 103 });
    expect(walk).not.toHaveBeenCalled();
  });

  // スワイプのあとブラウザが click を出すことがある。
  // そのまま通すと「歩く」と「スライド」が二重に起きてしまう。
  it('スワイプ直後の click は握りつぶす', () => {
    const { child, walk, click } = setup();
    swipe(child, { x: 100, y: 100 }, { x: 160, y: 104 });
    expect(walk).toHaveBeenCalledWith(1);
    child.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(click).not.toHaveBeenCalled();
  });

  it('スワイプしていない普通のタップは通す', () => {
    const { child, walk, click } = setup();
    swipe(child, { x: 100, y: 100 }, { x: 102, y: 101 });
    expect(walk).not.toHaveBeenCalled();
    child.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(click).toHaveBeenCalledTimes(1);
  });
});
