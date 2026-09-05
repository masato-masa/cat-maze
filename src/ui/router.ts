export type Route =
  | { screen: 'home' }
  | { screen: 'select' }
  | { screen: 'play'; levelId: string };

export function routeToHash(r: Route): string {
  switch (r.screen) {
    case 'home':
      return '#/';
    case 'select':
      return '#/select';
    case 'play':
      return `#/play/${r.levelId}`;
  }
}

export function hashToRoute(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === '/select') return { screen: 'select' };
  const m = /^\/play\/([\w-]+)$/.exec(h);
  if (m) return { screen: 'play', levelId: m[1]! };
  return { screen: 'home' };
}

/** location.hash を使った画面遷移。ブラウザの戻るがそのまま効く。 */
export class Router {
  private handler = (): void => this.emit();
  private listeners: ((r: Route) => void)[] = [];

  get current(): Route {
    return hashToRoute(window.location.hash);
  }

  onChange(cb: (r: Route) => void): void {
    this.listeners.push(cb);
  }

  private emit(): void {
    const r = this.current;
    for (const cb of this.listeners) cb(r);
  }

  start(): void {
    window.addEventListener('hashchange', this.handler);
    this.emit();
  }

  go(r: Route): void {
    const next = routeToHash(r);
    if (window.location.hash === next) this.emit();
    else window.location.hash = next;
  }

  stop(): void {
    window.removeEventListener('hashchange', this.handler);
  }
}
