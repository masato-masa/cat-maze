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

/* ---- ヘッダーの丸アイコン ----
   地はアクセント色の円、線は白。4 つのゲームで同じ描き方にしてある。 */
const ROUND = (body: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">` +
  `<circle cx="12" cy="12" r="9.4" fill="var(--accent)" />${body}</svg>`;

/** もどる */
export const iconBack = (): string =>
  ROUND(
    '<path d="M13.6 7.8 L9.4 12 l4.2 4.2" fill="none" stroke="#fff" stroke-width="2.1" ' +
      'stroke-linecap="round" stroke-linejoin="round" />',
  );

/** 遊びかた */
export const iconHelp = (): string =>
  ROUND(
    '<path d="M9.5 9.3 a2.6 2.6 0 1 1 3.2 2.9 v1.5" fill="none" stroke="#fff" ' +
      'stroke-width="2.1" stroke-linecap="round" />' +
      '<circle cx="12.6" cy="16.6" r="1.25" fill="#fff" />',
  );

/** 設定。歯は「胴から生えた台形」として 1 本のパスで描く。放射状の細い線で
 *  歯を表すと、22px では太陽のマークに見えてしまう。 */
export const iconGear = (): string =>
  ROUND(
    '<path fill="#fff" d="M10.65 7.29 L10.86 5.19 A6.9 6.9 0 0 1 13.14 5.19 L13.35 7.29 ' +
      'A4.9 4.9 0 0 1 14.38 7.71 L16.01 6.38 A6.9 6.9 0 0 1 17.62 7.99 L16.29 9.62 ' +
      'A4.9 4.9 0 0 1 16.71 10.65 L18.81 10.86 A6.9 6.9 0 0 1 18.81 13.14 L16.71 13.35 ' +
      'A4.9 4.9 0 0 1 16.29 14.38 L17.62 16.01 A6.9 6.9 0 0 1 16.01 17.62 L14.38 16.29 ' +
      'A4.9 4.9 0 0 1 13.35 16.71 L13.14 18.81 A6.9 6.9 0 0 1 10.86 18.81 L10.65 16.71 ' +
      'A4.9 4.9 0 0 1 9.62 16.29 L7.99 17.62 A6.9 6.9 0 0 1 6.38 16.01 L7.71 14.38 ' +
      'A4.9 4.9 0 0 1 7.29 13.35 L5.19 13.14 A6.9 6.9 0 0 1 5.19 10.86 L7.29 10.65 ' +
      'A4.9 4.9 0 0 1 7.71 9.62 L6.38 7.99 A6.9 6.9 0 0 1 7.99 6.38 L9.62 7.71 ' +
      'A4.9 4.9 0 0 1 10.65 7.29 Z" />' +
      '<circle cx="12" cy="12" r="2.1" fill="var(--accent)" />',
  );
