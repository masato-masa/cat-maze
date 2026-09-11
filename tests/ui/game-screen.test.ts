// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderGameScreen } from '../../src/ui/screens/game.ts';
import { GameSession } from '../../src/core/game.ts';
import { BoardView } from '../../src/ui/board-view.ts';
import { CatSprite } from '../../src/ui/cat-sprite.ts';
import { ProgressStore, mapKV } from '../../src/ui/storage.ts';
import type { Route } from '../../src/ui/router.ts';

let store: ProgressStore;
let root: HTMLElement;
let went: Route | null;
let cleanup: () => void;
const go = (r: Route): void => {
  went = r;
};

beforeEach(() => {
  store = new ProgressStore(mapKV(new Map()));
  root = document.createElement('div');
  document.body.append(root);
  went = null;
});

function open(levelId: string): void {
  cleanup = renderGameScreen(root, levelId, { store, go });
}

const q = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
const key = (k: string): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: k, cancelable: true }));
};
const tile = (r: number, c: number): HTMLElement =>
  root.querySelector<HTMLElement>(`.tile-layer [data-r="${r}"][data-c="${c}"]`)!;

/** 猫の見た目上の位置（`.cat` の `--r`/`--c`）。歩行の結果を DOM から直接確かめる。 */
const catPos = (): { r: number; c: number } => {
  const el = q<HTMLElement>('.cat');
  return {
    r: Number(el.style.getPropertyValue('--r')),
    c: Number(el.style.getPropertyValue('--c')),
  };
};

/** jsdom には PointerEvent が無いので、必要なプロパティだけ持つイベントを作る。 */
function pointerEvent(type: string, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'clientX', { value: x });
  Object.defineProperty(ev, 'clientY', { value: y });
  Object.defineProperty(ev, 'isPrimary', { value: true });
  return ev;
}

/** el の上でタップする（=そのマスへ歩く）。7px 以内の移動はタップになる。 */
function tap(el: HTMLElement): void {
  el.dispatchEvent(pointerEvent('pointerdown', 100, 100));
  el.dispatchEvent(pointerEvent('pointerup', 101, 100));
}

/** el の上でスワイプする（=そのマスのタイルを押す）。 */
function swipe(el: HTMLElement): void {
  el.dispatchEvent(pointerEvent('pointerdown', 100, 100));
  el.dispatchEvent(pointerEvent('pointerup', 160, 104));
}

/** (r,c) のマスをタップする。ポインタ操作の組み立ては既存の tap/swipe をそのまま使う。 */
const tapCell = (r: number, c: number): void => tap(tile(r, c));
/** (r,c) のマスをスワイプする（=そのマスのタイルを押す）。 */
const swipeCell = (r: number, c: number): void => swipe(tile(r, c));

