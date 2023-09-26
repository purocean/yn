import type * as Monaco from 'monaco-editor'
import { cloneDeep, debounce } from 'lodash-es'
import { FLAG_READONLY } from '@fe/support/args'
import { isElectron, isMacOS } from '@fe/support/env'
import { registerHook, triggerHook } from '@fe/core/hook'
import { getActionHandler, registerAction } from '@fe/core/action'
import * as ioc from '@fe/core/ioc'
import { Alt } from '@fe/core/keybinding'
import store from '@fe/support/store'
import { useToast } from '@fe/support/ui/toast'
import { sleep } from '@fe/utils'
import { getColorScheme } from './theme'
import { getSetting } from './setting'
import { t } from './i18n'
import { language as markdownLanguage } from 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js'
import { CustomEditor } from '@fe/types'

export type SimpleCompletionItem = {
  label: string,
  kind?: Monaco.languages.CompletionItemKind,
  insertText: string,
  detail?: string,
}

export type SimpleCompletionItemTappers = (items: SimpleCompletionItem[]) => void

let currentEditor: CustomEditor | null | undefined
let monaco: typeof Monaco
let editor: Monaco.editor.IStandaloneCodeEditor

const DEFAULT_MAC_FONT_FAMILY = 'MacEmoji, Menlo, Monaco, \'Courier New\', monospace'

const refreshMarkdownMonarchLanguageDebounce = debounce(() => {
  whenEditorReady().then(({ monaco }) => {
    monaco.languages.setMonarchTokensProvider('markdown', getMarkdownMonarchLanguage())
  })
}, 100)

function getFontFamily () {
  const customFontFamily = getSetting('editor.font-family')?.trim()

  if (isMacOS) {
    if (customFontFamily) {
      // add emoji font for macOS
      return `MacEmoji, ${customFontFamily}`
    }

    return DEFAULT_MAC_FONT_FAMILY
  }

  // use monaco default font for other platforms
  return customFontFamily || undefined
}

/**
 * Get default editor options.
 */
export const getDefaultOptions = (): Monaco.editor.IStandaloneEditorConstructionOptions => ({
  value: '',
  accessibilitySupport: 'off', // prevent ime input flash
  theme: getColorScheme() === 'dark' ? 'vs-dark' : 'vs',
  fontSize: getSetting('editor.font-size', 16),
  wordWrap: store.state.wordWrap,
  links: !isElectron,
  // wordWrapColumn: 40,
  mouseWheelZoom: getSetting('editor.mouse-wheel-zoom', true),
  // try "same", "indent" or "none"
  wrappingIndent: 'same',
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  scrollbar: getSetting('editor.minimap', true) ? {
    vertical: 'hidden',
    verticalScrollbarSize: 0
  } : undefined,
  readOnly: FLAG_READONLY,
  acceptSuggestionOnEnter: 'smart',
  unicodeHighlight: {
    ambiguousCharacters: false,
    invisibleCharacters: false,
  },
  fontFamily: getFontFamily(),
  detectIndentation: false,
  insertSpaces: true,
  tabSize: getSetting('editor.tab-size', 4),
  minimap: getSetting('editor.minimap', true) ? undefined : {
    enabled: false
  },
  lineNumbers: getSetting('editor.line-numbers', 'on'),
  quickSuggestions: getSetting('editor.quick-suggestions', false),
  suggestOnTriggerCharacters: getSetting('editor.suggest-on-trigger-characters', true),
  occurrencesHighlight: false,
  renderLineHighlight: 'all',
  wordSeparators: '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?。？！，、；：“”‘’（）《》〈〉【】『』「」﹃﹄〔〕'
})

/**
 * Get Monaco
 * @returns Monaco
 */
export function getMonaco () {
  return monaco
}

/**
 * Get editor instance.
 * @returns
 */
export function getEditor () {
  return editor
}

/**
 * Highlight given line.
 * @param line
 * @param reveal
 * @param duration
 * @returns dispose function
 */
