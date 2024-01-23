<template>
  <div class="xterm">
    <div class="hide" @click="$emit('hide')">
      <SvgIcon style="width: 20px; height: 20px" name="chevron-down" />
    </div>
    <div ref="refXterm" style="height: 100%"></div>
  </div>
</template>

<script lang="ts">
import io, { Socket } from 'socket.io-client'
import { defineComponent, nextTick, onBeforeMount, onBeforeUnmount, ref } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { OneHalfLight, OneHalfDark } from 'xterm-theme'
import { getLogger, sleep } from '@fe/utils'
import { registerHook, removeHook } from '@fe/core/hook'
import { registerAction, removeAction } from '@fe/core/action'
import { $args, FLAG_DEMO, FLAG_DISABLE_XTERM } from '@fe/support/args'
import { toggleXterm } from '@fe/services/layout'
import { getColorScheme } from '@fe/services/theme'
import { t } from '@fe/services/i18n'
import { isWindows } from '@fe/support/env'
import type { BuildInActions } from '@fe/types'
import store from '@fe/support/store'
import SvgIcon from './SvgIcon.vue'

import 'xterm/css/xterm.css'

const logger = getLogger('component-x-term')

export default defineComponent({
  name: 'xterm',
  components: { SvgIcon },
  setup () {
    const refXterm = ref<HTMLElement | null>(null)

    let xterm: Terminal | null = null
    // eslint-disable-next-line no-undef
    let socket: Socket | null = null

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

    function init (opts?: Parameters<BuildInActions['xterm.init']>['0']) {
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
        registerHook('THEME_CHANGE', changeTheme)
        registerHook('GLOBAL_RESIZE', fitXterm)

        if (FLAG_DEMO) {
          const message = t('demo-tips')
          xterm.write(message)
          return
        }
      }

      const query = {
        cwd: opts?.cwd || store.state.currentRepo?.path || ''
      }

      if (!socket) {
        const uri = location.protocol.startsWith('http')
          ? location.origin
          : 'http://' + location.hostname + ':' + $args().get('port')

        socket = io(uri, { path: '/ws', query })

        xterm.onResize(size => socket!.emit('resize', [size.cols, size.rows]))
        xterm.onData(input)
        socket.on('output', (arrayBuffer: any) => xterm!.write(arrayBuffer))
        socket.on('disconnect', () => {
          xterm!.clear()
          toggleXterm(false)
        })
      }

      // force trigger resize event
      xterm.resize(xterm.cols, xterm.cols)

      if (!socket.connected) {
        socket.io.opts.query = query
        socket.connect()
      }

      focus()
    }

    async function runInXterm (cmd: { code: string, start?: string, exit?: string } | string) {
      if (FLAG_DISABLE_XTERM) {
        logger.warn('xterm disabled')
        return
      }

      toggleXterm(true)

      await nextTick()

      init()

      const eol = isWindows ? '\r\n' : '\n'

      if (typeof cmd === 'string') {
        cmd = { code: cmd }
      }

      if (cmd.start) {
        input(cmd.start)
        input(eol)
        // wait for child process ready.
        await sleep(400)
      }

      cmd.code.split('\n').forEach(x => {
        input(x.trim())
        input(eol)
      })

      if (cmd.exit) {
        input(cmd.exit)
        input(eol)
      }
    }

    onBeforeMount(() => {
      registerAction({ name: 'xterm.run', handler: runInXterm })
      registerAction({ name: 'xterm.init', handler: init })
    })

    onBeforeUnmount(() => {
      removeAction('xterm.run')
      removeAction('xterm.init')
      removeHook('THEME_CHANGE', changeTheme)
      removeHook('GLOBAL_RESIZE', fitXterm)
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
  padding-right: 0;
  padding-top: 0;
  border-right: 0;
}

.xterm ::v-deep(textarea) {
  transition: none;
}

.hide {
  position: absolute;
  top: -6px;
  right: 0;
  z-index: 10;
  background: var(--g-color-75);
  border-bottom-left-radius: var(--g-border-radius);
  border-bottom-right-radius: var(--g-border-radius);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform: scaleY(0.6);
  border: 8px solid transparent;
  box-sizing: border-box;
  color: var(--g-color-20);
  opacity: 0;
  transition: opacity .2s;
}

.xterm:hover .hide {
  opacity: 1;
}

.hide:hover {
  background: var(--g-color-65);
}
</style>
