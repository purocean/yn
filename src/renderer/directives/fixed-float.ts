import type { App, DirectiveBinding } from 'vue'

export function install (app: App) {
  app.directive('fixed-float', {
    mounted (el: HTMLElement, binding: DirectiveBinding<{
      disableAutoFocus?: boolean,
      onClose: (byClickSelf?: boolean) => void,
      onBlur?: (byClickSelf?: boolean) => void
    } | undefined>) {
      const { value } = binding

      if (typeof value !== 'object') {
        return
      }

      const { onBlur, onClose, disableAutoFocus } = value

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
        onBlur?.(byClickSelf)
        onClose(byClickSelf)
      })

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      })

      if (!disableAutoFocus) {
        el.focus()
      }
    }
  })
}
