// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { BoardView } from '../../src/ui/board-view.ts';
import { createBoard } from '../../src/core/board.ts';
import { getLevel } from '../../src/levels/index.ts';

function view(): { v: BoardView; catEl: HTMLElement } {
  const root = document.createElement('div');
  document.body.append(root);
  const v = new BoardView(root, createBoard(getLevel('W1-1')!));
  return { v, catEl: root.querySelector<HTMLElement>('.cat')! };
}

/** animate を差し替えて、渡されたキーフレームを取り出す。 */
function captureKeyframes(el: HTMLElement): () => Keyframe[] {
  let captured: Keyframe[] = [];
  (el as unknown as { animate: unknown }).animate = (kf: Keyframe[]) => {
    captured = kf;
    return { finished: Promise.resolve(), cancel: () => {} };
  };
  return () => captured;
}

describe('猫の歩行アニメーション', () => {
  it('マスの中間に跳ねの山を挟む', async () => {
    const { v, catEl } = view();
    const get = captureKeyframes(catEl);
    await v.walkCatThrough(
      [
        { r: 1, c: 0 },
        { r: 1, c: 1 },
        { r: 1, c: 2 },
      ],
      120,
    );
    // 3 マス分の位置 + その間 2 つの山 = 5
    expect(get()).toHaveLength(5);
  });

  it('西へ進むと猫が左を向く', async () => {
    const { v, catEl } = view();
    captureKeyframes(catEl);
    const flip = (): string => v.catSprite.el.style.getPropertyValue('--flip');
    await v.walkCatThrough([{ r: 1, c: 2 }, { r: 1, c: 1 }], 120);
    expect(flip()).toBe('-1');
    await v.walkCatThrough([{ r: 1, c: 1 }, { r: 1, c: 2 }], 120);
    expect(flip()).toBe('1');
  });

  it('縦にだけ動くときは向きを変えない', async () => {
    const { v, catEl } = view();
    captureKeyframes(catEl);
    v.catSprite.faceWest(true);
    await v.walkCatThrough([{ r: 0, c: 1 }, { r: 1, c: 1 }], 120);
    expect(v.catSprite.el.style.getPropertyValue('--flip')).toBe('-1');
  });
});
