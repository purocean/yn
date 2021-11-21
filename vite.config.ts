import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs-extra'

// copy vs
fs.copySync(
  path.resolve(__dirname, 'node_modules/monaco-editor/min/vs'),
  path.resolve(__dirname, 'src/renderer/public/vs')
)

fs.copySync(
  path.resolve(__dirname, 'node_modules/luckysheet/dist'),
  path.resolve(__dirname, 'src/renderer/public/embed')
)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  root: 'src/renderer',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  server: {
    port: 8066,
    proxy: {
      '/static': {
        target: 'http://localhost:3044'
      },
      '/api': {
        target: 'http://localhost:3044'
      },
      '/ws': {
        target: 'http://localhost:3044',
        ws: true
      }
    }
  },
  resolve: {
    alias: [
      { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
      { find: /^@fe\//, replacement: path.resolve(__dirname, 'src', 'renderer') + '/' },
      { find: /^@share\//, replacement: path.resolve(__dirname, 'src', 'share') + '/' },
    ]
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
        embed: path.resolve(__dirname, 'src/renderer/embed/index.html')
      }
    }
  }
})
