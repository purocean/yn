import { createApp, defineComponent, shallowRef } from 'vue'
import type { Components } from '@fe/types'
import QuickFilter from '@fe/components/QuickFilter.vue'

interface Opts extends Components.QuickFilter.Props {
  onInput?: (keyword: string) => void;
  onChoose?: (item: Components.QuickFilter.Item) => void;
}

export interface Instance {
  show: (opts: Opts) => void;
  hide: () => void;
}

let instance: Instance

/**
 * Get a quick filter instance.
 * @returns instance
 */
export function useQuickFilter (): Instance {
  return instance
}

export default function install () {
  const quickFilter = createApp(defineComponent({
    setup (props, { expose }) {
      const attrs = shallowRef<Opts | null>(null)

      function show (opts: Opts) {
        attrs.value = opts
      }

      function hide () {
        attrs.value = null
      }

      expose({ show, hide })

      return () => attrs.value && <QuickFilter {...attrs.value} onClose={hide} />
    },
  }))

  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = quickFilter.mount(el) as any
}
