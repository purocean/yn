import { App } from 'vue'

export function install (app: App) {
  app.directive('textarea-on-enter', {
    mounted (el: HTMLElement, binding) {
      const { value } = binding

      el.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key !== 'Enter' || e.isComposing) {
          return
        }

        e.preventDefault()

        const target = e.target as HTMLInputElement

        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
          const start = target.selectionStart
          const end = target.selectionEnd
          const content = target.value

          if (start !== null && end !== null) {
            // why we need to insert \n manually?
            // if we use e.preventDefault(), the \n will be inserted automatically but only works with shift key
            target.value = content.slice(0, start) + '\n' + content.slice(end)
            target.dispatchEvent(new Event('input'))
            target.setSelectionRange(start + 1, start + 1)
          }
        } else {
          value?.()
        }
      })
    }
  })
}
