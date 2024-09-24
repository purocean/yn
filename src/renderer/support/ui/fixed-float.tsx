import { Component, createApp, defineComponent, shallowRef } from 'vue'
import type { Components } from '@fe/types'
import directives from '@fe/directives'
import FixedFloat from '@fe/components/FixedFloat.vue'

interface Opts extends Components.FixedFloat.Props {
  component: Component
}

export interface Instance {
  show: (opts: Opts) => void;
  hide: () => void;
}

let instance: Instance

/**
 * Get a fixed float instance.
 * @returns instance
 */
export function useFixedFloat (): Instance {
  return instance
}

export default function install () {
  const fixedFloat = createApp(defineComponent({
    name: 'g-fixed-float',
    setup (props, { expose }) {
      const attrs = shallowRef<Opts | null>(null)

      function show (opts: Opts) {
        attrs.value = opts
      }

      function hide () {
        attrs.value = null
      }

      expose({ show, hide })

      return () => attrs.value && <FixedFloat {...attrs.value} onClose={hide}>
        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <attrs.value.component />
      </FixedFloat>
    },
  }))

  fixedFloat.use(directives)

  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = fixedFloat.mount(el) as any
}
