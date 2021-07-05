import { nextTick } from 'vue'
import store from '@fe/support/store'
import { useBus } from '@fe/support/bus'
import { getAction, registerAction } from './action'

export type ActionName = 'layout.toggle-view'
  | 'layout.toggle-side'
  | 'layout.toggle-xterm'

const bus = useBus()

export function emitResize () {
  nextTick(() => bus.emit('resize'))
}

export function toggleSide () {
  store.commit('setShowSide', !store.state.showSide)
  emitResize()
}

export function toggleView () {
  store.commit('setShowView', !store.state.showView)
  emitResize()
}

export function toggleXterm (val?: boolean) {
  const showXterm = store.state.showXterm
  const show = typeof val === 'boolean' ? val : !showXterm

  store.commit('setShowXterm', show)

  nextTick(() => {
    emitResize()

    if (showXterm) {
      getAction('xterm.init')()
    }
  })
}

registerAction('layout.toggle-view', toggleView)
registerAction('layout.toggle-side', toggleSide)
registerAction('layout.toggle-xterm', toggleXterm)
