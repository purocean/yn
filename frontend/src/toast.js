import Toast from '@/components/Toast'

export default {
  install (Vue, options) {
    const ToastInstance = Vue.extend(Toast)
    const instance = new ToastInstance()
    document.body.appendChild(instance.$mount().$el)

    Vue.prototype.$toast = instance
  }
}
