import { App, ComponentPublicInstance, createApp } from 'vue'
import { Components } from '@fe/types'
import Modal from '@fe/components/ContextMenu.vue'

interface Instance extends ComponentPublicInstance {
  show: (menuItems: Components.ContextMenu.Item[]) => void;
}

let instance: Instance

export function useContextMenu (): Instance {
  return instance
}

export default function install (app: App) {
  const toast = createApp(Modal)
  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = toast.mount(el) as Instance
  app.config.globalProperties.$modal = instance
}