export function highlightLine (line: number | [number, number], reveal: boolean, duration: number): Promise<void>
export function highlightLine (line: number | [number, number], reveal?: boolean, duration?: number): (() => void) | Promise<void>
export function highlightLine (line: number | [number, number], reveal?: boolean, duration?: number): (() => void) | Promise<void> {
  const lines = Array.isArray(line) ? line : [line, line]

  const decorations = getEditor().createDecorationsCollection([
    {
      range: new (getMonaco().Range)(lines[0], 0, lines[1], 999),
      options: {
        isWholeLine: true,
        inlineClassName: 'mtkcontrol'
      }
    }
  ])

  if (reveal) {
    getEditor().revealLineNearTop(lines[0])
  }

  const dispose = () => decorations.clear()

  if (duration) {
    return sleep(duration).then(() => {
      dispose()
    })
  }

  return dispose
}

/**
 * Get one indent
 * getOneIndent removed https://github.com/microsoft/monaco-editor/issues/1565
 * @returns
 */
export function getOneIndent () {
  const options = editor.getModel()!.getOptions()
  return options.insertSpaces ? ' '.repeat(options.tabSize) : '\t'
}

/**
 * Ensure editor is ready.
 * @returns
 */
export function whenEditorReady (): Promise<{ editor: typeof editor, monaco: typeof monaco }> {
  if (monaco && editor) {
    return Promise.resolve({ monaco, editor })
  }

  return new Promise(resolve => {
    registerHook('EDITOR_READY', resolve, true)
  })
}

export function lookupKeybindingKeys (commandId: string): string[] | null {
  if (!editor) {
    return null
  }

  const service = (editor as any)._standaloneKeybindingService

  const keybinding = service.lookupKeybinding(commandId) || service.lookupKeybinding(`vs.editor.ICodeEditor:1:${commandId}`)

  let keys: string[] | null = null

  if (keybinding) {
    const electronAccelerator = keybinding.getElectronAccelerator()
    const userSettingsLabel = keybinding.getUserSettingsLabel()
    if (electronAccelerator) {
      keys = electronAccelerator.split('+')
    } else {
      keys = userSettingsLabel?.split(' ')
    }
  }

  return keys
}

/**
 * Insert text at current cursor.
 * @param text
 */
export function insert (text: string) {
  const selection = getEditor().getSelection()!
  getEditor().executeEdits('', [
    {
      range: new (getMonaco().Range)(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn),
      text,
      forceMoveMarkers: true
    }
  ])
  getEditor().focus()
}

/**
 * Insert text at position.
 * @param position
 * @param text
 */
export function insertAt (position: Monaco.Position, text: string) {
  const editor = getEditor()
  editor.executeEdits('', [
    {
      range: new (getMonaco().Range)(position.lineNumber, position.column, position.lineNumber, position.column),
      text,
      forceMoveMarkers: true
    }
  ])
  editor.setPosition(position)
  editor.focus()
}

/**
 * Replace text value of line.
 * @param line
 * @param text
 */
export function replaceLine (line: number, text: string) {
  const length = getEditor().getModel()!.getLineLength(line)
  const editor = getEditor()
  const monaco = getMonaco()

  editor.executeEdits('', [
    {
      range: new (monaco.Range)(line, 1, line, length + 1),
      text,
      forceMoveMarkers: true
    }
  ])
  editor.setPosition(new monaco.Position(line, text.length + 1))
  editor.focus()
}

/**
 * Replace text value of lines.
 * @param lineStart
 * @param lineEnd
 * @param text
 */
export function replaceLines (lineStart: number, lineEnd: number, text: string) {
  const lineEndPos = getEditor().getModel()!.getLineLength(lineEnd) + 1
  const editor = getEditor()
  const monaco = getMonaco()

  editor.executeEdits('', [
    {
      range: new (monaco.Range)(lineStart, 1, lineEnd, lineEndPos),
      text,
      forceMoveMarkers: true
    }
  ])
  editor.setPosition(new monaco.Position(lineEnd, lineEndPos))
  editor.focus()
}

export function deleteLine (line: number) {
  const editor = getEditor()
  editor.executeEdits('', [
    {
      range: new (getMonaco().Range)(line, 1, line + 1, 1),
      text: null
    }
  ])
  editor.setPosition(new (getMonaco().Position)(line, 1))
  editor.focus()
}

/**
 * Get content of line.
 * @param line
 * @returns
 */
export function getLineContent (line: number) {
  return getEditor().getModel()!.getLineContent(line)
}

/**
 * Get content of lines.
 * @param lineStart
 * @param lineEnd
 * @returns
 */
