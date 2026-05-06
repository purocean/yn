import path from 'path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: [
      { find: /^semver$/, replacement: path.resolve(__dirname, 'src/renderer/others/semver.js') },
      { find: /^socket.io-client$/, replacement: 'socket.io-client/dist/socket.io.js' },
      { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
      { find: /^@fe\//, replacement: path.resolve(__dirname, 'src', 'renderer') + '/' },
      { find: /^@main\//, replacement: path.resolve(__dirname, 'src', 'main') + '/' },
      { find: /^@share\//, replacement: path.resolve(__dirname, 'src', 'share') + '/' },
    ]
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/__tests__/**/*.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      all: true,
      include: ['src/**/*.{ts,tsx,vue}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/renderer/public/**',
      ],
    },
  },
})
