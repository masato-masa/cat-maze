import { generate, report } from './randgen.ts';

const T = [5, 10, 3, 6, 12, 9, 7, 14, 13, 11, 0];
const ALL = [5, 10, 3, 6, 12, 9, 7, 14, 13, 11, 15, 0];

// W3 さかなつり: 魚を全部集めてからゴールへ。ゴールはまだ固定。
const w3 = { w: 5, h: 5, pool: T, fixedGoal: true, take: 2, budgetMs: 8000 } as const;
report('W3-1 3手 魚1', generate({ ...w3, want: 3, seeds: 9000, fixedCount: 11, fishCount: 1, minReach: 3, maxReach: 10 }));
report('W3-2 4手 魚1', generate({ ...w3, want: 4, seeds: 9000, fixedCount: 11, fishCount: 1, minReach: 3, maxReach: 10 }));
report('W3-3 4手 魚2', generate({ ...w3, want: 4, seeds: 9000, fixedCount: 11, fishCount: 2, minReach: 3, maxReach: 11 }));
report('W3-4 5手 魚2', generate({ ...w3, want: 5, seeds: 9000, fixedCount: 11, fishCount: 2, minReach: 3, maxReach: 11 }));
report('W3-5 5手 魚2 運搬', generate({ ...w3, want: 5, seeds: 9000, fixedCount: 10, fishCount: 2, requireCarry: true, minReach: 3, maxReach: 11 }));
report('W3-6 6手 魚3', generate({ ...w3, want: 6, seeds: 9000, fixedCount: 11, fishCount: 3, minReach: 3, maxReach: 12 }));

// W4 うごくおうち: 最適解でゴールタイル自身を押す盤面だけを採用する。
const w4 = { w: 5, h: 5, pool: T, fixedGoal: false, requireGoalSlide: true, take: 2, budgetMs: 8000 } as const;
report('W4-1 2手 ゴールを動かす', generate({ ...w4, want: 2, seeds: 9000, fixedCount: 12, minReach: 2, maxReach: 8 }));
report('W4-2 3手 ゴールを動かす', generate({ ...w4, want: 3, seeds: 9000, fixedCount: 12, minReach: 2, maxReach: 9 }));
report('W4-3 4手 ゴールを動かす', generate({ ...w4, want: 4, seeds: 9000, fixedCount: 11, minReach: 3, maxReach: 10 }));
report('W4-4 5手 ゴールを動かす', generate({ ...w4, want: 5, seeds: 9000, fixedCount: 11, minReach: 3, maxReach: 10 }));
report('W4-5 5手 ゴール+運搬', generate({ ...w4, want: 5, seeds: 9000, fixedCount: 10, requireCarry: true, minReach: 3, maxReach: 11 }));
report('W4-6 6手 ゴールを動かす', generate({ ...w4, want: 6, seeds: 9000, fixedCount: 11, minReach: 3, maxReach: 11 }));

// W5 やねのうえ: 全部入り。
const w5 = { w: 5, h: 5, pool: ALL, fixedGoal: false, take: 2, budgetMs: 12000 } as const;
report('W5-1 5手 魚2', generate({ ...w5, want: 5, seeds: 9000, fixedCount: 11, fishCount: 2, minReach: 3, maxReach: 11 }));
report('W5-2 6手 魚2', generate({ ...w5, want: 6, seeds: 9000, fixedCount: 11, fishCount: 2, minReach: 3, maxReach: 11 }));
report('W5-3 6手 魚2 ゴール', generate({ ...w5, want: 6, seeds: 9000, fixedCount: 11, fishCount: 2, requireGoalSlide: true, minReach: 3, maxReach: 12 }));
report('W5-4 7手 魚3', generate({ ...w5, want: 7, seeds: 9000, fixedCount: 12, fishCount: 3, minReach: 3, maxReach: 12 }));
