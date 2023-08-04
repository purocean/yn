import { App } from 'vue'

export function install (app: App) {
  app.directive('fixed-float', {
    mounted (el: HTMLElement, binding) {
      const { value } = binding

      if (typeof value !== 'object') {
        return
      }

      const { onClose } = value

      el.tabIndex = 0
      if (!el.style.outline) {
        el.style.outline = 'none'
      }

      let byClickSelf = false

      el.addEventListener('mousedown', () => {
        byClickSelf = true
      }, true)

      el.addEventListener('mouseup', () => {
        byClickSelf = false
        el.focus()
      }, true)

      el.addEventListener('blur', () => {
        onClose(byClickSelf)
      })

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      })

      el.focus()
    }
  })
}
