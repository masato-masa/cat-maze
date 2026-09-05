import { describe, it, expect } from 'vitest';
import { N, E, S, W, opposite, delta, rotateCW, parseConn, connToString } from '../../src/core/conn.ts';

describe('conn', () => {
  it('方角ビットは時計回りに並ぶ', () => {
    expect([N, E, S, W]).toEqual([1, 2, 4, 8]);
  });

  it('opposite は反対の方角を返す', () => {
    expect(opposite(0)).toBe(2);
    expect(opposite(1)).toBe(3);
    expect(opposite(2)).toBe(0);
    expect(opposite(3)).toBe(1);
  });

  it('delta は行と列の増分を返す', () => {
    expect(delta(0)).toEqual({ dr: -1, dc: 0 });
    expect(delta(1)).toEqual({ dr: 0, dc: 1 });
    expect(delta(2)).toEqual({ dr: 1, dc: 0 });
    expect(delta(3)).toEqual({ dr: 0, dc: -1 });
  });

  it('rotateCW はビットローテートになる', () => {
    expect(rotateCW(N)).toBe(E);
    expect(rotateCW(W)).toBe(N);
    expect(rotateCW(N | S)).toBe(E | W);
    expect(rotateCW(0b1111)).toBe(0b1111);
  });

  it('parseConn は方角文字列を読む', () => {
    expect(parseConn('NS')).toBe(N | S);
    expect(parseConn('X')).toBe(0);
    expect(parseConn('NESW')).toBe(15);
  });

  it('parseConn は不正な文字を拒否する', () => {
    expect(() => parseConn('NQ')).toThrow();
  });

  it('connToString は parseConn の逆になる', () => {
    for (let c = 0; c < 16; c++) expect(parseConn(connToString(c))).toBe(c);
  });
});
