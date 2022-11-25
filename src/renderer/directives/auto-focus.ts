import { App, nextTick } from 'vue'

export function install (app: App) {
  app.directive('auto-focus', {
    mounted (el: HTMLElement, binding) {
      const { value = {} } = binding
      const { delay } = value

      if (delay === true) {
        nextTick(() => {
          el.focus()
        })
      } else if (typeof delay === 'number') {
        setTimeout(() => {
          el.focus()
        }, delay)
      } else {
        el.focus()
      }
    }
  })
}
