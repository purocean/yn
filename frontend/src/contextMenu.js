import Menu from '@/components/ContextMenu'

export default {
  install (Vue, options) {
    const MenuInstance = Vue.extend(Menu)
    const instance = new MenuInstance()
    document.body.appendChild(instance.$mount().$el)

    Vue.prototype.$contextMenu = instance
  }
}
