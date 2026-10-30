import { generate, report } from './randgen.ts';

// W2 いしだたみ: 固定タイルが押せる範囲を切る。まだ直線とカーブ中心。
const SIMPLE = [5, 10, 5, 10, 3, 6, 12, 9, 3, 6, 12, 9, 0];
const T = [5, 10, 3, 6, 12, 9, 7, 14, 13, 11, 0];

const b4 = { w: 4, h: 4, pool: SIMPLE, fixedGoal: true, take: 2, budgetMs: 4000 } as const;
const b5 = { w: 5, h: 5, pool: T, fixedGoal: true, take: 2, budgetMs: 6000 } as const;

report('W2-1 3手 固定多め', generate({ ...b4, want: 3, seeds: 12000, fixedCount: 7, minReach: 2, maxReach: 6 }));
report('W2-2 3手', generate({ ...b4, want: 3, seeds: 12000, fixedCount: 6, minReach: 3, maxReach: 7, requireCarry: true }));
report('W2-3 4手', generate({ ...b4, want: 4, seeds: 20000, fixedCount: 6, minReach: 2, maxReach: 7 }));
report('W2-4 4手 5x5', generate({ ...b5, want: 4, seeds: 12000, fixedCount: 11, minReach: 3, maxReach: 9 }));
report('W2-5 5手 5x5', generate({ ...b5, want: 5, seeds: 12000, fixedCount: 11, minReach: 3, maxReach: 10 }));
report('W2-6 5手 5x5', generate({ ...b5, want: 5, seeds: 12000, fixedCount: 10, minReach: 3, maxReach: 10, requireCarry: true }));
