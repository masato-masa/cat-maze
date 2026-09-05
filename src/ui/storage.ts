// localStorage の利用可否プローブと、使えないときのフォールバックは
// 2048 の js/local_storage_manager.js を元にしている。
// Copyright (c) 2014 Gabriele Cirulli — MIT License
// https://github.com/gabrielecirulli/2048
import { ALL_LEVELS, WORLDS } from '../levels/index.ts';

export type KV = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
};

/** テストや localStorage が使えない環境で使う、メモリ上のストレージ。 */
export function mapKV(m: Map<string, string> = new Map()): KV {
  return {
    get: (k) => m.get(k),
    set: (k, v) => void m.set(k, v),
    delete: (k) => void m.delete(k),
  };
}

/** localStorage が本当に書けるか確かめる。プライベートモードでは例外が出る。 */
function localStorageWorks(): boolean {
  try {
    const probe = '__catmaze_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function browserKV(): KV {
  if (typeof window === 'undefined' || !localStorageWorks()) return mapKV();
  const ls = window.localStorage;
  return {
    get: (k) => ls.getItem(k) ?? undefined,
    set: (k, v) => ls.setItem(k, v),
    delete: (k) => ls.removeItem(k),
  };
}

const KEY = 'catmaze_progress';

export type Record_ = { stars: 1 | 2 | 3; moves: number };
type Data = { [levelId: string]: Record_ };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * ステージごとの成績と解放状態。
 * 配列ではなくステージ ID をキーにしたオブジェクトで持つ。
 * 後からステージを増やしても既存の保存データが壊れないようにするため。
 */
export class ProgressStore {
  private data: Data = {};

  constructor(private kv: KV) {
    this.load();
  }

  private load(): void {
    const raw = this.kv.get(KEY);
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // 壊れた保存データは無かったことにする
    }
    if (!isPlainObject(parsed)) return;
    const out: Data = {};
    for (const [id, v] of Object.entries(parsed)) {
      if (!isPlainObject(v)) continue;
      const stars = v['stars'];
      const moves = v['moves'];
      if (stars !== 1 && stars !== 2 && stars !== 3) continue;
      if (typeof moves !== 'number' || !Number.isFinite(moves)) continue;
      out[id] = { stars, moves };
    }
    this.data = out;
  }

  private save(): void {
    this.kv.set(KEY, JSON.stringify(this.data));
  }

  getStars(levelId: string): 0 | 1 | 2 | 3 {
    return this.data[levelId]?.stars ?? 0;
  }

  bestMoves(levelId: string): number | null {
    return this.data[levelId]?.moves ?? null;
  }

  isCleared(levelId: string): boolean {
    return this.getStars(levelId) > 0;
  }

  /** 先頭は常に解放。それ以外は 1 つ前のステージをクリアしていれば解放。 */
  isUnlocked(levelId: string): boolean {
    const i = ALL_LEVELS.findIndex((l) => l.id === levelId);
    if (i < 0) return false;
    if (i === 0) return true;
    return this.isCleared(ALL_LEVELS[i - 1]!.id);
  }

  /** 星は下がらない。手数は良い方だけ残す。 */
  record(levelId: string, stars: 1 | 2 | 3, moves: number): void {
    const prev = this.data[levelId];
    this.data[levelId] = {
      stars: prev && prev.stars > stars ? prev.stars : stars,
      moves: prev && prev.moves < moves ? prev.moves : moves,
    };
    this.save();
  }

  totalStars(): number {
    return ALL_LEVELS.reduce((n, l) => n + this.getStars(l.id), 0);
  }

  worldStars(worldId: string): number {
    const w = WORLDS.find((x) => x.id === worldId);
    if (!w) return 0;
    return w.levels.reduce((n, l) => n + this.getStars(l.id), 0);
  }

  /** 「つづきから」で開くステージ。未クリアのうち最初のもの。 */
  firstUnclearedId(): string {
    const found = ALL_LEVELS.find((l) => !this.isCleared(l.id));
    return (found ?? ALL_LEVELS[ALL_LEVELS.length - 1]!).id;
  }

  clear(): void {
    this.data = {};
    this.kv.delete(KEY);
  }
}
