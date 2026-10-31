// むげんの面を裏で作る。5×5 の上の段は端末によっては 1 秒を超えるので、画面を止めない。
import { endlessLevel } from './endless.ts';

self.onmessage = (ev: MessageEvent<number>) => {
  const n = ev.data;
  self.postMessage({ n, def: endlessLevel(n) });
};
