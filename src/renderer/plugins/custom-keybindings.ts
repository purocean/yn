/* eslint-disable quote-props */
import type { Plugin } from '@fe/context'
import type * as Monaco from 'monaco-editor'
import { getLogger } from '@fe/utils'
import { isMacOS } from '@fe/support/env'

const logger = getLogger('plugin:custom-keybindings')

let cachedMap: Record<string, number>

function getCode (monaco: typeof Monaco, key: string): number {
  if (!cachedMap) {
    cachedMap = {
      'ctrl': isMacOS ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd,
      'control': isMacOS ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd,
      'shift': monaco.KeyMod.Shift,
      'alt': monaco.KeyMod.Alt,
      'meta': isMacOS ? monaco.KeyMod.CtrlCmd : monaco.KeyMod.WinCtrl,
      'cmd': isMacOS ? monaco.KeyMod.CtrlCmd : monaco.KeyMod.WinCtrl,
      'command': isMacOS ? monaco.KeyMod.CtrlCmd : monaco.KeyMod.WinCtrl,
      'win': isMacOS ? monaco.KeyMod.CtrlCmd : monaco.KeyMod.WinCtrl,
      'backspace': monaco.KeyCode.Backspace,
      'tab': monaco.KeyCode.Tab,
      'enter': monaco.KeyCode.Enter,
      'pause': monaco.KeyCode.PauseBreak,
      'capslock': monaco.KeyCode.CapsLock,
      'esc': monaco.KeyCode.Escape,
      'space': monaco.KeyCode.Space,
      'pageup': monaco.KeyCode.PageUp,
      'pagedown': monaco.KeyCode.PageDown,
      'end': monaco.KeyCode.End,
      'home': monaco.KeyCode.Home,
      'left': monaco.KeyCode.LeftArrow,
      'up': monaco.KeyCode.UpArrow,
      'right': monaco.KeyCode.RightArrow,
      'down': monaco.KeyCode.DownArrow,
      'arrowleft': monaco.KeyCode.LeftArrow,
      'arrowup': monaco.KeyCode.UpArrow,
      'arrowright': monaco.KeyCode.RightArrow,
      'arrowdown': monaco.KeyCode.DownArrow,
      'insert': monaco.KeyCode.Insert,
      'delete': monaco.KeyCode.Delete,
      '0': monaco.KeyCode.Digit0,
      '1': monaco.KeyCode.Digit1,
      '2': monaco.KeyCode.Digit2,
      '3': monaco.KeyCode.Digit3,
      '4': monaco.KeyCode.Digit4,
      '5': monaco.KeyCode.Digit5,
      '6': monaco.KeyCode.Digit6,
      '7': monaco.KeyCode.Digit7,
      '8': monaco.KeyCode.Digit8,
      '9': monaco.KeyCode.Digit9,
      'a': monaco.KeyCode.KeyA,
      'b': monaco.KeyCode.KeyB,
      'c': monaco.KeyCode.KeyC,
      'd': monaco.KeyCode.KeyD,
      'e': monaco.KeyCode.KeyE,
      'f': monaco.KeyCode.KeyF,
      'g': monaco.KeyCode.KeyG,
      'h': monaco.KeyCode.KeyH,
      'i': monaco.KeyCode.KeyI,
      'j': monaco.KeyCode.KeyJ,
      'k': monaco.KeyCode.KeyK,
      'l': monaco.KeyCode.KeyL,
      'm': monaco.KeyCode.KeyM,
      'n': monaco.KeyCode.KeyN,
      'o': monaco.KeyCode.KeyO,
      'p': monaco.KeyCode.KeyP,
      'q': monaco.KeyCode.KeyQ,
      'r': monaco.KeyCode.KeyR,
      's': monaco.KeyCode.KeyS,
      't': monaco.KeyCode.KeyT,
      'u': monaco.KeyCode.KeyU,
      'v': monaco.KeyCode.KeyV,
      'w': monaco.KeyCode.KeyW,
      'x': monaco.KeyCode.KeyX,
      'y': monaco.KeyCode.KeyY,
      'z': monaco.KeyCode.KeyZ,
      'contextmenu': monaco.KeyCode.ContextMenu,
      'f1': monaco.KeyCode.F1,
      'f2': monaco.KeyCode.F2,
      'f3': monaco.KeyCode.F3,
      'f4': monaco.KeyCode.F4,
      'f5': monaco.KeyCode.F5,
      'f6': monaco.KeyCode.F6,
      'f7': monaco.KeyCode.F7,
      'f8': monaco.KeyCode.F8,
      'f9': monaco.KeyCode.F9,
      'f10': monaco.KeyCode.F10,
      'f11': monaco.KeyCode.F11,
      'f12': monaco.KeyCode.F12,
      'f13': monaco.KeyCode.F13,
      'f14': monaco.KeyCode.F14,
      'f15': monaco.KeyCode.F15,
      'f16': monaco.KeyCode.F16,
      'f17': monaco.KeyCode.F17,
      'f18': monaco.KeyCode.F18,
      'f19': monaco.KeyCode.F19,
      'f20': monaco.KeyCode.F20,
      'f21': monaco.KeyCode.F21,
      'f22': monaco.KeyCode.F22,
      'f23': monaco.KeyCode.F23,
      'f24': monaco.KeyCode.F24,
      'numlock': monaco.KeyCode.NumLock,
      'scrolllock': monaco.KeyCode.ScrollLock,
      ';': monaco.KeyCode.Semicolon,
      '=': monaco.KeyCode.Equal,
      ',': monaco.KeyCode.Comma,
      '-': monaco.KeyCode.Minus,
      '.': monaco.KeyCode.Period,
      '/': monaco.KeyCode.Slash,
      '`': monaco.KeyCode.Backquote,
      '[': monaco.KeyCode.BracketLeft,
      '\\': monaco.KeyCode.Backslash,
      ']': monaco.KeyCode.BracketRight,
      '\'': monaco.KeyCode.Quote,
      'oem_8': monaco.KeyCode.OEM_8,
      'intlbackslash': monaco.KeyCode.IntlBackslash,
      'numpad0': monaco.KeyCode.Numpad0,
      'numpad1': monaco.KeyCode.Numpad1,
      'numpad2': monaco.KeyCode.Numpad2,
      'numpad3': monaco.KeyCode.Numpad3,
      'numpad4': monaco.KeyCode.Numpad4,
      'numpad5': monaco.KeyCode.Numpad5,
      'numpad6': monaco.KeyCode.Numpad6,
      'numpad7': monaco.KeyCode.Numpad7,
      'numpad8': monaco.KeyCode.Numpad8,
      'numpad9': monaco.KeyCode.Numpad9,
      'numpadmultiply': monaco.KeyCode.NumpadMultiply,
      'numpadadd': monaco.KeyCode.NumpadAdd,
      'numpadsubtract': monaco.KeyCode.NumpadSubtract,
      'numpaddecimal': monaco.KeyCode.NumpadDecimal,
      'numpaddivide': monaco.KeyCode.NumpadDivide,
    }
  }

  return cachedMap[key.trim().toLowerCase()]
}

