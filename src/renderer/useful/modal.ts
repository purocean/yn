import { App, ComponentPublicInstance, createApp } from 'vue'
import { Components } from '@fe/types'
import Modal from '@fe/components/ModalUi.vue'

interface Instance extends ComponentPublicInstance {
  confirm: (params: Components.Modal.ConfirmModalParams) => Promise<boolean>;
  input: (params: Components.Modal.InputModalParams) => Promise<string>;
}

let instance: Instance

export function useModal (): Instance {
  return instance
}

export default function install (app: App) {
  const toast = createApp(Modal)
  const el = document.createElement('div')
  document.body.appendChild(el)

  instance = toast.mount(el) as Instance
  app.config.globalProperties.$modal = instance
}
