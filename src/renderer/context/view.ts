import { getActionHandler } from './action'

export type HookType = 'ON_VIEW_ELEMENT_CLICK'
  | 'ON_VIEW_ELEMENT_DBCLICK'
  | 'ON_VIEW_KEY_DOWN'
  | 'ON_VIEW_SCROLL'
  | 'ON_VIEW_RENDER'
  | 'ON_VIEW_RENDERED'
  | 'ON_VIEW_MOUNTED'
  | 'ON_VIEW_FILE_CHANGE'
  | 'ON_VIEW_BEFORE_CONVERT'

export type ActionName = 'view.refresh' | 'view.reveal-line' | 'view.scroll-top-to'

export function refresh () {
  getActionHandler('view.refresh')()
}

export function revealLine (line: number) {
  getActionHandler('view.reveal-line')(line)
}

export function scrollTopTo (top: number) {
  getActionHandler('view.scroll-top-to')(top)
}
