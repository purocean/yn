import { getLogger } from '@fe/utils'
import env from '@fe/utils/env'

const logger = getLogger('shortcut')

const isMacOS = env.isMacOS
export const Ctrl = 'Ctrl'
export const CtrlCmd = 'CtrlCmd'
export const Alt = 'Alt'
export const Shift = 'Shift'
export const LeftClick = 0

type XKey = typeof Ctrl | typeof CtrlCmd | typeof Alt | typeof Shift

const defaultActions = {
  'file-tabs-switch-left': [Ctrl, Alt, 'ArrowLeft'],
  'file-tabs-switch-right': [Ctrl, Alt, 'ArrowRight'],
}

const actions: {[key: string]: (string | number)[]} = {
  ...defaultActions
}

type ActionName = keyof typeof defaultActions

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

export function isAction (e: KeyboardEvent | MouseEvent, name: ActionName): boolean
export function isAction (e: KeyboardEvent | MouseEvent, name: string): boolean
export function isAction (e: KeyboardEvent | MouseEvent, name: string) {
  logger.debug('isAction', name, e)
  return !!actions[name] && matchKeys(e, actions[name])
}

export function getActionLabel (name: ActionName): string
export function getActionLabel (name: string): string
export function getActionLabel (name: string): string {
  const keys: any[] = actions[name]
  return keys.map(getKeyLabel).join(' + ')
}

export function addAction (name: ActionName, keys: (string | number)[]): void
export function addAction (name: string, keys: (string | number)[]): void
export function addAction (name: string, keys: (string | number)[]): void {
  actions[name] = keys
}
