import { canSlide, slideTargets } from '../../core/slide.ts';
import { GameSession, canWalk, reachableSet, shortestPath } from '../../core/game.ts';
import { starsFor } from '../../core/rules.ts';
import { idx } from '../../core/board.ts';
import { getLevel, nextLevelId, worldOf } from '../../levels/index.ts';
import { solveFrom } from '../../solver/search.ts';
import { delta } from '../../core/conn.ts';
import type { Dir } from '../../core/conn.ts';
import type { Pos } from '../../core/types.ts';
import { BoardView } from '../board-view.ts';
import { CatSprite } from '../cat-sprite.ts';
import { InputManager } from '../input.ts';
import { iconBack, iconGear, iconHelp, iconHint, iconRetry, iconUndo } from '../icons.ts';
import { openHelpSheet, openSettingsSheet } from '../sheets.ts';
import { buzz, play } from '../sfx.ts';
import type { Route } from '../router.ts';
import type { ProgressStore } from '../storage.ts';

export type ScreenDeps = { store: ProgressStore; go: (r: Route) => void };

const STAR = '★';
const NOSTAR = '☆';

/** 1 マス歩くアニメーションの間隔。base.css の --anim-cat と合わせる。 */
const WALK_STEP_MS = 120;

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
    <div class="app app-game game-screen">
      <!-- 行 1 はナビゲーションだけ。手数・さいたん・魚は必ず行 2 に置く。 -->
      <header class="header">
        <div class="header-row">
          <div class="header-left">
            <button class="icon-btn back-btn" type="button" aria-label="もどる">${iconBack()}</button>
          </div>
          <h1 class="title">${def.name}</h1>
          <div class="header-actions">
            <button class="icon-btn settings-btn" type="button" aria-label="設定">${iconGear()}</button>
            <button class="icon-btn help-btn" type="button" aria-label="遊びかた">${iconHelp()}</button>
          </div>
        </div>

        <div class="status-bar">
          <span class="stat">
            <span class="stat-label">${world ? world.name : ''} ${def.id}</span>
          </span>
          <span class="stat">
            <span class="stat-label">てすう</span>
            <span class="stat-num moves">0</span>
            <span class="stat-label">さいたん ${def.optimalMoves}</span>
          </span>
          <span class="stat fish-pill" hidden><span class="fish-count"></span></span>
        </div>
      </header>

      <div class="board-wrap"><div class="board-root"></div></div>

      <p class="controls-line">
        <span class="ctl"><b>タップ / やじるし</b> ねこが あるく</span>
        <span class="ctl"><b>スワイプ</b> タイルを うごかす</span>
      </p>

      <footer class="footer">
        <button class="tool undo-btn" type="button" aria-label="もどす">${iconUndo()}</button>
        <button class="tool retry-btn" type="button" aria-label="やりなおし">${iconRetry()}</button>
        <button class="tool hint-btn" type="button" aria-label="ヒント">${iconHint()}</button>
      </footer>

      <div class="overlay game-message" hidden>
        <div class="sheet message-card">
          <div class="banner-cat"></div>
          <p class="message-title">クリア!</p>
          <div class="stars"></div>
          <p class="message-moves"></p>
          <div class="message-buttons">
            <button class="sheet-btn next-btn" type="button">つぎへ</button>
            <button class="sheet-btn quiet again-btn" type="button">もういちど</button>
            <button class="sheet-btn quiet select-btn" type="button">ステージせんたく</button>
          </div>
        </div>
      </div>
    </div>`;

  const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  const boardRoot = q('.board-root');
  const movesEl = q('.moves');
  const fishPill = q('.fish-pill');
  const fishCount = q('.fish-count');
  const message = q('.game-message');
  const undoBtn = q<HTMLButtonElement>('.undo-btn');
  const controls = q('.controls-line');

  const view = new BoardView(boardRoot, session.current.board);
  const cat = view.catSprite;
  const input = new InputManager(document);
  let recorded = false;
  let walking = false;
  /** 歩いている最中に来たタップ。1 つだけ覚えて、歩き終わったら実行する。
      2 つ以上覚えると、意図しない移動が連鎖する。 */
  let queued: Pos | null = null;
  /** draw() が最後に計算した到達可能なマス。盤が変わるたびに更新される。 */
  let reach: Set<number> = reachableSet(session.current);
  /** 歩行音を刻む setTimeout の ID。歩行が中断・画面離脱したら必ず止める。 */
  let walkTimers: number[] = [];
  /** クリアのカードに出す猫。盤の上の猫とは別個体（表情の連動を避ける）。
      CatSprite はタイマーを持つので、画面を離れるとき必ず destroy する。 */
  const bannerCats: CatSprite[] = [];

  function clearWalkTimers(): void {
    for (const id of walkTimers) window.clearTimeout(id);
    walkTimers = [];
  }

  function stopCatWalk(): void {
    view.cancelCatAnimation();
    walking = false;
    queued = null;
    clearWalkTimers();
  }

  /** 行けないマスをタップされたときの反応。今までは完全に無反応だった。 */
  function refuse(): void {
    cat.setMood('sad', 400);
    view.shakeCat();
    play('blocked');
    buzz(20);
  }

  /** 猫の現在地から経路（Dir の列）をたどったマス目の座標列（始点を含む）を作る。 */
  function pathPositions(start: Pos, dirs: Dir[]): Pos[] {
    const out: Pos[] = [start];
    let cur = start;
    for (const d of dirs) {
      const { dr, dc } = delta(d);
      cur = { r: cur.r + dr, c: cur.c + dc };
      out.push(cur);
    }
    return out;
  }

  let prevMoves = session.current.moves;
  let prevFish = session.current.fishTaken;
  let prevCleared = session.current.cleared;

  // 説明は最初の 1 手まで。ずっと出しておくと画面が説明くさくなる。
  function updateControls(): void {
    controls.hidden = session.current.moves > 0;
  }

  function draw(): void {
    const s = session.current;
    reach = reachableSet(s);
    view.render(s, {
      reachable: reach,
      slidable: slideTargets(s.board),
      hint,
    });
    movesEl.textContent = String(s.moves);
    undoBtn.disabled = !session.canUndo;
    if (s.fishTotal > 0) {
      fishPill.hidden = false;
      fishCount.textContent = `さかな ${s.fishTaken} / ${s.fishTotal}`;
    } else {
      fishPill.hidden = true;
    }
    if (s.moves > prevMoves) {
      play('slide');
      buzz(10);
    }
    if (s.fishTaken > prevFish) {
      play('fish');
      cat.setMood('happy', 700);
    }
    if (s.cleared && !prevCleared) {
      play('clear');
      buzz([40, 60, 40]);
      cat.setMood('happy');
    }
    // クリア状態から戻った（やりなおし等）ときは、笑顔で固定されたまま
    // （setMood('happy') は ms 無しなので恒久的）になるのを直す。
    // 'idle' に戻さないと、mood が 'idle' のときしか回らない
    // scheduleBlink() のせいで、この画面を離れるまで一度もまばたきしない。
    if (!s.cleared && prevCleared) {
      cat.setMood('idle');
      cat.faceWest(false);
    }
    prevMoves = s.moves;
    prevFish = s.fishTaken;
    prevCleared = s.cleared;
    if (s.cleared && !recorded) {
      recorded = true;
      const stars = starsFor(def!, s.moves);
      deps.store.record(def!.id, stars, s.moves);
      showClear(stars, s.moves);
    }
    updateControls();
  }

  function showClear(stars: 1 | 2 | 3, moves: number): void {
    const bannerCat = new CatSprite();
    bannerCat.setMood('happy');
    const slot = q('.banner-cat');
    slot.innerHTML = '';
    slot.append(bannerCat.el);
    bannerCats.push(bannerCat);
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

  /** タップされたマスへ歩く。到達領域外なら悲しい顔で反応するだけ。 */
  function walkTo(target: Pos): void {
    const s = session.current;
    // タップは常に歩行。到達領域外なら反応だけ返す。
    if (!reach.has(idx(s.board, target.r, target.c))) {
      refuse();
      return;
    }
    const path = shortestPath(s, target);
    if (!path || path.length === 0) return;
    const waypoints = pathPositions(s.cat, path);
    walking = true;
    view.setCatAnimated(false);
    act(() => session.walkTo(target));
    // 歩行音だけは 1 マスずつ鳴らす。移動そのものは 1 本のアニメーションなので、
    // 経路の長さと 1 マスあたりの時間から刻む。画面を離れる・歩行が中断される
    // ときは stopCatWalk() がこのタイマーを止める。
    // 1 マス目だけは setTimeout を通さず同期的に鳴らす。tap→walkTo はユーザー
    // 操作のコールスタック内で呼ばれているので、ここで tone() まで届けば
    // AudioContext の生成・resume() がジェスチャ起因になる。setTimeout(…, 0)
    // 経由だとマクロタスクに落ちてしまい、Safari 系の厳しい autoplay ポリシーで
    // 最初の一音が鳴らない恐れがある。
    clearWalkTimers();
    play('walk');
    for (let i = 2; i < waypoints.length; i++) {
      walkTimers.push(window.setTimeout(() => play('walk'), (i - 1) * WALK_STEP_MS));
    }
    void view.walkCatThrough(waypoints, WALK_STEP_MS).then(() => {
      view.setCatAnimated(true);
      walking = false;
      const next = queued;
      queued = null;
      // クリア済みなら先行入力は捨てる。到達可能性(reach)だけでなく、
      // 「今はもうタップを受け付けない」という上位の状態も見る必要がある。
      if (next && message.hidden) walkTo(next);
    });
  }

  input.on('tap', (p) => {
    if (p === undefined || !message.hidden) return;
    const target = p as Pos;
    if (walking) {
      queued = target;
      return;
    }
    walkTo(target);
  });

  input.on('walk', (d) => {
    if (!message.hidden || walking || d === undefined) return;
    // タップの歩行不可（reach.has の事前チェック）と対称にする。やじるしキーで
    // 壁に向かっても、タップと同じ「行けない」反応（音・振動・悲しい顔）を返す。
    if (!canWalk(session.current, d as Dir)) {
      refuse();
      return;
    }
    act(() => session.walk(d as Dir));
  });
  input.on('slide', (p) => {
    if (!message.hidden || walking || p === undefined) return;
    const target = p as Pos;
    // タップ・やじるしキーと対称に、押せないマスへのスワイプにも
    // 「行けない」反応（音・振動・悲しい顔）を返す。
    if (canSlide(session.current.board, target)) act(() => session.slide(target));
    else refuse();
  });
  input.on('undo', () => {
    if (!message.hidden) return;
    stopCatWalk();
    act(() => session.undo());
  });
  input.on('restart', () => {
    stopCatWalk();
    recorded = false;
    message.hidden = true;
    act(() => session.reset());
  });
  input.on('back', () => {
    stopCatWalk();
    deps.go({ screen: 'home' });
  });
  input.on('hint', () => showHint());
  input.bindPointer(boardRoot);

  function showHint(): void {
    const sol = solveFrom(session.current, def!.optimalMoves + 3);
    hint = sol && sol.length > 0 ? sol[0]! : null;
    draw();
  }

  q('.back-btn').addEventListener('click', () => {
    stopCatWalk();
    deps.go({ screen: 'home' });
  });
  q('.settings-btn').addEventListener('click', () => openSettingsSheet());
  q('.help-btn').addEventListener('click', () => openHelpSheet());
  undoBtn.addEventListener('click', () => {
    stopCatWalk();
    act(() => session.undo());
  });
  q('.retry-btn').addEventListener('click', () => {
    stopCatWalk();
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
    stopCatWalk();
    recorded = false;
    message.hidden = true;
    act(() => session.reset());
  });
  q('.select-btn').addEventListener('click', () => deps.go({ screen: 'select' }));

  draw();

  return () => {
    stopCatWalk();
    input.destroy();
    view.destroy();
    for (const c of bannerCats) c.destroy();
  };
}
