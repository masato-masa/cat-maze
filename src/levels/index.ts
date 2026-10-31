import type { LevelDef } from '../core/types.ts';
import { dailyLevel, isDailyId } from './daily.ts';
import { endlessId, endlessLevel, endlessNumber, isEndlessId } from './endless.ts';
import { W1 } from './w1.ts';
import { W2 } from './w2.ts';
import { W3 } from './w3.ts';
import { W4 } from './w4.ts';
import { W5 } from './w5.ts';

export type World = { id: string; name: string; levels: LevelDef[] };

export const WORLDS: World[] = [
  { id: 'W1', name: 'うらにわ', levels: W1 },
  { id: 'W2', name: 'いしだたみ', levels: W2 },
  { id: 'W3', name: 'さかなつり', levels: W3 },
  { id: 'W4', name: 'うごくおうち', levels: W4 },
  { id: 'W5', name: 'やねのうえ', levels: W5 },
];

export const ALL_LEVELS: LevelDef[] = WORLDS.flatMap((w) => w.levels);

const madeCache = new Map<string, LevelDef>();

/**
 * "D-20261101"（きょうの めいろ）と "E-12"（むげん）は、その場で作って返す。
 * むげんの上の段は重いので、画面からは loader.ts の ensureLevel で先に作っておく。
 */
export function getLevel(id: string): LevelDef | undefined {
  if (isDailyId(id) || isEndlessId(id)) {
    if (!madeCache.has(id)) {
      madeCache.set(id, isDailyId(id) ? dailyLevel(id) : endlessLevel(endlessNumber(id)));
    }
    return madeCache.get(id);
  }
  return ALL_LEVELS.find((l) => l.id === id);
}

export function hasCachedLevel(id: string): boolean {
  return madeCache.has(id);
}

export function primeLevel(id: string, def: LevelDef): void {
  madeCache.set(id, def);
}

export function levelIndex(id: string): number {
  return ALL_LEVELS.findIndex((l) => l.id === id);
}

export function nextLevelId(id: string): string | null {
  if (isEndlessId(id)) return endlessId(endlessNumber(id) + 1);
  const i = levelIndex(id);
  if (i < 0 || i + 1 >= ALL_LEVELS.length) return null;
  return ALL_LEVELS[i + 1]!.id;
}

export function worldOf(id: string): World | undefined {
  return WORLDS.find((w) => w.levels.some((l) => l.id === id));
}
