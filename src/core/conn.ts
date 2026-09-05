// 方角ビットの並びと、回転をビットローテートで表す方式は
// Simon Tatham's Portable Puzzle Collection の net.c (MIT) の慣習に倣う。
// https://github.com/ghewgill/puzzles

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

/** 0=N, 1=E, 2=S, 3=W（時計回り） */
export type Dir = 0 | 1 | 2 | 3;
/** 4bit のビットマスク（0..15） */
export type Conn = number;

export const ALL_DIRS: Dir[] = [0, 1, 2, 3];

const BITS = [N, E, S, W] as const;
const LETTERS = ['N', 'E', 'S', 'W'] as const;
const DELTAS = [
  { dr: -1, dc: 0 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
] as const;

export function bit(d: Dir): number {
  return BITS[d];
}

export function opposite(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

export function delta(d: Dir): { dr: number; dc: number } {
  return DELTAS[d];
}

export function isOpen(c: Conn, d: Dir): boolean {
  return (c & BITS[d]) !== 0;
}

/** 時計回りに 90 度回転。ビットを 1 つ左へローテートするだけ。 */
export function rotateCW(c: Conn): Conn {
  return ((c << 1) | (c >> 3)) & 0xf;
}

export function parseConn(s: string): Conn {
  if (s === 'X' || s === '') return 0;
  let c = 0;
  for (const ch of s) {
    const i = LETTERS.indexOf(ch as (typeof LETTERS)[number]);
    if (i < 0) throw new Error(`不正な方角文字: ${ch} (in "${s}")`);
    c |= BITS[i]!;
  }
  return c;
}

export function connToString(c: Conn): string {
  const s = LETTERS.filter((_, i) => (c & BITS[i]!) !== 0).join('');
  return s === '' ? 'X' : s;
}
