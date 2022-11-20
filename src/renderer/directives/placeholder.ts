import { App } from 'vue'

export function install (app: App) {
  app.directive('placeholder', {
    mounted (el, binding) {
      const { value } = binding
      const { focus, blur } = value

      if (el === document.activeElement) {
        el.placeholder = focus
      } else {
        el.placeholder = blur
      }

      el.addEventListener('focus', () => {
        el.placeholder = focus
      })

      el.addEventListener('blur', () => {
        el.placeholder = blur
      })
    }
  })
}
