// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSelectScreen } from '../../src/ui/screens/select.ts';
import { renderHomeScreen } from '../../src/ui/screens/home.ts';
import { ProgressStore, mapKV } from '../../src/ui/storage.ts';
import { ALL_LEVELS, WORLDS } from '../../src/levels/index.ts';
import type { Route } from '../../src/ui/router.ts';

let store: ProgressStore;
let root: HTMLElement;
let went: Route | null;
const go = (r: Route): void => {
  went = r;
};

beforeEach(() => {
  store = new ProgressStore(mapKV(new Map()));
  root = document.createElement('div');
  went = null;
});

describe('ステージ選択画面', () => {
  it('全ワールドと全ステージのカードを描く', () => {
    renderSelectScreen(root, { store, go });
    expect(root.querySelectorAll('.world')).toHaveLength(WORLDS.length);
    expect(root.querySelectorAll('.level-card')).toHaveLength(ALL_LEVELS.length);
  });

  it('最初は 1 つ目だけ解放されている', () => {
    renderSelectScreen(root, { store, go });
    const cards = root.querySelectorAll('.level-card');
    expect(cards[0]!.classList.contains('locked')).toBe(false);
    expect(cards[1]!.classList.contains('locked')).toBe(true);
  });

  it('クリア済みのステージは星が点灯する', () => {
    store.record('W1-1', 2, 4);
    renderSelectScreen(root, { store, go });
    expect(root.querySelector('.level-card')!.querySelectorAll('.star.on')).toHaveLength(2);
  });

  it('★3 のカードには perfect が付く', () => {
    store.record('W1-1', 3, 1);
    renderSelectScreen(root, { store, go });
    expect(root.querySelector('.level-card')!.classList.contains('perfect')).toBe(true);
  });

  it('解放済みのカードを押すとそのステージへ行く', () => {
    renderSelectScreen(root, { store, go });
    (root.querySelector('.level-card') as HTMLElement).click();
    expect(went).toEqual({ screen: 'play', levelId: 'W1-1' });
  });

  it('未解放のカードを押しても遷移しない', () => {
    renderSelectScreen(root, { store, go });
    (root.querySelectorAll('.level-card')[1] as HTMLElement).click();
    expect(went).toBeNull();
  });

  it('もどるでホームへ行く', () => {
    renderSelectScreen(root, { store, go });
    (root.querySelector('.back-btn') as HTMLElement).click();
    expect(went).toEqual({ screen: 'home' });
  });

  it('後始末するとクリックを受け付けなくなる', () => {
    const cleanup = renderSelectScreen(root, { store, go });
    cleanup();
    (root.querySelector('.level-card') as HTMLElement).click();
    expect(went).toBeNull();
  });
});

describe('ホーム画面', () => {
  it('進捗が無ければ「はじめる」', () => {
    renderHomeScreen(root, { store, go });
    expect(root.querySelector('.resume-btn')!.textContent!.trim()).toBe('はじめる');
    expect(root.querySelector<HTMLElement>('.reset-btn')!.hidden).toBe(true);
  });

  it('進捗があれば「つづきから」で続きのステージへ行く', () => {
    store.record('W1-1', 3, 1);
    renderHomeScreen(root, { store, go });
    expect(root.querySelector('.resume-btn')!.textContent!.trim()).toBe('つづきから');
    (root.querySelector('.resume-btn') as HTMLElement).click();
    expect(went).toEqual({ screen: 'play', levelId: 'W1-2' });
  });

  it('総獲得星数を出す', () => {
    store.record('W1-1', 3, 1);
    store.record('W1-2', 2, 3);
    renderHomeScreen(root, { store, go });
    expect(root.querySelector('.home-stars')!.textContent).toContain(`5 / ${ALL_LEVELS.length * 3}`);
  });

  it('きろくを けす は確認してから消す', () => {
    store.record('W1-1', 3, 1);
    renderHomeScreen(root, { store, go });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    (root.querySelector('.reset-btn') as HTMLElement).click();
    expect(store.totalStars()).toBe(3);
    confirmSpy.mockReturnValue(true);
    (root.querySelector('.reset-btn') as HTMLElement).click();
    expect(store.totalStars()).toBe(0);
    confirmSpy.mockRestore();
  });
});
