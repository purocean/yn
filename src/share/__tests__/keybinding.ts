import { describe, expect, test } from 'vitest'
import { getDisplayKeybinding, getEffectiveKeybinding, normalizePhysicalKey, parseKeybinding, serializeKeybinding } from '../keybinding'

describe('compact keybinding format', () => {
  test('serializes and parses complete recorded metadata', () => {
    const binding = {
      mode: 'key' as const,
      key: ',',
      code: 'Comma',
      ctrl: true,
      alt: false,
      shift: true,
      meta: false,
      altGraph: true,
      location: 0,
    }

    const serialized = serializeKeybinding(binding)
    expect(serialized).toBe('mode=key,key=%2C,code=Comma,ctrl,shift,altGraph,location=0')
    expect(parseKeybinding(serialized)).toEqual(binding)
  })

  test('uses binding metadata and falls back to legacy keys', () => {
    const binding = 'mode=code,key=w,code=KeyZ,ctrl,location=0'
    expect(getEffectiveKeybinding('Ctrl+w', binding)).toBe('Ctrl+KeyZ')
    expect(getDisplayKeybinding('Ctrl+w', binding)).toBe('Ctrl+w')
    expect(getEffectiveKeybinding('w', binding)).toBe('Ctrl+KeyZ')
    expect(getEffectiveKeybinding('Ctrl+w')).toBe('Ctrl+w')
    expect(parseKeybinding('Ctrl+w')).toBeNull()
  })

  test('preserves keypad and physical punctuation identities', () => {
    expect(getEffectiveKeybinding('Ctrl+Numpad1', 'mode=code,key=1,code=Numpad1,ctrl,location=3')).toBe('Ctrl+Numpad1')
    expect(getEffectiveKeybinding('Ctrl+<', 'mode=code,key=%3C,code=Comma,ctrl,location=0')).toBe('Ctrl+Comma')
    expect(normalizePhysicalKey('Comma')).toBe(',')
    expect(normalizePhysicalKey('BracketLeft')).toBe('[')
    expect(normalizePhysicalKey('KeyZ')).toBe('Z')
    expect(getEffectiveKeybinding('Ctrl+=', 'mode=key,key=%2B,code=Equal,ctrl,location=0')).toBe('Ctrl+Plus')
  })
})
