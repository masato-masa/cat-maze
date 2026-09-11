import { ALL_LEVELS, WORLDS } from '../../levels/index.ts';
import { iconBack } from '../icons.ts';
import type { ScreenDeps } from './game.ts';

const STAR = '★';

/** ステージ選択。ワールドごとにカードを並べ、未解放は鍵で閉じる。 */
export function renderSelectScreen(root: HTMLElement, deps: ScreenDeps): () => void {
  const { store } = deps;

  const worlds = WORLDS.map((w) => {
    const max = w.levels.length * 3;
    const cards = w.levels
      .map((l) => {
        const unlocked = store.isUnlocked(l.id);
        const stars = store.getStars(l.id);
        const num = l.id.split('-')[1] ?? '';
        const starHtml = [0, 1, 2]
          .map((i) => `<span class="star${i < stars ? ' on' : ''}">${STAR}</span>`)
          .join('');
        return `
          <button class="level-card${unlocked ? '' : ' locked'}${stars === 3 ? ' perfect' : ''}"
                  type="button" data-level="${l.id}"${unlocked ? '' : ' aria-disabled="true"'}>
            <span class="level-num">${num}</span>
            <span class="level-label">${unlocked ? l.name : ''}</span>
            <span class="level-stars">${unlocked ? starHtml : '<span class="lock">🔒</span>'}</span>
          </button>`;
      })
      .join('');
    return `
      <section class="world">
        <h2 class="world-head">
          <span class="world-name">${w.id} ${w.name}</span>
          <span class="world-stars">${STAR} ${store.worldStars(w.id)} / ${max}</span>
        </h2>
        <div class="level-grid">${cards}</div>
      </section>`;
  }).join('');

  root.innerHTML = `
    <div class="app select-screen">
      <header class="header">
        <div class="header-row">
          <div class="header-left">
            <button class="icon-btn back-btn" type="button" aria-label="もどる">${iconBack()}</button>
          </div>
          <h1 class="title">ステージ</h1>
          <div class="header-actions"></div>
        </div>
        <div class="status-bar">
          <span class="stat">
            <span class="star on">${STAR}</span>
            <span class="stat-num">${store.totalStars()}</span>
            <span class="stat-slash">/</span>
            <span class="stat-num stat-total">${ALL_LEVELS.length * 3}</span>
          </span>
        </div>
      </header>
      <div class="worlds">${worlds}</div>
    </div>`;

  const onClick = (ev: Event): void => {
    const target = ev.target as HTMLElement;
    if (target.closest('.back-btn')) {
      deps.go({ screen: 'home' });
      return;
    }
    const card = target.closest<HTMLElement>('.level-card');
    if (!card || card.classList.contains('locked')) return;
    const id = card.dataset['level'];
    if (id) deps.go({ screen: 'play', levelId: id });
  };
  root.addEventListener('click', onClick);

  return () => root.removeEventListener('click', onClick);
}
