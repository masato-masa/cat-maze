import { canSlide, slideTargets } from '../../core/slide.ts';
import { GameSession, reachableSet } from '../../core/game.ts';
import { starsFor } from '../../core/rules.ts';
import { idx } from '../../core/board.ts';
import { getLevel, nextLevelId, worldOf } from '../../levels/index.ts';
import { solveFrom } from '../../solver/search.ts';
import type { Dir } from '../../core/conn.ts';
import type { Pos } from '../../core/types.ts';
import { BoardView } from '../board-view.ts';
import { InputManager } from '../input.ts';
import type { Route } from '../router.ts';
import type { ProgressStore } from '../storage.ts';

export type ScreenDeps = { store: ProgressStore; go: (r: Route) => void };

const STAR = '★';
const NOSTAR = '☆';

export function renderGameScreen(
  root: HTMLElement,
  levelId: string,
  deps: ScreenDeps,
): () => void {
  const def = getLevel(levelId);
  if (!def) {
    root.innerHTML = '<p class="notice">そのステージは ありません</p>';
    return () => {};
  }

  const world = worldOf(levelId);
  const session = new GameSession(def);
  let hint: Pos | null = null;

  root.innerHTML = `
    <div class="screen game-screen">
      <header class="game-header">
        <button class="icon-btn back-btn" type="button" aria-label="もどる">‹</button>
        <div class="level-title">
          <span class="level-id">${world ? world.name : ''} ${def.id}</span>
          <span class="level-name">${def.name}</span>
        </div>
        <div class="move-counter">
          <span class="moves">0</span>
          <span class="moves-label">さいたん ${def.optimalMoves}</span>
        </div>
      </header>

      <p class="hint-line">${def.hint ?? ''}</p>

      <div class="board-wrap"><div class="board-root"></div></div>

      <div class="fish-line" hidden><span class="fish-count"></span></div>

      <footer class="game-footer">
        <button class="btn undo-btn" type="button">もどす</button>
        <button class="btn retry-btn" type="button">やりなおし</button>
        <button class="btn hint-btn" type="button">ヒント</button>
      </footer>

      <div class="game-message" hidden>
        <div class="message-card">
          <p class="message-title">クリア!</p>
          <div class="stars"></div>
          <p class="message-moves"></p>
          <div class="message-buttons">
            <button class="btn primary next-btn" type="button">つぎへ</button>
            <button class="btn again-btn" type="button">もういちど</button>
            <button class="btn select-btn" type="button">ステージせんたく</button>
          </div>
        </div>
      </div>
    </div>`;

  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const boardRoot = q('.board-root');
  const movesEl = q('.moves');
  const fishLine = q('.fish-line');
  const fishCount = q('.fish-count');
  const message = q('.game-message');
  const undoBtn = q<HTMLButtonElement>('.undo-btn');

  const view = new BoardView(boardRoot, session.current.board);
  const input = new InputManager(document);
  let recorded = false;

  function draw(): void {
    const s = session.current;
    view.render(s, {
      reachable: reachableSet(s),
      slidable: slideTargets(s.board),
      hint,
    });
    movesEl.textContent = String(s.moves);
    undoBtn.disabled = !session.canUndo;
    if (s.fishTotal > 0) {
      fishLine.hidden = false;
      fishCount.textContent = `さかな ${s.fishTaken} / ${s.fishTotal}`;
    } else {
      fishLine.hidden = true;
    }
    if (s.cleared && !recorded) {
      recorded = true;
      const stars = starsFor(def!, s.moves);
      deps.store.record(def!.id, stars, s.moves);
      showClear(stars, s.moves);
    }
  }

  function showClear(stars: 1 | 2 | 3, moves: number): void {
    const starsEl = q('.stars');
    starsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('span');
      el.className = i < stars ? 'star on' : 'star';
      el.textContent = i < stars ? STAR : NOSTAR;
      el.style.setProperty('--i', String(i));
      starsEl.appendChild(el);
    }
    q('.message-moves').textContent =
      stars === 3 ? `${moves} 手 — さいたん!` : `${moves} 手（さいたん ${def!.optimalMoves}）`;
    const next = nextLevelId(def!.id);
    q<HTMLButtonElement>('.next-btn').hidden = next === null;
    message.hidden = false;
  }

  function act(fn: () => void): void {
    hint = null;
    fn();
    draw();
  }

  view.onCellClick((p) => {
    if (!message.hidden) return;
    const s = session.current;
    // 入力の曖昧さは仕様書 §4.3 の順で解く:
    // 押せるタイルならスライド、そうでなく到達領域内なら歩行、それ以外は無視。
    if (canSlide(s.board, p)) act(() => session.slide(p));
    else if (reachableSet(s).has(idx(s.board, p.r, p.c))) act(() => session.walkTo(p));
  });

  input.on('walk', (d) => {
    if (!message.hidden || d === undefined) return;
    act(() => session.walk(d as Dir));
  });
  input.on('undo', () => {
    if (!message.hidden) return;
    act(() => session.undo());
  });
  input.on('restart', () => {
    recorded = false;
    message.hidden = true;
    act(() => session.reset());
  });
  input.on('back', () => deps.go({ screen: 'select' }));
  input.on('hint', () => showHint());
  input.bindSwipe(boardRoot);

  function showHint(): void {
    const sol = solveFrom(session.current, def!.optimalMoves + 3);
    hint = sol && sol.length > 0 ? sol[0]! : null;
    draw();
  }

  q('.back-btn').addEventListener('click', () => deps.go({ screen: 'select' }));
  undoBtn.addEventListener('click', () => {
    act(() => session.undo());
  });
  q('.retry-btn').addEventListener('click', () => {
    recorded = false;
    message.hidden = true;
    act(() => session.reset());
  });
  q('.hint-btn').addEventListener('click', () => showHint());
  q('.next-btn').addEventListener('click', () => {
    const next = nextLevelId(def!.id);
    if (next) deps.go({ screen: 'play', levelId: next });
  });
  q('.again-btn').addEventListener('click', () => {
    recorded = false;
    message.hidden = true;
    act(() => session.reset());
  });
  q('.select-btn').addEventListener('click', () => deps.go({ screen: 'select' }));

  draw();

  return () => {
    input.destroy();
    view.destroy();
  };
}
