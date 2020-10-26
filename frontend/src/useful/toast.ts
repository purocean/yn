import { App, ComponentPublicInstance, createApp } from 'vue'
import Toast from '@/components/Toast.vue'
import { Components } from '@/types'

interface ToastInstance extends ComponentPublicInstance {
  show: (type: Components.Toast.ToastType, content: string, timeout?: number) => void;
}

let instance: ToastInstance

export function useToast (): ToastInstance {
  return instance
}

export default function install (app: App) {
  const toast = createApp(Toast)
  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = toast.mount(el) as ToastInstance
  app.config.globalProperties.$toast = instance
}
