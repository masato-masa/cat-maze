import { idx, reachable, tileAt } from '../core/board.ts';
import { slideTargets } from '../core/slide.ts';
import type { GameState, Pos } from '../core/types.ts';

/** 接続ビット(0..15) -> 罫線文字。N=1 E=2 S=4 W=8 */
const GLYPH: string[] = [
  ' ', // 0
  '╵', // N
  '╶', // E
  '└', // NE
  '╷', // S
  '│', // NS
  '┌', // ES
  '├', // NES
  '╴', // W
  '┘', // NW
  '─', // EW
  '┴', // NEW
  '┐', // SW
  '┤', // NSW
  '┬', // ESW
  '┼', // NESW
];

export type RenderOpts = {
  /** 押せるタイルに番号を振って表示する */
  targets?: Pos[];
  /** 到達領域を強調する */
  showReach?: boolean;
};

/** 盤面をテキストで描く。1 セル 1 文字。 */
export function renderBoard(s: GameState, opts: RenderOpts = {}): string {
  const b = s.board;
  const reach = opts.showReach ? reachable(b, s.cat) : null;
  const lines: string[] = [];
  for (let r = 0; r < b.height; r++) {
    let line = '';
    for (let c = 0; c < b.width; c++) {
      const t = tileAt(b, r, c);
      if (s.cat.r === r && s.cat.c === c) {
        line += 'C';
      } else if (!t) {
        line += '.';
      } else if (t.fish) {
        line += 'F';
      } else if (t.kind === 'goal') {
        line += 'G';
      } else if (t.fixed) {
        line += '#';
      } else {
        line += GLYPH[t.conn]!;
      }
      // 到達領域は括弧で囲って示す
      if (reach && reach.has(idx(b, r, c)) && !(s.cat.r === r && s.cat.c === c)) {
        line = line.slice(0, -1) + `(${line.slice(-1)})`;
      } else {
        line = line.slice(0, -1) + ` ${line.slice(-1)} `;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines.join('\n') + '\n';
}

/** 押せるタイルを番号付きの一覧にする。 */
export function renderTargets(s: GameState): { list: string; targets: Pos[] } {
  const targets = slideTargets(s.board);
  const list = targets.map((p, i) => `${i + 1}:(${p.r},${p.c})`).join('  ');
  return { list, targets };
}
