// 猫の見た目。にゃんどくの src/ui/Cat.tsx を vanilla TS に移した。
// 移植で外してはいけない点が 2 つある。
//   1. 4 枚を先に読ませる。まばたきの瞬間に取りに行くと、そこで猫が一瞬消える
//   2. まばたきの間隔をばらつかせる。等間隔だと生き物ではなく点滅に見える
import blinkUrl from '../assets/cats/blink.png';
import happyUrl from '../assets/cats/happy.png';
import normalUrl from '../assets/cats/normal.png';
import sadUrl from '../assets/cats/sad.png';

export type Mood = 'idle' | 'happy' | 'sad';

const SRC = { normal: normalUrl, blink: blinkUrl, happy: happyUrl, sad: sadUrl };

/** まばたきで目を閉じている時間 */
const BLINK_MS = 130;

let preloaded = false;
function preload(): void {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  for (const src of Object.values(SRC)) {
    const img = new Image();
    img.src = src;
  }
}

export class CatSprite {
  /** 親に append する要素。位置は親（.cat）が持ち、こちらは向きだけを持つ。 */
  readonly el: HTMLElement;
  private img: HTMLImageElement;
  private mood: Mood = 'idle';
  private blinking = false;
  private closeTimer = 0;
  private openTimer = 0;
  private moodTimer = 0;

  constructor(seed = 0) {
    preload();
    this.el = document.createElement('div');
    this.el.className = 'cat-flip';
    this.el.style.setProperty('--flip', '1');
    this.img = document.createElement('img');
    this.img.className = 'cat-img';
    this.img.alt = 'ねこ';
    this.img.draggable = false;
    this.el.append(this.img);
    this.paint();
    this.scheduleBlink(seed);
  }

  setMood(mood: Mood, ms?: number): void {
    window.clearTimeout(this.moodTimer);
    this.moodTimer = 0;
    this.mood = mood;
    this.blinking = false;
    this.paint();
    if (ms !== undefined && mood !== 'idle') {
      this.moodTimer = window.setTimeout(() => this.setMood('idle'), ms);
    }
  }

  faceWest(west: boolean): void {
    this.el.style.setProperty('--flip', west ? '-1' : '1');
  }

  destroy(): void {
    window.clearTimeout(this.closeTimer);
    window.clearTimeout(this.openTimer);
    window.clearTimeout(this.moodTimer);
    this.closeTimer = this.openTimer = this.moodTimer = 0;
  }

  private paint(): void {
    const src =
      this.mood === 'happy'
        ? SRC.happy
        : this.mood === 'sad'
          ? SRC.sad
          : this.blinking
            ? SRC.blink
            : SRC.normal;
    this.img.src = src;
  }

  /** 間隔をばらつかせる。初回だけ seed でずらし、以降はランダム。 */
  private scheduleBlink(seed: number, first = true): void {
    const wait = first ? 900 + (seed % 5) * 700 : 2600 + Math.random() * 4200;
    this.closeTimer = window.setTimeout(() => {
      if (this.mood === 'idle') {
        this.blinking = true;
        this.paint();
        this.openTimer = window.setTimeout(() => {
          this.blinking = false;
          this.paint();
          this.scheduleBlink(seed, false);
        }, BLINK_MS);
        return;
      }
      this.scheduleBlink(seed, false);
    }, wait);
  }
}

/** タイトル画面の猫。盤の上ではないので位置も向きも持たない、ただの 1 枚絵。 */
export function catSvg(): string {
  return `<img class="cat-img" src="${SRC.normal}" alt="ねこ" />`;
}
