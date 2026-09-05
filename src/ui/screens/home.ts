import { ALL_LEVELS } from '../../levels/index.ts';
import { catSvg } from '../tile-svg.ts';
import type { ScreenDeps } from './game.ts';

/** タイトル画面。「つづきから」を主ボタンにする。 */
export function renderHomeScreen(root: HTMLElement, deps: ScreenDeps): () => void {
  const { store } = deps;
  const total = store.totalStars();
  const resumeId = store.firstUnclearedId();
  const started = total > 0;

  root.innerHTML = `
    <div class="screen home-screen">
      <div class="home-art">${catSvg()}</div>
      <h1 class="home-title">ねこめいろ</h1>
      <p class="home-sub">みちを うごかして おうちへ かえろう</p>
      <div class="home-buttons">
        <button class="btn primary big resume-btn" type="button">
          ${started ? 'つづきから' : 'はじめる'}
        </button>
        <button class="btn big select-btn" type="button">ステージを えらぶ</button>
      </div>
      <p class="home-stars">★ ${total} / ${ALL_LEVELS.length * 3}</p>
      <button class="btn ghost small reset-btn" type="button"${started ? '' : ' hidden'}>
        きろくを けす
      </button>
    </div>`;

  const onClick = (ev: Event): void => {
    const t = ev.target as HTMLElement;
    if (t.closest('.resume-btn')) deps.go({ screen: 'play', levelId: resumeId });
    else if (t.closest('.select-btn')) deps.go({ screen: 'select' });
    else if (t.closest('.reset-btn')) {
      if (window.confirm('きろくを ぜんぶ けしますか？')) {
        store.clear();
        deps.go({ screen: 'home' });
        renderHomeScreen(root, deps);
      }
    }
  };
  root.addEventListener('click', onClick);

  return () => root.removeEventListener('click', onClick);
}
