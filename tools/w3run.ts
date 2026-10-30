import { generate, report } from './randgen.ts';
const T = [5, 10, 3, 6, 12, 9, 7, 14, 13, 11, 0];
const w3 = { w: 5, h: 5, pool: T, fixedGoal: true, take: 1, budgetMs: 8000 } as const;
report('W3-1 3手 魚1', generate({ ...w3, want: 3, seeds: 9000, fixedCount: 11, fishCount: 1, minReach: 3, maxReach: 10 }));
report('W3-2 4手 魚1', generate({ ...w3, want: 4, seeds: 9000, fixedCount: 11, fishCount: 1, minReach: 3, maxReach: 10 }));
report('W3-3 4手 魚2', generate({ ...w3, want: 4, seeds: 9000, fixedCount: 11, fishCount: 2, minReach: 3, maxReach: 11 }));
report('W3-4 5手 魚2', generate({ ...w3, want: 5, seeds: 9000, fixedCount: 11, fishCount: 2, minReach: 3, maxReach: 11 }));
report('W3-5 5手 魚2 運搬', generate({ ...w3, want: 5, seeds: 9000, fixedCount: 10, fishCount: 2, requireCarry: true, minReach: 3, maxReach: 11 }));
report('W3-6 6手 魚3', generate({ ...w3, want: 6, seeds: 9000, fixedCount: 11, fishCount: 3, minReach: 3, maxReach: 12 }));
