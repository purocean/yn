import { shallowRef } from 'vue'

export const titleBarTabsContainer = shallowRef<HTMLElement | null>(null)
let tabsLeft = 0

function applyTabsLeft () {
  titleBarTabsContainer.value?.style.setProperty('--tabs-left', `${tabsLeft}px`)
}

export function setTitleBarTabsContainer (container: HTMLElement | null) {
  titleBarTabsContainer.value = container
  applyTabsLeft()
}

export function setTitleBarTabsLeft (left: number) {
  if (!Number.isFinite(left)) {
    return
  }

  tabsLeft = Math.max(0, left)
  applyTabsLeft()
}
