// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { play, isMuted, setMuted, buzz } from '../../src/ui/sfx.ts';

beforeEach(() => {
  localStorage.clear();
  setMuted(false);
});

describe('効果音', () => {
  it('AudioContext が無い環境でも落ちない', () => {
    expect(() => play('walk')).not.toThrow();
    expect(() => play('clear')).not.toThrow();
  });

  it('はじめは消音でない', () => {
    expect(isMuted()).toBe(false);
  });

  it('消音の設定が localStorage に残る', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem('cat-maze:muted')).toBe('1');
    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('vibrate が無い環境でも落ちない', () => {
    expect(() => buzz(10)).not.toThrow();
  });

  it('消音中は vibrate も呼ばない', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    setMuted(true);
    buzz(10);
    expect(vibrate).not.toHaveBeenCalled();
    setMuted(false);
    buzz(10);
    expect(vibrate).toHaveBeenCalledWith(10);
  });
});
