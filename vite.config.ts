import { defineConfig } from 'vitest/config';

// GitHub Pages のプロジェクトページは /cat-maze/ 配下に置かれるので、
// 本番ビルドだけベースパスを付ける。開発サーバはそのまま / で動かす。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cat-maze/' : '/',
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // 深い面（W6）の検証はソルバーが 10 秒前後かかる。負荷が高い日でも落ちないよう余裕を持たせる。
    testTimeout: 60_000,
  },
}));