/** walkCatThrough の Promise 解決を待つ。jsdom では即座に解決するが、
 * .then() の実行はマイクロタスクの後になるため、テスト側でも 1 tick 待つ。 */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('対局画面', () => {
  it('知らないステージ ID には案内を出す', () => {
    open('nope');
    expect(root.textContent).toContain('ありません');
  });

  it('最初は 0 手でクリアしていない', () => {
    open('W1-1');
    expect(q('.moves').textContent).toBe('0');
    expect(q('.game-message').hidden).toBe(true);
    expect(q<HTMLButtonElement>('.undo-btn').disabled).toBe(true);
    cleanup();
  });

  // W1-1 は猫のタイル (1,0) をスワイプで押すと猫ごと運ばれ、そのあと東へ 2 歩でゴール。
  it('スライドで手数が増え、歩行では増えない', () => {
    open('W1-1');
    swipe(tile(1, 0));
    expect(q('.moves').textContent).toBe('1');
    key('ArrowRight');
    expect(q('.moves').textContent).toBe('1');
    cleanup();
  });

  it('クリアすると星と成績が出て、進捗が保存される', () => {
    open('W1-1');
    swipe(tile(1, 0));
    key('ArrowRight');
    key('ArrowRight');
    expect(q('.game-message').hidden).toBe(false);
    expect(q('.stars').querySelectorAll('.star.on')).toHaveLength(3);
    expect(store.getStars('W1-1')).toBe(3);
    expect(store.bestMoves('W1-1')).toBe(1);
    cleanup();
  });

  it('Undo でスライド前に戻る', () => {
    open('W1-1');
    swipe(tile(1, 0));
    expect(q<HTMLButtonElement>('.undo-btn').disabled).toBe(false);
    q('.undo-btn').click();
    expect(q('.moves').textContent).toBe('0');
    expect(q<HTMLButtonElement>('.undo-btn').disabled).toBe(true);
    cleanup();
  });

  it('やりなおしで最初から始められる', () => {
    open('W1-1');
    swipe(tile(1, 0));
    key('ArrowRight');
    key('ArrowRight');
    q('.retry-btn').click();
    expect(q('.moves').textContent).toBe('0');
    expect(q('.game-message').hidden).toBe(true);
    cleanup();
  });

  it('ヒントは次に押すべきタイルを光らせる', () => {
    open('W1-1');
    q('.hint-btn').click();
    expect(root.querySelectorAll('.tile.hinted')).toHaveLength(1);
    cleanup();
  });

  it('魚を集めるステージでは残り数を出す', () => {
    open('W3-1');
    expect(q('.fish-pill').hidden).toBe(false);
    expect(q('.fish-count').textContent).toMatch(/さかな 0 \/ \d/);
    cleanup();
  });

  it('魚のないステージでは魚の表示を出さない', () => {
    open('W1-1');
    expect(q('.fish-pill').hidden).toBe(true);
    cleanup();
  });

  it('タップとスワイプの役割を画面に出す', () => {
    open('W1-1');
    const line = q('.controls-line').textContent!;
    expect(line).toContain('タップ');
    expect(line).toContain('スワイプ');
    expect(line).toContain('あるく');
    cleanup();
  });

  it('スライドできるマスをタップしても歩行になる（タップは常に歩行）', () => {
    open('W3-1');
    // (3,4) は歩いて行けるし押すこともできるマス。タップでは歩行が起きる。
    const before = q('.moves').textContent;
    tap(tile(3, 4));
    expect(before).toBe('0');
    expect(q('.moves').textContent).toBe('0');
    cleanup();
  });

  it('スライドできるマスをスワイプしたらスライドする', () => {
    open('W3-1');
    const before = q('.moves').textContent;
    swipe(tile(3, 4));
    expect(before).toBe('0');
    expect(q('.moves').textContent).toBe('1');
    cleanup();
  });

  // (2,2) の猫から (3,3) へは 南→東 の角を曲がる経路でしか行けない。
  // 状態はその場で確定し（一気に）、見た目のアニメーションには
  // 実際に通るマス（斜めではなく南→東の折れ線）がそのまま渡る。
  it('タップでの複数マス移動は状態がその場で確定し、経路どおりのマスがアニメーションに渡る', () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    const animSpy = vi.spyOn(BoardView.prototype, 'walkCatThrough');
    open('W3-1');
    tap(tile(3, 3));
    expect(walkToSpy).toHaveBeenCalledWith({ r: 3, c: 3 });
    expect(q('.moves').textContent).toBe('0'); // 歩行なので手数は増えない
    expect(animSpy).toHaveBeenCalledWith(
      [
        { r: 2, c: 2 },
        { r: 3, c: 2 },
        { r: 3, c: 3 },
      ],
      expect.any(Number),
    );
    walkToSpy.mockRestore();
    animSpy.mockRestore();
    cleanup();
  });

  it('もどるでホームへ行く', () => {
    open('W1-1');
    q('.back-btn').click();
    expect(went).toEqual({ screen: 'home' });
    cleanup();
  });

  it('Escape もホームへ行く（ボタンと同じ行き先）', () => {
    open('W1-1');
    key('Escape');
    expect(went).toEqual({ screen: 'home' });
    cleanup();
  });

  it('後始末したあとはキー入力を受け付けない', () => {
    open('W1-1');
    cleanup();
    key('ArrowRight');
    expect(q('.moves').textContent).toBe('0');
  });
});

