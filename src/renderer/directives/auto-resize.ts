import { App, nextTick } from 'vue'

export function install (app: App) {
  app.directive('auto-resize', {
    mounted (el, binding) {
      const { value } = binding
      const { minRows, maxRows } = value

      const style = window.getComputedStyle(el)
      const lineHeight = parseFloat(style.lineHeight)
      const paddingTop = parseFloat(style.paddingTop)
      const paddingBottom = parseFloat(style.paddingBottom)

      const min = minRows * lineHeight + paddingTop + paddingBottom
      const max = maxRows * lineHeight + paddingTop + paddingBottom

      const resize = () => {
        el.style.height = 'auto'
        el.style.overflowY = 'auto'

        const height = el.scrollHeight
        if (height < min) {
          el.style.height = min + 'px'
          el.style.overflowY = 'auto'
        } else if (height > max) {
          el.style.height = max + 'px'
          el.style.overflowY = 'auto'
        } else {
          el.style.height = height + 'px'
          el.style.overflowY = 'hidden'
        }
      }

      el.addEventListener('input', resize)
      nextTick(resize)
    }
  })
}
