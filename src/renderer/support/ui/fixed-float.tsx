import { omit } from 'lodash-es'
import { Component, createApp, defineComponent, nextTick, shallowRef } from 'vue'
import type { Components } from '@fe/types'
import directives from '@fe/directives'
import FixedFloat from '@fe/components/FixedFloat.vue'

interface Opts extends Components.FixedFloat.Props {
  component: Component;
  closeOnBlur?: boolean;
  onBlur?: (byClickSelf?: boolean) => void;
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
        if (attrs.value) {
          hide()
          nextTick(() => show(opts))
        } else {
          attrs.value = opts
        }
      }

      function hide () {
        attrs.value = null
      }

      function onClose (clickBySelf: boolean) {
        if (attrs.value?.closeOnBlur === false) {
          return
        }

        if (clickBySelf) {
          return
        }

        hide()
      }

      function onBlur (clickBySelf: boolean) {
        attrs.value?.onBlur?.(clickBySelf)
      }

      expose({ show, hide })

      return () => attrs.value && <FixedFloat {...omit(attrs.value, 'component', 'closeOnBlur')} onClose={onClose} onBlur={onBlur}>
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