describe('プレイ画面のレイアウト', () => {
  it('操作の説明ははじめだけ出て、1 手打つと消える', () => {
    open('W1-1');
    const line = q('.controls-line');
    expect(line.hidden).toBe(false);
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    swipeCell(Number(hinted.dataset['r']), Number(hinted.dataset['c']));
    expect(line.hidden).toBe(true);
    cleanup();
  });

  it('フッタのボタンは丸アイコンで、中に線画を持つ', () => {
    open('W1-1');
    for (const sel of ['.undo-btn', '.retry-btn', '.hint-btn']) {
      const btn = q<HTMLButtonElement>(sel);
      expect(btn.classList.contains('tool')).toBe(true);
      expect(btn.querySelector('svg')).not.toBeNull();
    }
    cleanup();
  });

  it('さかなの表示はタイトルより下の行に入る', () => {
    open('W3-1');
    // 行 1 に置いてよいのは 戻る・タイトル・設定・? の 4 つだけ。
    // 手数もさかなも 2 行目（.status-bar）に積む。
    expect(q('.status-bar').querySelector('.fish-pill')).not.toBeNull();
    expect(q('.header-row').querySelector('.fish-pill')).toBeNull();
    cleanup();
  });

  it('ヘッダー右上に設定と遊びかたを持つ', () => {
    open('W1-1');
    const actions = q('.header-actions');
    expect(actions.querySelector('.settings-btn')).not.toBeNull();
    expect(actions.querySelector('.help-btn')).not.toBeNull();
    cleanup();
  });

  it('ひとことは出さない', () => {
    open('W1-1'); // hint を持つステージ
    expect(root.querySelector('.hint-line')).toBeNull();
    cleanup();
  });

  it('音の入切はヘッダーに直接置かず、設定シートの中に入れる', () => {
    open('W1-1');
    expect(root.querySelector('.mute-btn')).toBeNull();
    q('.settings-btn').click();
    expect(document.querySelector('.overlay .mute-toggle')).not.toBeNull();
    document.querySelector<HTMLElement>('.overlay .sheet-close')!.click();
    expect(document.querySelector('.overlay .mute-toggle')).toBeNull();
    cleanup();
  });
});

describe('猫の反応', () => {
  it('行けないマスをタップすると悲しい顔になる', async () => {
    open('W1-1');
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    // W1-1 の (3,3) は猫から到達できない
    tapCell(3, 3);
    await flush();
    expect(img()).toContain('sad');
    cleanup();
  });

  it('歩ける先をタップしても悲しい顔にはならない', async () => {
    open('W1-1');
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    tapCell(1, 0); // 猫が今いるマス
    await flush();
    expect(img()).not.toContain('sad');
    cleanup();
  });

  it('クリアすると嬉しい顔になる', async () => {
    open('W1-1');
    // W1-1 は 1 手（1 回のスライド）で解ける。ヒントの示すタイルを押す。
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    const r = Number(hinted.dataset['r']);
    const c = Number(hinted.dataset['c']);
    swipeCell(r, c);
    // 「1 手で解ける」は手数のこと。スライドしただけでは猫はまだゴールの上に
    // いないので、そこへ歩かせて初めて cleared になる。
    const goal = root.querySelector<HTMLElement>('.tile-layer .tile[data-kind="goal"]')!;
    tapCell(Number(goal.dataset['r']), Number(goal.dataset['c']));
    await flush();
    expect(root.querySelector('.cat-img')!.getAttribute('src')).toContain('happy');
    cleanup();
  });
});

