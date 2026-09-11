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

  // レビュー指摘（Minor）: tone() が audio()（AudioContext の遅延生成）を muted の
  // チェックより先に呼んでいたため、消音中でも最初の操作で AudioContext・
  // GainNode・BiquadFilterNode を作って resume() まで走ってしまっていた欠陥の
  // 回帰テスト。iOS は同時に持てる AudioContext 数に上限があるので、消音中は
  // 生成そのものを避けたい。このテストの最後に AudioContext をこの
  // モジュール内で生成させるため、他のテストへの影響を避けてファイル末尾に置く。
  it('消音中は AudioContext を作らない', () => {
    const ctorSpy = vi.fn().mockImplementation(function (this: AudioContext) {
      // connect() が常に自分自身を返す、どこまでも繋げられるダミーノード。
      const chainable: Record<string, unknown> = {};
      chainable['connect'] = () => chainable;
      const param = (): unknown => ({
        value: 0,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      });
      Object.assign(this, {
        createGain: () => ({ ...chainable, gain: param() }),
        createBiquadFilter: () => ({ ...chainable, type: '', frequency: param() }),
        createOscillator: () => ({
          ...chainable,
          type: '',
          frequency: param(),
          start: () => {},
          stop: () => {},
        }),
        currentTime: 0,
        state: 'suspended',
        resume: vi.fn(),
        destination: {},
      });
    });
    vi.stubGlobal('AudioContext', ctorSpy);
    try {
      setMuted(true);
      play('walk');
      expect(ctorSpy).not.toHaveBeenCalled();

      setMuted(false);
      play('walk');
      expect(ctorSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      setMuted(false);
    }
  });
});
