import './styles/base.css';
import './styles/board.css';
import './styles/game.css';
import './styles/menu.css';
import { Router } from './ui/router.ts';
import type { Route } from './ui/router.ts';
import { ProgressStore, browserKV } from './ui/storage.ts';
import { renderGameScreen } from './ui/screens/game.ts';
import { renderHomeScreen } from './ui/screens/home.ts';
import { renderSelectScreen } from './ui/screens/select.ts';
import { startBgm } from './ui/sfx.ts';
import { isEndlessId } from './levels/endless.ts';
import { hasCachedLevel } from './levels/index.ts';
import { ensureLevel } from './levels/loader.ts';

const app = document.querySelector<HTMLElement>('#app')!;
const store = new ProgressStore(browserKV());
const router = new Router();

let cleanup: (() => void) | null = null;

function go(r: Route): void {
  router.go(r);
}

router.onChange((route) => {
  cleanup?.();
  cleanup = null;
  const deps = { store, go };
  switch (route.screen) {
    case 'home':
      cleanup = renderHomeScreen(app, deps);
      break;
    case 'select':
      cleanup = renderSelectScreen(app, deps);
      break;
    case 'play': {
      // むげんの面は Worker で作るので、まだなら「つくっています」を出して待つ。
      const id = route.levelId;
      if (isEndlessId(id) && !hasCachedLevel(id)) {
        app.innerHTML = '<p class="notice">めいろを つくっています…</p>';
        let gone = false;
        cleanup = () => {
          gone = true;
        };
        void ensureLevel(id).then(() => {
          if (!gone) cleanup = renderGameScreen(app, id, deps);
        });
      } else {
        cleanup = renderGameScreen(app, id, deps);
      }
      break;
    }
  }
});

router.start();
// 自動再生は止められることが多いので、その場合は最初の操作のあとに流れ始める。
startBgm();
