// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InputManager } from '../../src/ui/input.ts';

let im: InputManager | null = null;
afterEach(() => {
  im?.destroy();
  im = null;
});

function press(key: string, mods: Partial<KeyboardEventInit> = {}): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...mods }));
}

describe('InputManager', () => {
  it('矢印キーを方向に変換する', () => {
    im = new InputManager(document);
    const cb = vi.fn();
    im.on('walk', cb);
    press('ArrowUp');
    press('ArrowRight');
    press('ArrowDown');
    press('ArrowLeft');
    expect(cb.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, 3]);
  });

  it('WASD と hjkl も使える', () => {
    im = new InputManager(document);
    const cb = vi.fn();
    im.on('walk', cb);
    press('a');
    press('j');
    expect(cb.mock.calls.map((c) => c[0])).toEqual([3, 2]);
  });

  it('修飾キーが押されていたら無視する', () => {
    im = new InputManager(document);
    const cb = vi.fn();
    im.on('walk', cb);
    press('ArrowUp', { ctrlKey: true });
    press('ArrowUp', { metaKey: true });
    expect(cb).not.toHaveBeenCalled();
  });

  it('u/z は undo、r は restart、Escape は back を発火する', () => {
    im = new InputManager(document);
    const undo = vi.fn();
    const restart = vi.fn();
    const back = vi.fn();
    im.on('undo', undo);
    im.on('restart', restart);
    im.on('back', back);
    press('u');
    press('z');
    press('r');
    press('Escape');
    expect(undo).toHaveBeenCalledTimes(2);
    expect(restart).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('知らないキーは何も起こさない', () => {
    im = new InputManager(document);
    const cb = vi.fn();
    im.on('walk', cb);
    im.on('undo', cb);
    press('q');
    expect(cb).not.toHaveBeenCalled();
  });

  it('方向キーは既定動作を止める（ページのスクロールを防ぐ）', () => {
    im = new InputManager(document);
    im.on('walk', () => {});
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
    document.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('destroy 後はイベントを受け取らない', () => {
    const m = new InputManager(document);
    const cb = vi.fn();
    m.on('walk', cb);
    m.destroy();
    press('ArrowUp');
    expect(cb).not.toHaveBeenCalled();
  });
});
