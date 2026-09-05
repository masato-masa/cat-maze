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
    case 'play':
      cleanup = renderGameScreen(app, route.levelId, deps);
      break;
  }
});

router.start();
