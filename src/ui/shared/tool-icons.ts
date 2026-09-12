// 生成物。直接編集しない。出どころは C:\claude\shared-ui\tool-icons.mjs。

const wrap = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** もどす */
export const iconUndo = (): string =>
  wrap('<path d="M9 14 L4 9 l5 -5" />' + '<path d="M4 9 h11 a5 5 0 0 1 0 10 h-4" />');

/** やり直す */
export const iconReset = (): string =>
  wrap('<path d="M21 12 a9 9 0 1 1 -3 -6.7" />' + '<path d="M21 3 v6 h-6" />');

/** ヒント */
export const iconHint = (): string =>
  wrap('<path d="M9 18 h6" />' + '<path d="M10 22 h4" />' + '<path d="M12 2 a7 7 0 0 0 -4 12.7 V18 h8 v-3.3 A7 7 0 0 0 12 2 Z" />');
