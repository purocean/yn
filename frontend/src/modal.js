import ModalUi from '@/components/ModalUi'

export default {
  install (Vue, options) {
    const ModalUiInstance = Vue.extend(ModalUi)
    const instance = new ModalUiInstance()
    document.body.appendChild(instance.$mount().$el)

    Vue.prototype.$modal = instance
  }
}
