import { ALL_LEVELS } from '../../levels/index.ts';
import { DAILY_UNLOCK_AFTER, dailyId } from '../../levels/daily.ts';
import { endlessId } from '../../levels/endless.ts';
import { catSvg } from '../cat-sprite.ts';
import { iconGear } from '../icons.ts';
import { openDevSheet, openSettingsSheet } from '../sheets.ts';
import type { ScreenDeps } from './game.ts';

/**
 * タイトル画面。「つづきから」を主ボタンにする。
 *
 * 「あそびかた」はここに置かない（? はプレイ画面の右上に集約した）。
 * 「きろくをけす」も本番の導線からは外し、右下の「テスト用」の中へ移した。
 */
export function renderHomeScreen(root: HTMLElement, deps: ScreenDeps): () => void {
  const { store } = deps;

  const draw = (): void => {
    const total = store.totalStars();
    const started = total > 0;
    const today = dailyId();
    const dailyOpen = store.isCleared(DAILY_UNLOCK_AFTER);
    const dailyDone = store.isCleared(today);
    const days = store.dailyDays();
    const best = store.endlessBest();
    const endlessNote = !dailyOpen
      ? 'ステージ 12 まで すすむと あそべる'
      : best > 0
        ? `${best} めんまで クリア`
        : 'めいろが どこまでも つづく';
    const dailyNote = !dailyOpen
      ? 'ステージ 12 まで すすむと あそべる'
      : dailyDone
        ? `きょうは クリア! ${'★'.repeat(store.getStars(today))}`
        : 'まいにち ちがう めいろが でるよ';

    root.innerHTML = `
      <div class="app app-home home-screen">
        <div class="home-top">
          <button class="icon-btn settings-btn" type="button" aria-label="設定">${iconGear()}</button>
        </div>

        <div class="home">
          <div class="home-art">${catSvg()}</div>
          <h1 class="home-title">ねこめいろ</h1>
          <p class="home-sub">みちを うごかして おうちへ かえろう</p>

          <div class="home-buttons">
            <button class="home-btn primary resume-btn" type="button">
              ${started ? 'つづきから' : 'はじめる'}
            </button>
            <button class="home-btn select-btn" type="button">ステージを えらぶ</button>
            <button class="home-btn daily-btn${dailyDone ? ' done' : ''}" type="button"${dailyOpen ? '' : ' disabled'}>
              きょうの めいろ
              <span class="home-btn-sub">${dailyNote}</span>
            </button>
            <button class="home-btn daily-btn endless-btn" type="button"${dailyOpen ? '' : ' disabled'}>
              むげん
              <span class="home-btn-sub">${endlessNote}</span>
            </button>
          </div>

          <p class="home-progress">★ ${total} / ${ALL_LEVELS.length * 3}${days > 0 ? ` ・ きょうの めいろ ${days} 日` : ''}</p>
        </div>

        <button class="dev-pill" type="button">テスト用</button>
      </div>`;
  };

  draw();

  // 描き直しは innerHTML の差し替えだけ。listener は root 自身に付いているので
  // 付け直さない（付け直すと二重に発火する）。
  const onClick = (ev: Event): void => {
    const t = ev.target as HTMLElement;
    if (t.closest('.resume-btn')) deps.go({ screen: 'play', levelId: store.firstUnclearedId() });
    else if (t.closest('.select-btn')) deps.go({ screen: 'select' });
    else if (t.closest('.endless-btn:not([disabled])')) deps.go({ screen: 'play', levelId: endlessId(store.endlessBest() + 1) });
    else if (t.closest('.daily-btn:not([disabled])')) deps.go({ screen: 'play', levelId: dailyId() });
    else if (t.closest('.settings-btn')) openSettingsSheet();
    else if (t.closest('.dev-pill')) openDevSheet({ store, refresh: draw });
  };
  root.addEventListener('click', onClick);

  return () => root.removeEventListener('click', onClick);
}
