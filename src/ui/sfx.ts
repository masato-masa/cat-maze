// 効果音と BGM。
//
// 効果音は録音（ElevenLabs で生成した音。src/assets/sfx/<名前>.wav）を鳴らす。
// 録音がまだ読み込めていない・無い音だけ、WebAudio の合成音で代わりに鳴らす。
// 鳴らすたびに音程と音量を少しずらして、同じ音が続いても機械的に聞こえないようにする。
//
// BGM は Suno で作った曲（src/assets/bgm/main.mp3）を <audio> でループする。
// 入切は設定シートから「効果音」「BGM」を別々に切り替え、次に開いたときも残す。

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmBus: GainNode | null = null;

const MUTE_KEY = 'catmaze_muted';
const BGM_KEY = 'catmaze_bgm';

function loadFlag(key: string, fallback: boolean): boolean {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    // プライベートモードなどで読めないことがある。音が鳴るだけなので既定に戻す。
    return fallback;
  }
}

function saveFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* 保存できなくても、その場の入切は効いている */
  }
}

// ?mute を付けて開いたときは、効果音も BGM も鳴らさない（確認用）。
const forceMute = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute');
let muted = forceMute || loadFlag(MUTE_KEY, false);
let bgmOn = !forceMute && loadFlag(BGM_KEY, true);

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  saveFlag(MUTE_KEY, value);
}

export function isBgmOn(): boolean {
  return bgmOn;
}

export function setBgmOn(value: boolean): void {
  bgmOn = value;
  saveFlag(BGM_KEY, value);
  if (value) startBgm();
  else stopBgm();
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
    bgmBus = ctx.createGain();
    bgmBus.gain.value = BGM_GAIN;
    bgmBus.connect(ctx.destination);
    loadSamples(ctx);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export type SfxName = 'walk' | 'slide' | 'blocked' | 'fish' | 'clear';

// ---- 録音 ----

const sampleUrls = import.meta.glob('../assets/sfx/*.wav', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const buffers = new Map<SfxName, AudioBuffer>();

/** 録音ごとの音量。録音はピーク 0.9 にそろえてあるので、役割に合わせて下げる。 */
const SAMPLE_GAIN: Record<SfxName, number> = {
  walk: 0.22,
  slide: 0.55,
  blocked: 0.4,
  fish: 0.6,
  clear: 0.7,
};

function loadSamples(ac: AudioContext): void {
  for (const [path, url] of Object.entries(sampleUrls)) {
    const m = /\/(\w+)\.wav$/.exec(path);
    if (!m) continue;
    const name = m[1] as SfxName;
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((d) => ac.decodeAudioData(d))
      .then((buf) => buffers.set(name, buf))
      .catch(() => {
        /* 読めなければ合成音のまま */
      });
  }
}

function playSample(ac: AudioContext, name: SfxName, rate: number): boolean {
  const buf = buffers.get(name);
  if (!buf || !master) return false;
  const src = ac.createBufferSource();
  src.buffer = buf;
  // 音程 ±5%・音量 ±10% ずらす。勝ちの音だけはそのまま。
  const jitter = name !== 'clear';
  src.playbackRate.value = rate * (jitter ? 1 + (Math.random() * 2 - 1) * 0.05 : 1);
  const g = ac.createGain();
  g.gain.value = SAMPLE_GAIN[name] * (jitter ? 1 + (Math.random() * 2 - 1) * 0.1 : 1);
  src.connect(g).connect(master);
  src.start();
  return true;
}

// ---- 合成音（録音が無いときの代わり） ----

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  /** 終端の周波数。指定するとその高さへ滑らかに動く。 */
  slideTo?: number;
}

function tone(ac: AudioContext, { freq, duration, type = 'sine', gain = 0.06, delay = 0, slideTo }: ToneOptions): void {
  if (!master) return;
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

function synth(ac: AudioContext, name: SfxName): void {
  switch (name) {
    case 'walk':
      tone(ac, { freq: 320, duration: 0.04, gain: 0.05 });
      break;
    case 'slide':
      tone(ac, { freq: 180, slideTo: 120, duration: 0.12, type: 'triangle', gain: 0.07 });
      break;
    case 'blocked':
      tone(ac, { freq: 110, duration: 0.03, type: 'square', gain: 0.04 });
      break;
    case 'fish':
      tone(ac, { freq: 660, duration: 0.08, gain: 0.06 });
      tone(ac, { freq: 880, duration: 0.08, gain: 0.06, delay: 0.06 });
      break;
    case 'clear':
      [523, 659, 784, 1047].forEach((freq, i) => {
        tone(ac, { freq, duration: 0.12, gain: 0.07, delay: i * 0.09 });
      });
      break;
  }
}

/** rate は再生速度（音の高さ）。星を 1 つずつ高くするときに使う。 */
export function play(name: SfxName, rate = 1): void {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  if (!playSample(ac, name, rate)) synth(ac, name);
}

/** 触覚。対応していない環境では何も起きない。 */
export function buzz(pattern: number | number[]): void {
  if (muted) return;
  navigator.vibrate?.(pattern);
}

// ---- BGM ----

/** BGM の音量。効果音の下で、盤面に集中できる小ささ（約 −20dB）。 */
const BGM_GAIN = 0.1;
const bgmUrl = Object.values(
  import.meta.glob('../assets/bgm/main.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)[0];
let bgmEl: HTMLAudioElement | null = null;
let bgmNode: MediaElementAudioSourceNode | null = null;
let retryArmed = false;

function bgmElement(): HTMLAudioElement | null {
  if (!bgmUrl || typeof Audio === 'undefined') return null;
  if (!bgmEl) {
    bgmEl = new Audio(bgmUrl);
    bgmEl.preload = 'auto';
    bgmEl.loop = true;
  }
  return bgmEl;
}

// ページを開いた時点から読み始める（再生は最初の操作のあと）。
if (typeof window !== 'undefined' && bgmOn) bgmElement();

/** BGM を流す。ブラウザが自動再生を止めたときは、最初の操作のあとに始め直す。 */
export function startBgm(): void {
  if (!bgmOn) return;
  const el = bgmElement();
  const ac = audio();
  if (!el || !ac || !bgmBus) return;
  if (!bgmNode) {
    bgmNode = ac.createMediaElementSource(el);
    bgmNode.connect(bgmBus);
  }
  bgmBus.gain.cancelScheduledValues(ac.currentTime);
  bgmBus.gain.setValueAtTime(0.0001, ac.currentTime);
  bgmBus.gain.exponentialRampToValueAtTime(BGM_GAIN, ac.currentTime + 1.2);
  if (!el.paused) return;
  void el.play().catch(() => armRetry());
}

export function stopBgm(): void {
  bgmEl?.pause();
}

function armRetry(): void {
  if (retryArmed) return;
  retryArmed = true;
  const events = ['pointerdown', 'keydown'];
  const go = (): void => {
    for (const ev of events) window.removeEventListener(ev, go, true);
    retryArmed = false;
    window.setTimeout(startBgm, 0);
  };
  for (const ev of events) window.addEventListener(ev, go, true);
}

// 別のタブやアプリに移ったら止め、戻ったら続きから流す。
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) bgmEl?.pause();
    else if (bgmOn && bgmNode) void bgmEl?.play().catch(() => armRetry());
  });
}
