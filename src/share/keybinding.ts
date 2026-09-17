const modifiers = ['ctrl', 'alt', 'shift', 'meta', 'altGraph'] as const

const modifierAliases = [
  { field: 'ctrl', names: ['ctrl', 'control', 'ctrlcmd'], fallback: 'Ctrl' },
  { field: 'alt', names: ['alt'], fallback: 'Alt' },
  { field: 'shift', names: ['shift'], fallback: 'Shift' },
  { field: 'meta', names: ['meta', 'cmd', 'command', 'win'], fallback: 'Meta' },
] as const

export type KeybindingMode = 'key' | 'code'

export type RecordedKeybinding = {
  mode: KeybindingMode,
  key: string,
  code: string,
  ctrl: boolean,
  alt: boolean,
  shift: boolean,
  meta: boolean,
  altGraph: boolean,
  location: number,
}

function encodeValue (value: string | number) {
  return encodeURIComponent(String(value))
}

function decodeValue (value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/**
 * Parse the compact binding format, for example:
 * `mode=key,key=w,code=KeyZ,ctrl,location=0`.
 * Boolean modifier fields are present only when true.
 */
export function parseKeybinding (binding: string | null | undefined): RecordedKeybinding | null {
  if (!binding) {
    return null
  }

  const values: Partial<Record<keyof RecordedKeybinding, string>> = {}
  for (const part of binding.split(',')) {
    const separator = part.indexOf('=')
    if (separator < 0) {
      if ((modifiers as readonly string[]).includes(part)) {
        values[part as keyof RecordedKeybinding] = '1'
        continue
      }
      return null
    }

    const key = part.slice(0, separator) as keyof RecordedKeybinding
    const value = decodeValue(part.slice(separator + 1))
    if (!key || value === null) {
      return null
    }
    values[key] = value
  }

  const location = Number(values.location)
  if ((values.mode !== 'key' && values.mode !== 'code') || values.key === undefined || values.code === undefined ||
    !Number.isInteger(location) || location < 0) {
    return null
  }

  return {
    mode: values.mode,
    key: values.key,
    code: values.code,
    ctrl: values.ctrl === '1' || values.ctrl === 'true',
    alt: values.alt === '1' || values.alt === 'true',
    shift: values.shift === '1' || values.shift === 'true',
    meta: values.meta === '1' || values.meta === 'true',
    altGraph: values.altGraph === '1' || values.altGraph === 'true',
    location,
  }
}

/**
 * Serialize all recorded KeyboardEvent information. Fields with false
 * modifier values are omitted to keep the persisted string concise.
 */
export function serializeKeybinding (binding: RecordedKeybinding | null | undefined): string | null {
  if (!binding || !binding.code) {
    return null
  }

  const fields = [
    ['mode', binding.mode],
    ['key', binding.key],
    ['code', binding.code],
  ] as [string, string | number][]

  for (const modifier of modifiers) {
    if (binding[modifier]) {
      fields.push([modifier, ''])
    }
  }
  fields.push(['location', binding.location])

  return fields.map(([key, value]) => value === '' ? key : `${key}=${encodeValue(value)}`).join(',')
}

function normalizeLogicalKey (key: string) {
  if (key === ' ') {
    return 'Space'
  }

  if (key === '+') {
    return 'Plus'
  }

  if (key.startsWith('Arrow')) {
    return key.slice(5)
  }

  return key.length === 1 ? key.toLowerCase() : key
}

export function normalizePhysicalKey (code: string) {
  const punctuation: Record<string, string> = {
    Backquote: '`',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Comma: ',',
    Equal: '=',
    Minus: '-',
    Period: '.',
    Quote: "'",
    Semicolon: ';',
    Slash: '/',
  }

  return punctuation[code] || code.replace(/^(Key|Digit|Arrow)(?=.)/, '')
}

function formatBinding (keys: string, binding: RecordedKeybinding, key: string) {
  const parts = keys ? keys.split('+') : []
  const existing = new Map<string, string>()

  for (const part of parts) {
    const normalized = part.trim().toLowerCase()
    for (const alias of modifierAliases) {
      if ((alias.names as readonly string[]).includes(normalized)) {
        existing.set(alias.field, part)
      }
    }
  }

  const result: string[] = []
  for (const alias of modifierAliases) {
    const enabled = binding[alias.field] ||
      ((alias.field === 'ctrl' || alias.field === 'alt') && binding.altGraph)
    if (enabled) {
      result.push(existing.get(alias.field) || alias.fallback)
    }
  }

  result.push(key)
  return result.join('+')
}

/**
 * Return the key string used by an executor. New bindings select the logical
 * key or physical code according to `mode`; legacy entries use `keys`.
 */
export function getEffectiveKeybinding (keys: string | null | undefined, binding?: string | null): string | null {
  const parsed = parseKeybinding(binding)
  if (!parsed) {
    return keys || null
  }

  const replacement = parsed.mode === 'code' ? parsed.code : normalizeLogicalKey(parsed.key)
  return formatBinding(keys || '', parsed, replacement)
}

/**
 * Return the logical/display part of a binding.
 */
export function getDisplayKeybinding (keys: string | null | undefined, binding?: string | null): string | null {
  const parsed = parseKeybinding(binding)
  if (!parsed) {
    return keys || null
  }

  if (parsed.mode === 'code') {
    return keys || formatBinding('', parsed, normalizePhysicalKey(parsed.code))
  }

  return formatBinding(keys || '', parsed, normalizeLogicalKey(parsed.key))
}
