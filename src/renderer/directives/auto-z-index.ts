import { App } from 'vue'
import { registerHook, removeHook } from '@fe/core/hook'

let globalZIndex = 0
const stack: number[] = []

const layers = {
  popup: 2e5,
  modal: 3e5,
  'context-menu': 9e6,
  max: 2e8,
}

export function install (app: App) {
  const getKeydownHandler = (zIndex: number, onEsc: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // close top layer
      if (!stack.includes(zIndex) || Math.max(...stack) !== zIndex) {
        return
      }

      onEsc()
      e.stopPropagation()
    }
  }

  app.directive('auto-z-index', {
    mounted (el: HTMLElement, binding) {
      const value: { layer: keyof typeof layers, onEsc?: () => void } = binding.value
      const layer = value.layer || 'popup'
      const baseZIndex = layers[layer] || layers.popup

      const zIndex = baseZIndex + globalZIndex++
      ;(el as any)._autoZIndex = zIndex
      stack.push(zIndex)
      el.style.zIndex = zIndex.toString()

      const globalKeydownHandler = value.onEsc && getKeydownHandler(zIndex, value.onEsc)
      if (globalKeydownHandler) {
        registerHook('GLOBAL_KEYDOWN', globalKeydownHandler)
        ;(el as any)._autoZIndexKeydownHandler = globalKeydownHandler
      }
    },
    beforeUnmount: (el: HTMLElement) => {
      const zIndex = (el as any)._autoZIndex
      const index = stack.indexOf(zIndex)
      if (index !== -1) {
        stack.splice(index, 1)
      }

      const keydownHandler = (el as any)._autoZIndexKeydownHandler
      if (keydownHandler) {
        removeHook('GLOBAL_KEYDOWN', keydownHandler)
      }
    }
  })
}
