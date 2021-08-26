<template>
  <div class="xterm">
    <div ref="refXterm" style="height: 100%"></div>
  </div>
</template>

<script lang="ts">
import io from 'socket.io-client'
import { defineComponent, nextTick, onBeforeMount, onBeforeUnmount, ref } from 'vue'
import { useStore } from 'vuex'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useBus } from '@fe/support/bus'
import { $args, FLAG_DEMO, FLAG_DISABLE_XTERM } from '@fe/support/global-args'
import { toggleXterm } from '@fe/context/layout'
import { registerAction, removeAction } from '@fe/context/action'
import { getLogger } from '@fe/utils'
import { getColorScheme } from '@fe/context/theme'
import { OneHalfLight, OneHalfDark } from 'xterm-theme'
import 'xterm/css/xterm.css'

const logger = getLogger('component-x-term')

export default defineComponent({
  name: 'xterm',
  setup () {
    const bus = useBus()
    const store = useStore()

    const refXterm = ref<HTMLElement | null>(null)

    let xterm: Terminal | null = null
    // eslint-disable-next-line no-undef
    let socket: SocketIOClient.Socket | null = null

    const fitAddon = new FitAddon()

    function fitXterm () {
      if (store.state.showXterm) {
        fitAddon.fit()
      }
    }

    function changeTheme () {
      const dark = getColorScheme() === 'dark'
      OneHalfDark.background = '#1a1b1d'
      OneHalfLight.selection = 'rgba(0, 0, 0, .1)'
      xterm!.setOption('theme', dark ? OneHalfDark : OneHalfLight)
    }

    function input (data: string) {
      socket!.emit('input', data)
    }

    function focus () {
      xterm!.focus()
    }

    function init () {
      if (FLAG_DISABLE_XTERM) {
        logger.warn('xterm disabled')
        return
      }

      if (!xterm) {
        xterm = new Terminal({
          cols: 80,
          rows: 24,
          fontSize: 18,
          cursorStyle: 'underline',
          // fontFamily: 'Consolas',
          fontWeightBold: '500',
        })

        changeTheme()

        xterm.loadAddon(fitAddon)

        xterm.open(refXterm.value!)
        fitAddon.fit()
        bus.on('theme.change', changeTheme)
        bus.on('global.resize', fitXterm)

        if (FLAG_DEMO) {
          const message = 'DEMO 模式终端不可用'
          xterm.write(message)
          return
        }
      }

      if (!socket) {
        const uri = location.protocol.startsWith('http')
          ? location.origin
          : 'http://' + location.hostname + ':' + $args().get('port')
        socket = io(uri, { path: '/ws' })

        xterm.onResize(size => socket!.emit('resize', [size.cols, size.rows]))
        xterm.onData(input)
        socket.on('output', (arrayBuffer: any) => xterm!.write(arrayBuffer))
        socket.on('disconnect', () => {
          xterm!.clear()
          toggleXterm(false)
        })
      }

      if (!socket.connected) {
        socket.connect()
      }

      focus()
    }

    function runInXterm (language: string, code: string, exit = true) {
      if (FLAG_DISABLE_XTERM) {
        logger.warn('xterm disabled')
        return
      }

      toggleXterm(true)
      nextTick(() => {
        init()

        const map: {[key: string]: {start: string; exit: string; eol: string}} = {
          bat: { start: 'cmd.exe', exit: 'exit', eol: '\r\n' },
          shell: { start: '', exit: 'exit', eol: '\n' },
          sh: { start: 'sh', exit: 'exit', eol: '\n' },
          bash: { start: 'bash', exit: 'exit', eol: '\n' },
          php: { start: 'php -a', exit: 'exit', eol: '\n' },
          python: { start: 'python', exit: 'exit()', eol: '\n' },
          py: { start: 'python', exit: 'exit()', eol: '\n' },
          js: { start: 'node', exit: '.exit', eol: '\n' },
          node: { start: 'node', exit: '.exit', eol: '\n' },
        }

        const run = (code: string, eol: string) => {
          code.split('\n').forEach(x => {
            input(x.trim())
            input(eol)
          })
        }

        if (!language || language === '_') {
          run(code, '\n')
        } else if (map[language]) {
          if (map[language].start) {
            input(map[language].start)
            input(map[language].eol)
          }

          // 延迟一下等待子进程启动
          setTimeout(() => {
            run(code, map[language].eol)

            if (exit) {
              input(map[language].exit)
              input(map[language].eol)
            }
          }, 400)
        } else {
          xterm!.write(`不支持 ${language} 语言\n`)
        }
      })
    }

    function handleRunInXterm (code?: string) {
      runInXterm('_', code || '', false)
    }

    onBeforeMount(() => {
      registerAction({ name: 'xterm.run-code', handler: runInXterm })
      registerAction({ name: 'xterm.run', handler: handleRunInXterm })
      registerAction({ name: 'xterm.init', handler: init })
    })

    onBeforeUnmount(() => {
      removeAction('xterm.run-code')
      removeAction('xterm.run')
      removeAction('xterm.init')
    })

    return {
      refXterm,
    }
  },
})
</script>

<style scoped>
.xterm {
  box-sizing: border-box;
  padding: 5px;
  background: var(--g-color-98);
  border: 1px solid var(--g-color-88);
  flex: 0 0 auto;
  width: 100%;
  height: 100%;
}
</style>
