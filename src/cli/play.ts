// テキストで遊ぶプレイヤー。UI を書く前にルールの手触りを確かめるためのもの。
//   npm run play          … W1-1 から
//   npm run play W1-4     … 指定ステージから
import { emitKeypressEvents } from 'node:readline';
import { GameSession } from '../core/game.ts';
import { starsFor } from '../core/rules.ts';
import { ALL_LEVELS, getLevel, nextLevelId } from '../levels/index.ts';
import type { Dir } from '../core/conn.ts';
import type { LevelDef } from '../core/types.ts';
import { renderBoard, renderTargets } from './render.ts';

const startId = process.argv[2] ?? ALL_LEVELS[0]!.id;
let def: LevelDef | undefined = getLevel(startId);
if (!def) {
  console.error(`ステージが見つからない: ${startId}`);
  process.exit(1);
}

let session = new GameSession(def);
let message = '';

function draw(): void {
  const s = session.current;
  const { list } = renderTargets(s);
  console.clear();
  console.log(`${def!.id}  ${def!.name}`);
  console.log('');
  console.log(renderBoard(s, { showReach: true }));
  console.log(`てすう ${s.moves}   さいたん ${def!.optimalMoves}   さかな ${s.fishTaken}/${s.fishTotal}`);
  console.log(`おせるタイル  ${list}`);
  console.log('');
  console.log('やじるし/WASD=あるく  1-9=おす  u=もどす  r=やりなおし  n=つぎ  q=おわり');
  if (def!.hint) console.log(`ヒント: ${def!.hint}`);
  if (message) console.log(`\n${message}`);
  if (s.cleared) {
    const stars = starsFor(def!, s.moves);
    console.log(`\n*** クリア! ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${s.moves} 手 ***`);
    console.log('n をおすと つぎのステージへ');
  }
}

function goNext(): void {
  const next = def ? nextLevelId(def.id) : null;
  if (!next) {
    console.log('\nぜんぶ クリア!');
    process.exit(0);
  }
  def = getLevel(next)!;
  session = new GameSession(def);
  message = '';
}

const KEY_DIR: Record<string, Dir> = {
  up: 0, right: 1, down: 2, left: 3,
  w: 0, d: 1, s: 2, a: 3,
  k: 0, l: 1, j: 2, h: 3,
};

emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (_str, key: { name: string; ctrl: boolean }) => {
  if (!key) return;
  if (key.ctrl && key.name === 'c') process.exit(0);
  message = '';

  const dir = KEY_DIR[key.name];
  if (dir !== undefined) {
    const before = session.current.cat;
    session.walk(dir);
    if (session.current.cat === before) message = 'そっちへは あるけない';
  } else if (/^[1-9]$/.test(key.name)) {
    const { targets } = renderTargets(session.current);
    const t = targets[Number(key.name) - 1];
    if (t) session.slide(t);
    else message = 'その ばんごうの タイルは ない';
  } else if (key.name === 'u') {
    if (session.canUndo) session.undo();
    else message = 'もどせる てが ない';
  } else if (key.name === 'r') {
    session.reset();
  } else if (key.name === 'n') {
    goNext();
  } else if (key.name === 'q') {
    process.exit(0);
  }
  draw();
});

draw();