describe('クリアのカード', () => {
  it('クリアのカードに嬉しい顔の猫が出る', () => {
    open('W1-1');
    // W1-1 は 1 手（1 回のスライド）で解ける。スライドしただけでは猫はまだ
    // ゴールの上にいないので、そこへ歩かせて初めて cleared になる
    // （「猫の反応 > クリアすると嬉しい顔になる」と同じ手順）。
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    swipeCell(Number(hinted.dataset['r']), Number(hinted.dataset['c']));
    const goal = root.querySelector<HTMLElement>('.tile-layer .tile[data-kind="goal"]')!;
    tapCell(Number(goal.dataset['r']), Number(goal.dataset['c']));
    const img = q('.message-card').querySelector('img')!;
    expect(img.getAttribute('src')).toContain('happy');
    cleanup();
  });
});

describe('クリア後のやりなおし', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // レビュー指摘（Important）: クリア時の cat.setMood('happy') は ms を渡していない
  // ので恒久的になる。リセット系のハンドラ（retry-btn 等）はどれも mood を戻して
  // いなかったため、リトライ後も猫が笑顔のまま固定され、scheduleBlink() は
  // mood === 'idle' のときしかまばたきしないので、その画面を離れるまで一度も
  // まばたきしなくなる欠陥だった。あわせて faceWest(false) も戻す必要がある。
  it('やりなおすと笑顔で固定されず、向きも正面（東向き）に戻る', async () => {
    const faceWestSpy = vi.spyOn(CatSprite.prototype, 'faceWest');
    open('W1-1');
    // W1-1 は 1 手（1 回のスライド）で解ける。ヒントの示すタイルを押してから
    // ゴールへ歩かせて cleared にする。
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    swipeCell(Number(hinted.dataset['r']), Number(hinted.dataset['c']));
    const goal = root.querySelector<HTMLElement>('.tile-layer .tile[data-kind="goal"]')!;
    tapCell(Number(goal.dataset['r']), Number(goal.dataset['c']));
    await flush();
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    expect(img()).toContain('happy');

    faceWestSpy.mockClear();
    q('.retry-btn').click();
    expect(img()).not.toContain('happy');
    expect(faceWestSpy).toHaveBeenCalledWith(false);
    cleanup();
  });

  it('「もういちど」ボタンでも同様に戻る', async () => {
    open('W1-1');
    q<HTMLButtonElement>('.hint-btn').click();
    const hinted = root.querySelector<HTMLElement>('.tile.hinted')!;
    swipeCell(Number(hinted.dataset['r']), Number(hinted.dataset['c']));
    const goal = root.querySelector<HTMLElement>('.tile-layer .tile[data-kind="goal"]')!;
    tapCell(Number(goal.dataset['r']), Number(goal.dataset['c']));
    await flush();
    const img = (): string => root.querySelector('.cat-img')!.getAttribute('src')!;
    expect(img()).toContain('happy');

    q('.again-btn').click();
    expect(img()).not.toContain('happy');
    cleanup();
  });
});

