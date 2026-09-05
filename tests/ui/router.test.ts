import { describe, it, expect } from 'vitest';
import { hashToRoute, routeToHash } from '../../src/ui/router.ts';

describe('router', () => {
  it('ハッシュをルートに変換する', () => {
    expect(hashToRoute('#/')).toEqual({ screen: 'home' });
    expect(hashToRoute('')).toEqual({ screen: 'home' });
    expect(hashToRoute('#/select')).toEqual({ screen: 'select' });
    expect(hashToRoute('#/play/W1-3')).toEqual({ screen: 'play', levelId: 'W1-3' });
  });

  it('知らないハッシュはホームに落とす', () => {
    expect(hashToRoute('#/nonsense')).toEqual({ screen: 'home' });
    expect(hashToRoute('#/play/')).toEqual({ screen: 'home' });
  });

  it('ルートとハッシュは往復する', () => {
    for (const r of [
      { screen: 'home' } as const,
      { screen: 'select' } as const,
      { screen: 'play', levelId: 'W5-6' } as const,
    ]) {
      expect(hashToRoute(routeToHash(r))).toEqual(r);
    }
  });
});
