import { defineConfig } from 'vitest/config';

// GitHub Pages のプロジェクトページは /cat-maze/ 配下に置かれるので、
// 本番ビルドだけベースパスを付ける。開発サーバはそのまま / で動かす。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cat-maze/' : '/',
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
