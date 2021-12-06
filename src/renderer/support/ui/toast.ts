import { App, ComponentPublicInstance, createApp } from 'vue'
import Toast from '@fe/components/Toast.vue'
import { Components } from '@fe/types'

export interface Instance extends ComponentPublicInstance {
  show: (type: Components.Toast.ToastType, content: string, timeout?: number) => void;
  hide: () => void;
}

let instance: Instance

/**
 * Get toast instance.
 * @returns instance
 */
export function useToast (): Instance {
  return instance
}

export default function install (app: App) {
  const toast = createApp(Toast)
  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = toast.mount(el) as Instance
  app.config.globalProperties.$toast = instance
}
