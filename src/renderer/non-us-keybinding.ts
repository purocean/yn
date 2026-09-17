import { normalizePhysicalKey, parseKeybinding } from '@share/keybinding'
import type { RecordedKeybinding } from '@share/keybinding'
import { registerHook } from '@fe/core/hook'

let enabled = window._INIT_SETTINGS?.['keybindings.non-us-layout'] === true

registerHook('SETTING_FETCHED', ({ settings }) => {
  enabled = settings['keybindings.non-us-layout'] === true
})

export function isNonUsLayoutEnabled () {
  return enabled
}

const physicalPrefixes = ['KEY', 'DIGIT', 'NUMPAD', 'ARROW']
const physicalNames = new Set([
  'BACKQUOTE', 'BACKSLASH', 'BRACKETLEFT', 'BRACKETRIGHT', 'COMMA',
  'EQUAL', 'MINUS', 'PERIOD', 'QUOTE', 'SEMICOLON', 'SLASH', 'SPACE', 'TAB',
])

const arrowAliases: Record<string, string> = {
  UP: 'ARROWUP', DOWN: 'ARROWDOWN', LEFT: 'ARROWLEFT', RIGHT: 'ARROWRIGHT',
}

export function matchNonUsKey (e: KeyboardEvent, key: string, binding?: string | null) {
  const parsed = parseKeybinding(binding)
  const code = (e.code || '').toUpperCase()
  const name = key.toUpperCase()
  const logical = (e.key || '').toUpperCase()

  // Existing entries without metadata retain the old matching behavior.
  if (binding !== undefined && !parsed) {
    return name === logical || name === code ||
      code === `KEY${name}` || code === `DIGIT${name}` || code === `ARROW${name}`
  }

  if (parsed && (Boolean(e.getModifierState?.('AltGraph')) !== parsed.altGraph ||
    (parsed.location > 0 && e.location !== parsed.location))) {
    return false
  }

  if (name === 'PLUS') {
    return e.key === '+'
  }
  if (name === code && name !== logical) {
    return true
  }
  if (physicalPrefixes.some(prefix => name.startsWith(prefix)) || physicalNames.has(name)) {
    return name === code
  }
  if (name === logical || arrowAliases[name] === logical) {
    return true
  }
  if ((e.key === 'Dead' || e.key === 'Unidentified') && code === `KEY${name}`) {
    return true
  }

  // Legacy `+` is stored as `=` because `+` separates settings tokens.
  return name === '=' && logical === '+' && code === 'EQUAL'
}

function getRecordedKey (e: KeyboardEvent) {
  const key = e.key || ''
  const code = e.code || ''

  if (code.startsWith('Numpad')) {
    return code
  }
  if (key === 'Dead' || key === 'Unidentified') {
    return normalizePhysicalKey(code)
  }
  if (key === ' ') {
    return 'Space'
  }
  if (key === '+') {
    return '='
  }
  if (key.length === 1) {
    return key.toLowerCase()
  }
  if (key.startsWith('Arrow')) {
    return key.slice(5)
  }

  return key
}

export function recordNonUsKey (e: KeyboardEvent): { key: string, binding: RecordedKeybinding } | null {
  if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(e.key)) {
    return null
  }

  const key = getRecordedKey(e)
  if (!key) {
    return null
  }

  // Monaco has no KeyCode for many produced symbols, such as Shift+1 -> !.
  const physical = e.code.startsWith('Numpad') || e.key === 'Dead' || e.key === 'Unidentified' ||
    (e.key.length === 1 && e.key !== ' ' && !/^[a-z0-9]$/i.test(e.key))

  return {
    key,
    binding: {
      mode: physical ? 'code' : 'key',
      key: e.key || key,
      code: e.code || '',
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
      altGraph: e.getModifierState?.('AltGraph') || false,
      location: e.location || 0,
    },
  }
}