function resolveKeys (monaco: typeof Monaco, keys: string | null): number {
  if (!keys) {
    return 0
  }

  let result = 0
  const keyNames = keys.split('+')

  for (const keyName of keyNames) {
    const code = getCode(monaco, keyName)
    if (!code) {
      return 0
    }

    if (result) {
      result |= code
    } else {
      result = code
    }
  }

  return result
}

type Chord = {
  altKey: boolean
  ctrlKey: boolean
  keyCode: number
  metaKey: boolean
  shiftKey: boolean
}

function encodeMonacoChord (monaco: typeof Monaco, chord: Chord): number {
  const { altKey, ctrlKey, keyCode, metaKey, shiftKey } = chord
  let result = 0

  altKey && (result |= monaco.KeyMod.Alt)
  ctrlKey && (result |= (isMacOS ? monaco.KeyMod.WinCtrl : monaco.KeyMod.CtrlCmd))
  metaKey && (result |= (isMacOS ? monaco.KeyMod.CtrlCmd : monaco.KeyMod.WinCtrl))
  shiftKey && (result |= monaco.KeyMod.Shift)

  return result | keyCode
}

function encodeMonacoChords (monaco: typeof Monaco, chords: Chord[]): number {
  if (!chords.length) {
    return 0
  }

  const [first, second] = chords

  if (!second) {
    return encodeMonacoChord(monaco, first)
  }

  return monaco.KeyMod.chord(
    encodeMonacoChord(monaco, first),
    encodeMonacoChord(monaco, second)
  )
}

export default {
  name: 'custom-keybindings',
  register: (ctx) => {
    let disposable: Monaco.IDisposable | null = null

    function updateEditorKeybindings () {
      try {
        const monaco = ctx.editor.getMonaco()
        const editor = ctx.editor.getEditor()
        const service = (editor as any)._standaloneKeybindingService

        disposable?.dispose()
        disposable = null

        const keybindings = ctx.setting.getSetting('keybindings', []).filter(x => x.type === 'editor')
        const newKeybindings: Parameters<typeof monaco.editor.addKeybindingRules>[0] = []

        for (const keybinding of keybindings) {
          // get original keybinding, for get when condition
          const originalKeybinding = service._getResolver().lookupPrimaryKeybinding(keybinding.command, service._contextKeyService)
          let when: string | undefined
          if (originalKeybinding) {
            // get when condition expression
            when = originalKeybinding.when?.serialize()
            const originMonacoKeys = encodeMonacoChords(monaco, originalKeybinding.resolvedKeybinding._chords)
            // remove original keybinding
            newKeybindings.push({ keybinding: originMonacoKeys, command: null, when, })
          }

          const monacoKeys = resolveKeys(monaco, keybinding.keys)

          if (!monacoKeys && keybinding.keys) {
            logger.warn('updateEditorKeybindings', `invalid keybinding ${keybinding.keys} for command ${keybinding.command}`)
          }

          if (monacoKeys) {
            // new keybinding
            newKeybindings.push({ keybinding: monacoKeys, command: keybinding.command, when })
          }
        }

        logger.debug('updateEditorKeybindings', newKeybindings)

        if (newKeybindings.length) {
          disposable = monaco.editor.addKeybindingRules(newKeybindings)
        }
      } catch (error) {
        console.error(error)
        ctx.ui.useToast().show('warning', 'Failed to update editor keybindings')
      }
    }

    ctx.command.tapCommand(command => {
      const keybindings = ctx.lib.lodash.keyBy(
        ctx.setting.getSetting('keybindings', []).filter(x => x.type === 'workbench'),
        'command'
      )

      if (keybindings[command.id]) {
        command.keys = keybindings[command.id].keys?.split('+') || []
      }
    })

    ctx.registerHook('SETTING_CHANGED', ({ changedKeys }) => {
      if (changedKeys.includes('keybindings')) {
        ctx.triggerHook('COMMAND_KEYBINDING_CHANGED')
        updateEditorKeybindings()
      }
    })

    ctx.editor.whenEditorReady().then(updateEditorKeybindings)
  }
} as Plugin
