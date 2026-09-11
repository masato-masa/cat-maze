// 丸ボタンの線画。にゃんどくと同じ形にそろえてある。
const WRAP = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** もどす — 左へ回る矢印 */
export const iconUndo = (): string =>
  WRAP('<path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-4" />');

/** やりなおし — 一周する矢印 */
export const iconRetry = (): string =>
  WRAP('<path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />');

/** ヒント — 電球 */
export const iconHint = (): string =>
  WRAP('<path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2Z" />');