describe('先行入力', () => {
  // spy の後始末をテスト本体の末尾に置くと、assert で落ちたときに後続のテストへ
  // 漏れる。afterEach に寄せて必ず戻す。
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // W3-1 で猫(2,2)から到達できるマスは (1,2)(2,2)(2,3)(3,1)(3,2)(3,3)(3,4)。
  // (3,3)→(3,4) は隣接していて、歩いている最中に次のタップを重ねられる。
  it('歩いている最中のタップも 1 つだけ覚えていて、歩き終わると実行される', async () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    open('W3-1');
    tapCell(3, 3); // 歩行開始（まだ walking === true のまま同期的に戻る）
    tapCell(3, 4); // 歩行中なので先行入力として覚える
    await flush();
    expect(walkToSpy.mock.calls).toEqual([[{ r: 3, c: 3 }], [{ r: 3, c: 4 }]]);
    // 呼び出し履歴だけでなく、猫が実際にそこへ着いたことも見える形で確かめる。
    expect(catPos()).toEqual({ r: 3, c: 4 });
    cleanup();
  });

  it('歩行中に 3 回タップしても、実行されるのは最初と最後の 1 つだけ', async () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    open('W3-1');
    tapCell(3, 3); // 歩行開始
    tapCell(3, 4); // 先行入力その 1（後で上書きされる）
    tapCell(3, 1); // 先行入力その 2 で上書き。2 つ以上は覚えない
    await flush();
    expect(walkToSpy.mock.calls).toEqual([[{ r: 3, c: 3 }], [{ r: 3, c: 1 }]]);
    // 猫が (3,4)（捨てられた先行入力の行き先）ではなく (3,1)（最後の先行入力の
    // 行き先）に居ることを、呼び出し履歴とは別に位置でも確かめる。
    expect(catPos()).toEqual({ r: 3, c: 1 });
    cleanup();
  });

  it('歩行中に undo すると、覚えていた先行入力は捨てられる', async () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    open('W3-1');
    tapCell(3, 3); // 歩行開始
    tapCell(3, 4); // 先行入力として覚える
    key('u'); // undo。覚えていた先行入力を捨てる
    await flush();
    expect(walkToSpy.mock.calls).toEqual([[{ r: 3, c: 3 }]]);
    // 猫は (3,4) へは進まず、undo 前の (3,3) のまま(スライド履歴が無いので
    // undo 自体は何も戻さない)。
    expect(catPos()).toEqual({ r: 3, c: 3 });
    cleanup();
  });

  // レビュー指摘: 先行入力の再実行(walkTo() 内 `if (next) walkTo(next);`)が
  // reach しか再検証しておらず、「今はもうタップを受け付けない」という
  // 上位の状態(message.hidden)を見ていなかった。歩行中にタップが積まれ、
  // その歩行が(何らかの理由で)クリアを引き起こした場合、カードが出た裏で
  // 積まれた行き先へもう一度歩いてしまう欠陥だった。
  //
  // 実際の操作だけでこの状態を組み立てようとすると、
  // 「先行入力として積める(= message.hidden が true)」ことと
  // 「クリア済みである(= message.hidden が false)」ことは常にどちらか
  // 一方でしかなく、タップの経路だけでは両立できない
  // (状態を変える手段はすべて `act()` を通り、`act()` は同期的に
  // `draw()` まで終えるため)。そこで、歩行アニメーションの完了を
  // モックして「その歩行の完了時点で、すでにカードが出ている」という
  // 状況を直接作り、再実行がそれを見ているかどうかを確かめる。
  it('先行入力の再実行前に「クリア!」カードが出ていたら、積んだ行き先へは歩かない', async () => {
    const walkToSpy = vi.spyOn(GameSession.prototype, 'walkTo');
    open('W3-1');
    // 最初の歩行(3,3)の完了だけ、実際のアニメーションの代わりに
    // 「カードが出ている」状態を作ってから解決させる。
    // 「message.hidden = false」を同期的に行うと、2 回目の tapCell 自体が
    // 直接タップの経路（204 行目の `!message.hidden` ガード）で弾かれてしまい、
    // 先行入力として積む前に終わってしまう。マイクロタスクを 1 つ挟んで、
    // 「(3,4) を先行入力として積んだ後、最初の歩行の完了時点ではもう
    // カードが出ている」という順番を再現する。
    const animSpy = vi
      .spyOn(BoardView.prototype, 'walkCatThrough')
      .mockImplementationOnce(() =>
        Promise.resolve().then(() => {
          q<HTMLElement>('.game-message').hidden = false;
        }),
      );
    tapCell(3, 3); // 歩行開始
    tapCell(3, 4); // 歩行中なので先行入力として覚える
    await flush();
    // 積んだ (3,4) へは再実行されない。最初の歩行の 1 回だけ。
    expect(walkToSpy.mock.calls).toEqual([[{ r: 3, c: 3 }]]);
    expect(catPos()).toEqual({ r: 3, c: 3 });
    animSpy.mockRestore();
    cleanup();
  });
});