export function getLinesContent (lineStart: number, lineEnd: number) {
  const model = getEditor().getModel()!

  const lineEndLength = model.getLineLength(lineEnd)
  const range = new (getMonaco().Range)(lineStart, 1, lineEnd, lineEndLength + 1)
  return model.getValueInRange(range)
}

/**
 * Get text value.
 * @returns
 */
export function getValue () {
  return getEditor().getModel()!.getValue(getMonaco().editor.DefaultEndOfLine.LF as number)
}

/**
 * Set text value to editor
 * @param text
 */
export function setValue (text: string) {
  const model = editor.getModel()

  if (!model) {
    return
  }

  const viewState = editor.saveViewState()

  editor.executeEdits('', [
    {
      range: model.getFullModelRange(),
      text,
      forceMoveMarkers: true
    }
  ])

  editor.restoreViewState(viewState)
  editor.focus()
}

/**
 * Replace text value.
 * @param search
 * @param val
 * @param replaceAll
 */
export function replaceValue (search: string | RegExp, val: string, replaceAll = true) {
  const editor = getEditor()
  const model = editor.getModel()
  const content = model!.getValue()
  const text = replaceAll ? content.replaceAll(search, val) : content.replace(search, val)
  setValue(text)
}

/**
 * Get editor selection.
 * @returns
 */
export function getSelectionInfo () {
  const selection = getEditor().getSelection()!

  return {
    line: selection.positionLineNumber,
    column: selection.positionColumn,
    lineCount: getEditor().getModel()!.getLineCount(),
    textLength: getValue().length,
    selectedLength: getEditor().getModel()!.getValueInRange(selection).length,
    selectedLines: selection.endLineNumber - selection.startLineNumber + 1,
    selectionCount: getEditor().getSelections()?.length || 1
  }
}

/**
 * Toggle editor word wrap.
 */
export function toggleWrap () {
  const wrapInfo = getEditor().getOption(monaco.editor.EditorOption.wrappingInfo)
  const isWrapping = wrapInfo.isViewportWrapping
  if (wrapInfo.isDominatedByLongLines) {
    useToast().show('warning', 'Word warp dominated by long lines')
    return
  }

  store.commit('setWordWrap', (isWrapping ? 'off' : 'on'))
}

/**
 * Toggle typewriter mode.
 */
export function toggleTypewriterMode () {
  store.commit('setTypewriterMode', !store.state.typewriterMode)
}

/**
 * Register a simple completion item processor.
 * @param tapper
 */
export function tapSimpleCompletionItems (tapper: (items: SimpleCompletionItem[]) => void) {
  ioc.register('EDITOR_SIMPLE_COMPLETION_ITEM_TAPPERS', tapper)
}

/**
 * Get simple completion items.
 * @returns
 */
export function getSimpleCompletionItems () {
  const items: SimpleCompletionItem[] = []
  const tappers: SimpleCompletionItemTappers[] = ioc.get('EDITOR_SIMPLE_COMPLETION_ITEM_TAPPERS')
  tappers.forEach(tap => tap(items))
  return items
}

/**
 * Register a markdown monarch language processor.
 * @param tapper
 */
export function tapMarkdownMonarchLanguage (tapper: (mdLanguage: any) => void) {
  ioc.register('EDITOR_MARKDOWN_MONARCH_LANGUAGE_TAPPERS', tapper)
  refreshMarkdownMonarchLanguageDebounce()
}

/**
 * Get markdown monarch language.
 * @returns
 */
export function getMarkdownMonarchLanguage () {
  const mdLanguage = cloneDeep(markdownLanguage)
  const tappers: SimpleCompletionItemTappers[] = ioc.get('EDITOR_MARKDOWN_MONARCH_LANGUAGE_TAPPERS')
  tappers.forEach(tap => tap(mdLanguage))
  return mdLanguage
}

/**
 * Switch current editor
 * @param name Editor name
 */
export function switchEditor (name: string) {
  store.commit('setEditor', name)
}

/**
 * Register a custom editor.
 * @param editor Editor
 */
export function registerCustomEditor (editor: CustomEditor) {
  if (!editor.component) {
    throw new Error('Editor component is required')
  }

  ioc.register('EDITOR_CUSTOM_EDITOR', editor)
  triggerHook('EDITOR_CUSTOM_EDITOR_CHANGE', { type: 'register' })
}

