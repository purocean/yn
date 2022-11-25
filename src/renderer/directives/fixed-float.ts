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

      el.addEventListener('blur', () => {
        onClose()
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
