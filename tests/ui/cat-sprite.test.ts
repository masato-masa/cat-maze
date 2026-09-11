// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CatSprite, catSvg } from '../../src/ui/cat-sprite.ts';

let cat: CatSprite | null = null;
afterEach(() => {
  cat?.destroy();
  cat = null;
  vi.useRealTimers();
});

const src = (c: CatSprite): string => c.el.querySelector('img')!.getAttribute('src')!;

describe('CatSprite', () => {
  it('はじめは普通の顔', () => {
    cat = new CatSprite();
    expect(src(cat)).toContain('normal');
  });

  it('表情を切り替えられる', () => {
    cat = new CatSprite();
    cat.setMood('happy');
    expect(src(cat)).toContain('happy');
    cat.setMood('sad');
    expect(src(cat)).toContain('sad');
  });

  it('時間を指定すると、その時間だけ切り替えて戻る', () => {
    vi.useFakeTimers();
    cat = new CatSprite();
    cat.setMood('happy', 700);
    expect(src(cat)).toContain('happy');
    vi.advanceTimersByTime(700);
    expect(src(cat)).toContain('normal');
  });

  it('待機中はまばたきする', () => {
    vi.useFakeTimers();
    cat = new CatSprite();
    vi.advanceTimersByTime(10_000);
    // サンプリング間隔（100ms）をまばたきが閉じている時間（130ms）より短くする。
    // こうすると間隔がランダムでも、130ms の閉じ窓は必ずどこかのサンプル点を含む
    // （鳩の巣原理）。200ms 間隔だと窓の位置次第で一度も捕まえられず、
    // 実際に数割の確率で失敗するテストになっていた。
    const seen: string[] = [];
    for (let i = 0; i < 90; i++) {
      seen.push(src(cat));
      vi.advanceTimersByTime(100);
    }
    expect(seen.some((s) => s.includes('blink'))).toBe(true);
  });

  it('普通の顔以外のときはまばたきしない', () => {
    vi.useFakeTimers();
    cat = new CatSprite();
    cat.setMood('happy');
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push(src(cat));
      vi.advanceTimersByTime(200);
    }
    expect(seen.every((s) => s.includes('happy'))).toBe(true);
  });

  it('西を向くと左右が反転する', () => {
    cat = new CatSprite();
    cat.faceWest(true);
    expect(cat.el.style.getPropertyValue('--flip')).toBe('-1');
    cat.faceWest(false);
    expect(cat.el.style.getPropertyValue('--flip')).toBe('1');
  });

  it('destroy 後はまばたきのタイマーが動かない', () => {
    vi.useFakeTimers();
    const c = new CatSprite();
    c.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('タイトル画面用に 1 枚絵を返す', () => {
    expect(catSvg()).toContain('cat-img');
    expect(catSvg()).toContain('normal');
  });
});
