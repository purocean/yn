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
import { useBus } from '../useful/bus'
import { FLAG_DISABLE_XTERM } from '../useful/global-args'
import { getLogger } from '../useful/utils'

const logger = getLogger('component-x-term')

export default defineComponent({
  name: 'xterm',
  setup () {
    const bus = useBus()
    const store = useStore()

    const refXterm = ref<HTMLElement | null>(null)

    let xterm: Terminal | null = null
    let socket: SocketIOClient.Socket | null = null

    const fitAddon = new FitAddon()

    function fitXterm () {
      if (store.state.showXterm) {
        fitAddon.fit()
      }
    }

    function input (data: string) {
      socket!!.emit('input', data)
    }

    function focus () {
      xterm!!.focus()
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
          theme: {
            background: 'rgb(30, 31, 32)'
          }
        })

        xterm.loadAddon(fitAddon)

        xterm.open(refXterm.value!!)
        fitAddon.fit()
        bus.on('resize', fitXterm)
      }

      if (!socket) {
        socket = io({ path: '/ws' })

        xterm.onResize(size => socket!!.emit('resize', [size.cols, size.rows]))
        xterm.onData(input)
        socket.on('output', (arrayBuffer: any) => xterm!!.write(arrayBuffer))
        socket.on('disconnect', () => {
          xterm!!.clear()
          bus.emit('toggle-xterm', false)
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

      bus.emit('toggle-xterm', true)
      nextTick(() => {
        init()

        const map: {[key: string]: {start: string; exit: string; eol: string}} = {
          bat: { start: 'cmd.exe', exit: 'exit', eol: '\r\n' },
          bash: { start: 'bash', exit: 'exit', eol: '\n' },
          php: { start: 'php -a', exit: 'exit', eol: '\n' },
          python: { start: 'python', exit: 'exit()', eol: '\n' },
          py: { start: 'python', exit: 'exit()', eol: '\n' },
          js: { start: 'node', exit: '.exit', eol: '\n' }
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
          input(map[language].start)
          input(map[language].eol)

          // 延迟一下等待子进程启动
          setTimeout(() => {
            run(code, map[language].eol)

            if (exit) {
              input(map[language].exit)
              input(map[language].eol)
            }
          }, 400)
        } else {
          xterm!!.write(`不支持 ${language} 语言\n`)
        }
      })
    }

    function handleRunInXterm (code?: string) {
      runInXterm('_', code || '', false)
    }

    onBeforeMount(() => {
      (window as any).runInXterm = runInXterm
      bus.on('xterm-run', handleRunInXterm)
      bus.on('xterm-init', init)
    })

    onBeforeUnmount(() => {
      (window as any).runInXterm = null
      bus.off('xterm-init', init)
      bus.off('xterm-run', handleRunInXterm)
    })

    return {
      refXterm,
    }
  },
})
</script>

<style scoped>
@import url('~xterm/css/xterm.css');

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
