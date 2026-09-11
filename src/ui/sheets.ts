// 遊びかた・設定・開発者メニュー。4 つのゲームで同じ形・同じ文言にしてある。
//
// 素の DOM なので、開いたシートは「作って body に足し、閉じるときに外す」。
// 画面の再描画（renderXxxScreen）とは独立させて、どの画面からも同じ形で呼べる。

import { ALL_LEVELS } from '../levels/index.ts';
import { isMuted, play, setMuted } from './sfx.ts';
import type { ProgressStore } from './storage.ts';

/** シートを 1 枚開く。戻り値を呼ぶと閉じる。 */
function openSheet(body: string, wire?: (root: HTMLElement, close: () => void) => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="sheet">${body}</div>`;
  document.body.appendChild(overlay);

  const close = (): void => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    // 下地そのものを押したときだけ閉じる（中身を押しても閉じない）
    if (t === overlay || t.closest('.sheet-close')) close();
  });

  wire?.(overlay, close);
}

const HELP_RULES = [
  'タイルを動かして道をつなぎ、ねこを おうちへ 帰します。',
  '穴になっているマスへ、となりのタイルを滑らせて動かします。',
  '道がつながっているマスにだけ ねこは歩けます。',
  '魚を全部ひろって、少ない手数で帰るほど星が増えます。',
];

const HELP_CONTROLS = [
  'マスをタップ（または やじるしキー）で ねこが歩きます。',
  'タイルをスワイプすると、穴の方へ滑ります。',
];

export function openHelpSheet(): void {
  openSheet(
    `<h2 class="sheet-title">遊びかた</h2>
     <ul class="help-list">${HELP_RULES.map((r) => `<li>${r}</li>`).join('')}</ul>
     <h3 class="sheet-subtitle">操作</h3>
     <ul class="help-list">${HELP_CONTROLS.map((r) => `<li>${r}</li>`).join('')}</ul>
     <button class="sheet-btn sheet-close" type="button">とじる</button>`,
  );
}

export function openSettingsSheet(): void {
  openSheet(
    `<h2 class="sheet-title">設定</h2>
     <div class="sheet-row static">
       <span>音</span>
       <button class="switch mute-toggle" type="button" role="switch"
               aria-checked="${!isMuted()}" aria-label="音の入切"></button>
     </div>
     <button class="sheet-btn sheet-close" type="button">とじる</button>`,
    (root) => {
      const toggle = root.querySelector<HTMLButtonElement>('.mute-toggle')!;
      toggle.addEventListener('click', () => {
        const next = !isMuted();
        setMuted(next);
        toggle.setAttribute('aria-checked', String(!next));
        // 音を戻した合図として 1 音鳴らす。無音のまま戻ると効いたか分からない。
        if (!next) play('fish');
      });
    },
  );
}

interface DevDeps {
  store: ProgressStore;
  /** 記録を書き換えたあと、開いている画面を作り直すために呼ぶ。 */
  refresh: () => void;
}

/**
 * 開発者用。本番の操作導線には出さず、ホーム右下の小さなピルからだけ開く。
 * 蛇パズル（snake-puzzle/src/app/test.tsx）と同じ方針。
 */
export function openDevSheet({ store, refresh }: DevDeps): void {
  openSheet(
    `<h2 class="sheet-title">テストツール</h2>
     <p class="dev-note">本番では使わない、動作確認用のボタンです。</p>
     <button class="sheet-row unlock-all" type="button">全ステージ開放</button>
     <button class="sheet-row danger clear-all" type="button">きろくを ぜんぶ けす</button>
     <p class="dev-status"></p>
     <button class="sheet-link sheet-close" type="button">とじる</button>`,
    (root) => {
      const status = root.querySelector<HTMLElement>('.dev-status')!;

      root.querySelector('.unlock-all')!.addEventListener('click', () => {
        // 解放は「1 つ前をクリアしているか」で決まるので、星 1 を全面に入れる。
        for (const l of ALL_LEVELS) store.record(l.id, 1, l.optimalMoves);
        status.textContent = `${ALL_LEVELS.length} ステージを開放しました。`;
        refresh();
      });

      root.querySelector('.clear-all')!.addEventListener('click', () => {
        if (!window.confirm('きろくを ぜんぶ けしますか？')) return;
        store.clear();
        status.textContent = 'きろくを消しました。';
        refresh();
      });
    },
  );
}
