<template>
  <div class="xterm-dom" ref="domRef" style="height: 100%; width: 100%;" />
</template>

<script lang="ts">
import io, { Socket } from 'socket.io-client'
import { defineComponent, onBeforeUnmount, ref } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { OneHalfLight, OneHalfDark } from 'xterm-theme'
import { getLogger } from '@fe/utils'
import { registerHook, removeHook } from '@fe/core/hook'
import { $args, FLAG_DEMO, FLAG_DISABLE_XTERM } from '@fe/support/args'
import { getColorScheme } from '@fe/services/theme'
import { isWindows, openWindow } from '@fe/support/env'
import { t } from '@fe/services/i18n'
import type { Components } from '@fe/types'

import '@xterm/xterm/css/xterm.css'

const logger = getLogger('component-x-term')

export default defineComponent({
  name: 'xterm',
  setup (_, { emit }) {
    const domRef = ref<HTMLElement | null>(null)

    let xterm: Terminal | null = null
    // eslint-disable-next-line no-undef
    let socket: Socket | null = null
    let resizeObserver: ResizeObserver | null = null

    let fitAddon: FitAddon | null = null
    let webLinksAddon: WebLinksAddon | null = null
    let webglAddon: WebglAddon | null = null

    function fitXterm () {
      fitAddon?.fit()
      emit('fit')
    }

    function changeTheme () {
      if (xterm) {
        const dark = getColorScheme() === 'dark'
        OneHalfDark.background = '#1a1b1d'
        OneHalfLight.selection = 'rgba(0, 0, 0, .1)'
        xterm.options.theme = dark ? OneHalfDark : OneHalfLight
      }
    }

    function input (data: string, addNewLine?: boolean) {
      socket?.emit('input', data)

      if (addNewLine) {
        const eol = isWindows ? '\r\n' : '\n'
        socket?.emit('input', eol)
      }
    }

    function focus () {
      xterm?.focus()
    }

    function init (opts?: Components.XTerm.InitOpts) {
      if (FLAG_DISABLE_XTERM) {
        logger.warn('xterm disabled')
        return
      }

      if (!xterm) {
        xterm = new Terminal({
          cols: 80,
          rows: 24,
          fontSize: 16,
          cursorStyle: 'underline',
          // fontFamily: 'Consolas',
          fontWeightBold: '500',
          ...opts
        })

        changeTheme()

        fitAddon = new FitAddon()
        webglAddon = new WebglAddon()
        webLinksAddon = new WebLinksAddon((_e, uri) => {
          openWindow(uri)
        })

        xterm.loadAddon(fitAddon)
        xterm.loadAddon(webLinksAddon)
        xterm.loadAddon(webglAddon)

        xterm.open(domRef.value!)
        fitAddon.fit()
        registerHook('THEME_CHANGE', changeTheme)

        resizeObserver = new ResizeObserver((entires) => {
          const entry = entires[0]
          // do not fit when size too small
          if (entry.contentRect.width < 5 || entry.contentRect.height < 5) {
            return
          }

          fitXterm()
        })
        resizeObserver.observe(domRef.value!)

        if (FLAG_DEMO) {
          const message = t('demo-tips')
          xterm.write(message)
          return
        }
      }

      if (FLAG_DEMO) {
        return
      }

      const query = {
        cwd: opts?.cwd || '',
        env: JSON.stringify(opts?.env || {}),
      }

      if (!socket) {
        const uri = location.protocol.startsWith('http')
          ? location.origin
          : 'http://' + location.hostname + ':' + $args().get('port')

        socket = io(uri, { path: '/ws', query })

        xterm.onResize(size => socket!.emit('resize', [size.cols, size.rows]))
        xterm.onData(data => socket!.emit('input', data))
        socket.on('output', (arrayBuffer: any) => xterm!.write(arrayBuffer))
        socket.on('disconnect', () => {
          dispose()
          opts?.onDisconnect?.()
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

    function dispose () {
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }

      if (socket) {
        socket.disconnect()
        socket = null
      }

      if (xterm) {
        xterm.dispose()
        xterm = null
      }

      fitAddon = null
      webLinksAddon = null

      removeHook('THEME_CHANGE', changeTheme)
    }

    onBeforeUnmount(() => {
      dispose()
    })

    return {
      domRef,
      init,
      input,
      fit: fitXterm,
      dispose,
      getXterm: () => xterm,
      getSocket: () => socket,
    } satisfies Components.XTerm.Ref
  },
})
</script>

<style scoped>
.xterm-dom ::v-deep(textarea) {
  transition: none;
}
</style>
