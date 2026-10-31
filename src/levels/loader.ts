import type { LevelDef } from '../core/types.ts';
import { endlessLevel, endlessNumber, isEndlessId } from './endless.ts';
import { getLevel, hasCachedLevel, primeLevel } from './index.ts';

/**
 * 面を用意する。むげんの面は Web Worker で作り、作り終えたら getLevel から同期で取れるようにする。
 * Worker が使えない環境（テスト・古いブラウザ）では同じ関数をその場で呼ぶ。
 */
let worker: Worker | null | undefined;
const pending = new Map<number, Promise<void>>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === 'undefined'
      ? null
      : new Worker(new URL('./endless.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
  }
  return worker;
}

export function ensureLevel(id: string): Promise<LevelDef | undefined> {
  if (!isEndlessId(id) || hasCachedLevel(id)) return Promise.resolve(getLevel(id));
  const n = endlessNumber(id);
  let p = pending.get(n);
  if (!p) {
    const w = getWorker();
    p = w
      ? new Promise<void>((resolve) => {
          const onMsg = (ev: MessageEvent<{ n: number; def: LevelDef }>): void => {
            if (ev.data.n !== n) return;
            w.removeEventListener('message', onMsg);
            primeLevel(id, ev.data.def);
            resolve();
          };
          w.addEventListener('message', onMsg);
          w.postMessage(n);
        })
      : Promise.resolve().then(() => primeLevel(id, endlessLevel(n)));
    pending.set(n, p);
    void p.finally(() => pending.delete(n));
  }
  return p.then(() => getLevel(id));
}
