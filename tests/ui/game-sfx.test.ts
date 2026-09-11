// @vitest-environment jsdom
//
// 効果音の「繋ぎ」だけを確かめるテスト。GameSession はイベントを発火しない
// 純粋な状態遷移なので、screens/game.ts が前後の状態を比べて鳴らしている
// ことを、sfx モジュールをモックして呼び出しの有無で確認する。
// isMuted / setMuted は実装のまま使い、localStorage 連携ごと確かめる。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderGameScreen } from '../../src/ui/screens/game.ts';
import { play, buzz } from '../../src/ui/sfx.ts';
import { ProgressStore, mapKV } from '../../src/ui/storage.ts';
import type { Route } from '../../src/ui/router.ts';

vi.mock('../../src/ui/sfx.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ui/sfx.ts')>();
  return { ...actual, play: vi.fn(), buzz: vi.fn() };
});

let store: ProgressStore;
let root: HTMLElement;
let cleanup: () => void;
const go = (_r: Route): void => {};

beforeEach(() => {
  store = new ProgressStore(mapKV(new Map()));
  root = document.createElement('div');
  document.body.append(root);
  vi.clearAllMocks();
  localStorage.clear();
});

function open(levelId: string): void {
  cleanup = renderGameScreen(root, levelId, { store, go });
}

const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
const key = (k: string): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
};
const tile = (r: number, c: number): HTMLElement =>
  root.querySelector<HTMLElement>(`.tile-layer [data-r="${r}"][data-c="${c}"]`)!;

function pointerEvent(type: string, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientX', { value: x });
  Object.defineProperty(ev, 'clientY', { value: y });
  Object.defineProperty(ev, 'isPrimary', { value: true });
  return ev;
}

function tap(el: HTMLElement): void {
  el.dispatchEvent(pointerEvent('pointerdown', 100, 100));
  el.dispatchEvent(pointerEvent('pointerup', 101, 100));
}

function swipe(el: HTMLElement): void {
  el.dispatchEvent(pointerEvent('pointerdown', 100, 100));
  el.dispatchEvent(pointerEvent('pointerup', 160, 104));
}

const tapCell = (r: number, c: number): void => tap(tile(r, c));
const swipeCell = (r: number, c: number): void => swipe(tile(r, c));
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('効果音の繋ぎ', () => {
  it('スライドすると slide 音と 10ms の振動', () => {
    open('W1-1');
    swipeCell(1, 0);
    expect(play).toHaveBeenCalledWith('slide');
    expect(buzz).toHaveBeenCalledWith(10);
    cleanup();
  });

  it('歩行だけでは slide 音は鳴らない', () => {
    open('W1-1');
    swipeCell(1, 0);
    vi.clearAllMocks();
    key('ArrowRight'); // 歩行のみ。手数は増えない
    expect(play).not.toHaveBeenCalledWith('slide');
    cleanup();
  });

  it('行けないマスをタップすると blocked 音と 20ms の振動', async () => {
    open('W1-1');
    tapCell(3, 3); // W1-1 の (3,3) は猫から到達できない
    await flush();
    expect(play).toHaveBeenCalledWith('blocked');
    expect(buzz).toHaveBeenCalledWith(20);
    cleanup();
  });

  it('魚を取ると fish 音が鳴る', async () => {
    // W3-4 は catStart (2,2) から南へ 1 歩で魚 (3,2) に直接乗れる。
    open('W3-4');
    tapCell(3, 2);
    await flush();
    expect(play).toHaveBeenCalledWith('fish');
    cleanup();
  });

  it('クリアすると clear 音と振動パターン', async () => {
    open('W1-1');
    // W1-1 はヒントの示すタイルをスライドしてからゴールへ歩けば 1 手でクリア。
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    const r = Number(hinted.dataset['r']);
    const c = Number(hinted.dataset['c']);
    swipeCell(r, c);
    const goal = root.querySelector<HTMLElement>('.tile-layer .tile[data-kind="goal"]')!;
    tapCell(Number(goal.dataset['r']), Number(goal.dataset['c']));
    await flush();
    expect(play).toHaveBeenCalledWith('clear');
    expect(buzz).toHaveBeenCalledWith([40, 60, 40]);
    cleanup();
  });

  it('歩行は 1 マスごとに walk 音を刻む', async () => {
    vi.useFakeTimers();
    try {
      // W3-1: 猫(2,2)から(3,3)へは 2 歩（(3,2) を経由）。
      open('W3-1');
      tapCell(3, 3);
      await vi.advanceTimersByTimeAsync(0);
      expect(play).toHaveBeenCalledWith('walk');
      const afterFirst = vi.mocked(play).mock.calls.filter((c) => c[0] === 'walk').length;
      expect(afterFirst).toBe(1);
      await vi.advanceTimersByTimeAsync(120);
      const afterSecond = vi.mocked(play).mock.calls.filter((c) => c[0] === 'walk').length;
      expect(afterSecond).toBe(2);
      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('後始末すると、残っている歩行音のタイマーは鳴らない', async () => {
    vi.useFakeTimers();
    try {
      open('W3-1');
      tapCell(3, 3); // 2 歩の歩行。walk 音のタイマーは 0ms と 120ms に積まれる
      await vi.advanceTimersByTimeAsync(0); // 0ms の分だけ鳴らす
      const before = vi.mocked(play).mock.calls.filter((c) => c[0] === 'walk').length;
      cleanup(); // 120ms 分が鳴る前に画面を離れる
      vi.advanceTimersByTime(1000);
      const after = vi.mocked(play).mock.calls.filter((c) => c[0] === 'walk').length;
      expect(after).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('消音トグル', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('クリックのたびにアイコンと保存状態が切り替わる', () => {
    open('W1-1');
    const muteBtn = q<HTMLButtonElement>('.mute-btn');
    expect(muteBtn.textContent).toBe('🔊');
    expect(muteBtn.getAttribute('aria-pressed')).toBe('false');
    muteBtn.click();
    expect(muteBtn.textContent).toBe('🔇');
    expect(muteBtn.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('cat-maze:muted')).toBe('1');
    muteBtn.click();
    expect(muteBtn.textContent).toBe('🔊');
    expect(localStorage.getItem('cat-maze:muted')).toBeNull();
    cleanup();
  });
});
