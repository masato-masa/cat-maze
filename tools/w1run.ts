import { generate, report } from './randgen.ts';

// W1 は直線とカーブだけ。ゴールは固定（動くゴールは W4 の主題）。
const SIMPLE = [5, 10, 5, 10, 3, 6, 12, 9, 3, 6, 12, 9, 0];
const base = { w: 4, h: 4, pool: SIMPLE, fixedGoal: true, take: 3 } as const;

report('W1-3 2手 運搬あり', generate({ ...base, want: 2, seeds: 12000, fixedCount: 4, requireCarry: true, minReach: 2, maxReach: 5 }));
report('W1-4 2手', generate({ ...base, want: 2, seeds: 12000, fixedCount: 4, minReach: 3, maxReach: 7 }));
report('W1-5 3手', generate({ ...base, want: 3, seeds: 12000, fixedCount: 4, minReach: 2, maxReach: 6 }));
report('W1-6 4手', generate({ ...base, want: 4, seeds: 20000, fixedCount: 4, minReach: 2, maxReach: 7 }));