/**
 * Remove a custom editor.
 * @param name Editor name
 */
export function removeCustomEditor (name: string) {
  ioc.removeWhen('EDITOR_CUSTOM_EDITOR', item => item.name === name)
  triggerHook('EDITOR_CUSTOM_EDITOR_CHANGE', { type: 'remove' })
  switchEditor('default')
}

/**
 * Get all custom editors.
 * @returns Editors
 */
export function getAllCustomEditors () {
  return ioc.get('EDITOR_CUSTOM_EDITOR')
}

/**
 * Trigger save.
 */
export function triggerSave () {
  getActionHandler('editor.trigger-save')()
}

/**
 * Get current editor is default or not.
 * @returns
 */
export function isDefault () {
  // default editor has no component
  return !currentEditor?.component
}

/**
 * Get current editor is dirty or not.
 * @returns
 */
export async function isDirty (): Promise<boolean> {
  // default editor, check documentSaved. TODO refactor
  if (isDefault()) {
    return !window.documentSaved
  }

  return currentEditor?.getIsDirty ? (await currentEditor.getIsDirty()) : false
}

registerAction({
  name: 'editor.toggle-wrap',
  description: t('command-desc.editor_toggle-wrap'),
  handler: toggleWrap,
  forUser: true,
  keys: [Alt, 'w']
})

registerHook('EDITOR_CURRENT_EDITOR_CHANGE', ({ current }) => {
  currentEditor = current
})

registerHook('MONACO_BEFORE_INIT', ({ monaco }) => {
  // Quick fix: https://github.com/microsoft/monaco-editor/issues/2962
  monaco.languages.register({ id: 'vs.editor.nullLanguage' })
  monaco.languages.setLanguageConfiguration('vs.editor.nullLanguage', {})

  monaco.languages.getLanguages().forEach(function (lang) {
    if (lang.id === 'javascript') {
      lang.aliases?.push('node')
    } else if (lang.id === 'shell') {
      lang.aliases?.push('bash')
    }
  })

  monaco.editor.defineTheme('vs', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '#0062d1' },
      { token: 'attribute.name.html', foreground: '#0062d1' },
      { token: 'attribute.value.html', foreground: '#e52a24' }
    ],
    colors: {
      'editor.background': '#ffffff',
      'minimap.background': '#f2f2f2',
      'editor.lineHighlightBackground': '#0000000f',
    }
  })

  monaco.editor.defineTheme('vs-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#131416',
      'minimap.background': '#101113',
      'editor.lineHighlightBackground': '#ffffff13',
    }
  })
})

registerHook('MONACO_READY', (payload) => {
  monaco = payload.monaco
  editor = payload.editor

  triggerHook('EDITOR_READY', payload)
})

registerHook('THEME_CHANGE', () => {
  monaco?.editor.setTheme(getColorScheme() === 'dark' ? 'vs-dark' : 'vs')
})

store.watch(state => state.wordWrap, (wordWrap) => {
  whenEditorReady().then(({ editor }) => {
    editor.updateOptions({ wordWrap })
  })
})

whenEditorReady().then(({ editor }) => {
  // typewriter mode
  editor.onDidChangeCursorPosition(e => {
    if (store.state.typewriterMode) {
      const sources = ['deleteLeft', 'keyboard']
      if (sources.includes(e.source) && (e.reason === 0 || e.reason === 3)) {
        editor.revealPositionInCenter(e.position)
      }
    }
  })

  editor.onDidChangeModelContent(() => {
    const model = editor.getModel()!
    const uri = model.uri.toString()
    const value = model.getValue()

    triggerHook('EDITOR_CONTENT_CHANGE', { uri, value })
  })
})

registerHook('SETTING_FETCHED', () => {
  whenEditorReady().then(({ editor }) => {
    editor.updateOptions(getDefaultOptions())
  })
})

registerHook('SETTING_CHANGED', ({ changedKeys }) => {
  whenEditorReady().then(({ editor }) => {
    if (changedKeys.includes('editor.mouse-wheel-zoom')) {
      editor.trigger('keyboard', 'editor.action.fontZoomReset', {})
    }
  })
})
