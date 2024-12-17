import { omit } from 'lodash-es'
import { Component, createApp, defineComponent, nextTick, shallowRef } from 'vue'
import type { Components } from '@fe/types'
import directives from '@fe/directives'
import FixedFloat from '@fe/components/FixedFloat.vue'

interface Opts extends Components.FixedFloat.Props {
  component: Component;
  closeOnBlur?: boolean;
  closeOnEsc?: boolean;
  onBlur?: (byClickSelf?: boolean) => void;
  onEsc?: () => void;
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

      function onClose (type: 'byClickSelf' | 'blur' | 'esc' | 'btn') {
        if (type === 'byClickSelf') {
          return
        }

        if (attrs.value?.closeOnBlur !== false && type === 'blur') {
          hide()
        } else if (attrs.value?.closeOnEsc !== false && type === 'esc') {
          hide()
        } else if (type === 'btn') {
          hide()
        }
      }

      function onBlur (clickBySelf: boolean) {
        attrs.value?.onBlur?.(clickBySelf)
      }

      function onEsc () {
        attrs.value?.onEsc?.()
      }

      expose({ show, hide })

      return () => attrs.value && <FixedFloat {...omit(attrs.value, 'component', 'closeOnBlur')} onClose={onClose} onBlur={onBlur} onEsc={onEsc}>
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
