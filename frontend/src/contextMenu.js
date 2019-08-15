import Menu from '@/components/ContextMenu'

export default {
  install (Vue, options) {
    const ModalUiInstance = Vue.extend(Menu)
    const instance = new ModalUiInstance()
    document.body.appendChild(instance.$mount().$el)

    Vue.prototype.$contextMenu = instance
  }
}
