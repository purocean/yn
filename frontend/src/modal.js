import ModalUi from '@/components/ModalUi'

let instance = null

export default {
  install (Vue, options) {
    const ModalUiInstance = Vue.extend(ModalUi)
    instance = new ModalUiInstance()
    document.body.appendChild(instance.$mount().$el)

    Vue.prototype.$modal = instance
  }
}
