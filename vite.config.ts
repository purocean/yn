import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import fs from 'fs-extra'

// copy vs
const vsDist = path.resolve(__dirname, 'src/renderer/public/vs')
if (!fs.existsSync(vsDist)) {
  fs.copySync(
    path.resolve(__dirname, 'node_modules/monaco-editor/min/vs'),
    vsDist
  )
}

// copy lucky-sheet
// must use embed dir
const luckySheetDist = path.resolve(__dirname, 'src/renderer/public/embed')
if (!fs.existsSync(path.join(luckySheetDist, 'luckysheet.umd.js'))) {
  fs.copySync(
    path.resolve(__dirname, 'node_modules/luckysheet/dist'),
    luckySheetDist,
    {
      filter: src => {
        if (src.includes('demoData') || src.includes('esm.js') || src.includes('index.html')) {
          return false
        }

        return true
      }
    }

  )
}

// copy drawio
const drawioDist = path.resolve(__dirname, 'src/renderer/public/drawio')
if (!fs.existsSync(drawioDist)) {
  fs.copySync(
    path.resolve(__dirname, 'drawio/src/main/webapp'),
    drawioDist,
    {
      filter: src => {
        if (src.includes('WEB-INF') || src.includes('META-INF')) {
          return false
        }

        return true
      }
    }
  )
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
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
      '/custom-css': {
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
      { find: /^socket.io-client$/, replacement: 'socket.io-client/dist/socket.io.js' },
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
