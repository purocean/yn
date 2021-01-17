import { getLogger } from './utils'

const logger = getLogger('shortcut')

const isMacOS = /macintosh|mac os x/i.test(navigator.userAgent)
const Ctrl = 'Ctrl'
const CtrlCmd = 'CtrlCmd'
const Alt = 'Alt'
const Shift = 'Shift'
const LeftClick = 0

type XKey = typeof Ctrl | typeof CtrlCmd | typeof Alt | typeof Shift

const actions = {
  'toggle-side': [Alt, 'e'],
  'toggle-wrap': [Alt, 'w'],
  'toggle-view': [Alt, 'v'],
  'toggle-xterm': [Alt, 't'],
  'toggle-readme': [Alt, 'h'],
  'insert-document': [CtrlCmd, Alt, 'i'],
  'show-quick-open': [CtrlCmd, 'p'],
  'transform-img-link-by-click': [CtrlCmd, Shift, LeftClick],
  'transform-img-link': [CtrlCmd, Shift, 'l'],
  'file-tabs-switch-left': [Ctrl, Alt, 'ArrowLeft'],
  'file-tabs-switch-right': [Ctrl, Alt, 'ArrowRight'],
}

type ActionName = keyof typeof actions

export const hasCtrlCmd = (e: KeyboardEvent | MouseEvent) => isMacOS ? e.metaKey : e.ctrlKey

export const getKeyLabel = (key: XKey | string | number) => {
  switch (key) {
    case CtrlCmd:
      return isMacOS ? 'Cmd' : 'Ctrl'

    case Alt:
      return isMacOS ? 'Option' : 'Alt'

    default:
      return key.toString().toUpperCase()
  }
}

export const getActionLabel = (name: ActionName) => {
  const keys: any[] = actions[name]
  return keys.map(getKeyLabel).join(' + ')
}

export const matchKeys = (e: KeyboardEvent | MouseEvent, keys: (string | number)[]) => {
  for (const key of keys) {
    switch (key) {
      case CtrlCmd:
        if (!hasCtrlCmd(e)) return false
        break
      case Alt:
        if (!e.altKey) return false
        break
      case Ctrl:
        if (!e.ctrlKey) return false
        break
      case Shift:
        if (!e.shiftKey) return false
        break
      default:
        if (e instanceof KeyboardEvent) {
          if (key !== e.key && `Key${key.toString().toUpperCase()}` !== e.code) return false
        } else {
          if (key !== e.button) return false
        }
    }
  }

  return true
}

export const getCurrentAction = (e: KeyboardEvent | MouseEvent) => {
  logger.debug('getCurrentAction', { e })
  return (Object.keys(actions) as ActionName[]).find(action => matchKeys(e, actions[action]))
}

export const isAction = (e: KeyboardEvent | MouseEvent, name: ActionName) => {
  logger.debug('isAction', name, e)
  return matchKeys(e, actions[name])
}
