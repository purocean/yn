<template>
  <div class="xterm">
    <div ref="xterm" style="height: 100%"></div>
  </div>
</template>

<script>
import io from 'socket.io-client'
import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'
import 'xterm/src/xterm.css'

Terminal.applyAddon(fit)

let xterm = null
let socket = null

export default {
  name: 'xterm',
  created () {
    window.runInXterm = this.runInXterm
    this.$bus.on('xterm-run', this.handleRunInXterm)
    this.$bus.on('xterm-init', this.init)
  },
  beforeDestroy () {
    window.runInXterm = null
    this.$bus.off('xterm-init', this.init)
    this.$bus.off('xterm-run', this.handleRunInXterm)
    this.$bus.off('resize', this.handleRunInXterm)
  },
  methods: {
    init () {
      if (!xterm) {
        xterm = new Terminal({
          cols: 80,
          rows: 24,
          fontSize: 18,
          cursorStyle: 'underline',
          fontFamily: 'Consolas',
          fontWeightBold: '500',
          theme: {
            background: 'rgb(30, 31, 32)'
          }
        })

        xterm.open(this.$refs.xterm)
        xterm.fit()
        this.$bus.on('resize', this.fitXterm)
      }

      if (!socket) {
        socket = io({ path: '/ws' })

        xterm.on('resize', size => socket.emit('resize', [size.cols, size.rows]))
        xterm.on('data', data => this.input(data))
        socket.on('output', arrayBuffer => xterm.write(arrayBuffer))
        socket.on('disconnect', () => {
          xterm.clear()
          this.$bus.emit('toggle-xterm', false)
        })
      }

      if (!socket.connected) {
        socket.connect()
      }

      this.focus()
    },
    fitXterm () {
      xterm.fit()
    },
    input (data) {
      socket.emit('input', data)
    },
    focus () {
      xterm.focus()
    },
    handleRunInXterm (code) {
      this.runInXterm(null, code, false)
    },
    runInXterm (language, code, exit = true) {
      this.$bus.emit('toggle-xterm', true)
      this.$nextTick(() => {
        this.init()

        const map = {
          bat: { start: 'cmd.exe', exit: 'exit', eol: '\r\n' },
          bash: { start: 'bash', exit: 'exit', eol: '\n' },
          php: { start: 'php -a', exit: 'exit', eol: '\n' },
          python: { start: 'python', exit: 'exit()', eol: '\n' },
          py: { start: 'python', exit: 'exit()', eol: '\n' },
          js: { start: 'node', exit: '.exit', eol: '\n' }
        }

        const run = (code, eol) => {
          code.split('\n').forEach((x, i) => {
            this.input(x.trim())
            this.input(eol)
          })
        }

        if (!language) {
          run(code, '\n')
        } else if (map[language]) {
          this.input(map[language].start)
          this.input(map[language].eol)

          // 延迟一下等待子进程启动
          setTimeout(() => {
            run(code, map[language].eol)

            if (exit) {
              this.input(map[language].exit)
              this.input(map[language].eol)
            }
          }, 400)
        } else {
          xterm.write(`不支持 ${language} 语言\n`)
        }
      })
    }
  }
}
</script>

<style scoped>
.xterm {
  box-sizing: border-box;
  padding: 5px;
  padding-bottom: 20px;
  background: rgb(29, 31, 33);
  border: 1px solid rgb(92, 91, 100);
  flex: 0 0 auto;
  width: 100%;
  height: 100%;
}
</style>
