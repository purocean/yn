import type { App, DirectiveBinding } from 'vue'

export function install (app: App) {
  app.directive('fixed-float', {
    mounted (el: HTMLElement, binding: DirectiveBinding<{
      disableAutoFocus?: boolean,
      onClose: (type: 'byClickSelf' | 'blur' | 'esc') => void,
      onBlur?: (byClickSelf?: boolean) => void
      onEsc?: () => void
    } | undefined>) {
      const { value } = binding

      if (typeof value !== 'object') {
        return
      }

      const { onBlur, onClose, onEsc, disableAutoFocus } = value

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
        onClose(byClickSelf ? 'byClickSelf' : 'blur')
      })

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          onEsc?.()
          onClose('esc')
        }
      })

      if (!disableAutoFocus) {
        el.focus()
      }
    }
  })
}
