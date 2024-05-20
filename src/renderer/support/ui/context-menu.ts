import { App, ComponentPublicInstance, createApp } from 'vue'
import type { Components } from '@fe/types'
import Modal from '@fe/components/ContextMenu.vue'
import directives from '@fe/directives'

export interface Instance extends ComponentPublicInstance {
  show: (menuItems: Components.ContextMenu.Item[], opts?: Components.ContextMenu.ShowOpts) => void;
  hide: () => void;
}

let instance: Instance

/**
 * Get ContextMenu instance
 * @returns instance
 */
export function useContextMenu (): Instance {
  return instance
}

export default function install (app: App) {
  const contextMenu = createApp(Modal)
  contextMenu.use(directives)

  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = contextMenu.mount(el) as Instance
  app.config.globalProperties.$modal = instance
}
