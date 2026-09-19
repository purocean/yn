import { getEffectiveKeybinding, normalizePhysicalKey, parseKeybinding } from './keybinding'

export function getNonUsEditorKeys (keys: string | null, binding?: string | null): string | null {
  if (!parseKeybinding(binding)) {
    return keys
  }
  const effective = getEffectiveKeybinding(keys, binding)
  return effective?.split('+').map(key => key === 'Plus' ? '=' : normalizePhysicalKey(key)).join('+') || null
}

export function getNonUsAccelerator (keys: string | null, binding?: string | null): string | undefined {
  const effective = getEffectiveKeybinding(keys, binding)
  if (!effective) {
    return undefined
  }

  const parts = effective.split('+').map(part => part === 'Win' ? 'Super' : part)
  const key = normalizePhysicalKey(parts.pop()!)
  const numpadKeys: Record<string, string> = {
    Add: 'add', Subtract: 'sub', Multiply: 'mult', Divide: 'div', Decimal: 'dec',
  }
  parts.push(key.startsWith('Numpad')
    ? `num${numpadKeys[key.slice(6)] || key.slice(6)}`
    : key === '+' ? 'Plus' : key)
  return parts.join('+')
}
