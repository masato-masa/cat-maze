// 効果音。音声ファイルを持たず WebAudio で合成する。
// 読み込みゼロ・容量ゼロ・遅延ゼロ。にゃんどくの src/core/sfx.ts と同じ作法。
const MUTE_KEY = 'cat-maze:muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 4200;
    master.connect(soften).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** 終端の周波数。指定するとその高さへ滑らかに動く。 */
  slideTo?: number;
}

function tone({ freq, duration, type = 'sine', gain = 0.06, delay = 0, slideTo }: ToneOptions): void {
  const ac = audio();
  if (!ac || !master || muted) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export type SfxName = 'walk' | 'slide' | 'blocked' | 'fish' | 'clear';

export function play(name: SfxName): void {
  switch (name) {
    case 'walk':
      tone({ freq: 320, duration: 0.04, gain: 0.05 });
      break;
    case 'slide':
      tone({ freq: 180, slideTo: 120, duration: 0.12, type: 'triangle', gain: 0.07 });
      break;
    case 'blocked':
      tone({ freq: 110, duration: 0.03, type: 'square', gain: 0.04 });
      break;
    case 'fish':
      tone({ freq: 660, duration: 0.08, gain: 0.06 });
      tone({ freq: 880, duration: 0.08, gain: 0.06, delay: 0.06 });
      break;
    case 'clear':
      [523, 659, 784, 1047].forEach((freq, i) => {
        tone({ freq, duration: 0.12, gain: 0.07, delay: i * 0.09 });
      });
      break;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(on: boolean): void {
  muted = on;
  try {
    if (on) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    // プライベートブラウズなどで書けなくても、その回の設定は効く
  }
}

/** 触覚。対応していない環境では何も起きない。 */
export function buzz(pattern: number | number[]): void {
  if (muted) return;
  navigator.vibrate?.(pattern);
}
