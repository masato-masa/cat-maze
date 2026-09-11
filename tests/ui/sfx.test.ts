// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { play, buzz } from '../../src/ui/sfx.ts';

describe('効果音', () => {
  it('AudioContext が無い環境でも落ちない', () => {
    expect(() => play('walk')).not.toThrow();
    expect(() => play('clear')).not.toThrow();
  });

  it('vibrate が無い環境でも落ちない', () => {
    expect(() => buzz(10)).not.toThrow();
  });

  it('vibrate があれば渡したパターンで呼ぶ', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    buzz(10);
    expect(vibrate).toHaveBeenCalledWith(10);
  });
});
