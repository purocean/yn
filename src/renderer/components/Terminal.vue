<template>
  <div class="terminal">
    <div class="hide" @click="$emit('hide')">
      <SvgIcon style="width: 20px; height: 20px" name="chevron-down" />
    </div>
    <x-term ref="refXterm" />
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, onBeforeMount, onBeforeUnmount, ref } from 'vue'
import { getLogger, sleep } from '@fe/utils'
import { registerAction, removeAction } from '@fe/core/action'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import { toggleXterm } from '@fe/services/layout'
import type { Components } from '@fe/types'
import SvgIcon from './SvgIcon.vue'
import XTerm from './Xterm.vue'
import store from '@fe/support/store'

const logger = getLogger('component-terminal')

export default defineComponent({
  name: 'terminal',
  components: { SvgIcon, XTerm },
  setup () {
    const refXterm = ref<Components.XTerm.Ref | null>(null)

    function init (opts?: Components.XTerm.InitOpts) {
      refXterm.value?.init({
        ...opts,
        cwd: opts?.cwd || store.state.currentRepo?.path || '',
        onDisconnect: () => {
          toggleXterm(false)
        },
      })
    }

    function input (data: string, addNewLine?: boolean) {
      refXterm.value?.input(data, addNewLine)
    }

    async function runInXterm (cmd: { code: string, start?: string, exit?: string } | string) {
      if (FLAG_DISABLE_XTERM) {
        logger.warn('terminal disabled')
        return
      }

      toggleXterm(true)

      await nextTick()

      init()

      if (typeof cmd === 'string') {
        cmd = { code: cmd }
      }

      if (cmd.start) {
        input(cmd.start, true)
        // wait for child process ready.
        await sleep(400)
      }

      cmd.code.split('\n').forEach(x => {
        input(x, true)
      })

      if (cmd.exit) {
        input(cmd.exit, true)
      }
    }

    onBeforeMount(() => {
      registerAction({ name: 'xterm.run', handler: runInXterm })
      registerAction({ name: 'xterm.init', handler: init })
    })

    onBeforeUnmount(() => {
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
.terminal {
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

.terminal:hover .hide {
  opacity: 1;
}

.hide:hover {
  background: var(--g-color-65);
}
</style>
