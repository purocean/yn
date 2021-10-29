import * as Monaco from 'monaco-editor'
import { FLAG_READONLY } from '@fe/support/args'
import { isElectron } from '@fe/support/env'
import { useBus } from '@fe/core/bus'
import { getColorScheme } from './theme'
import { registerAction } from '../core/action'
import { Alt } from '../core/command'

const bus = useBus()

let monaco: typeof Monaco
let editor: Monaco.editor.IStandaloneCodeEditor

/**
 * 默认选项
 */
export const defaultOptions: {[key: string]: any} = {
  value: '',
  theme: getColorScheme() === 'dark' ? 'vs-dark' : 'vs',
  fontSize: 16,
  wordWrap: false,
  links: !isElectron,
  // wordWrapColumn: 40,
  // Set this to false to not auto word wrap minified files
  wordWrapMinified: true,
  mouseWheelZoom: true,
  // try "same", "indent" or "none"
  wrappingIndent: 'same',
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  scrollbar: {
    vertical: 'hidden',
    verticalScrollbarSize: 0
  },
  readOnly: FLAG_READONLY,
}

/**
 * 获取 Monaco
 * @returns Monaco
 */
export function getMonaco () {
  return monaco
}

/**
 * 获取 Editor
 * @returns Editor
 */
export function getEditor () {
  return editor
}

/**
 * 编辑器准备好后的 Promise
 * @returns Monaco 和 Editor
 */
export function whenEditorReady (): Promise<{ editor: typeof editor, monaco: typeof monaco }> {
  if (monaco && editor) {
    return Promise.resolve({ monaco, editor })
  }

  return new Promise(resolve => {
    bus.once('editor.ready', payload => {
      resolve(payload)
    })
  })
}

/**
 * 当前光标插入文本
 * @param text 文本
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
}

/**
 * 替换一行的文本
 * @param line 行号
 * @param text 文本
 */
export function replaceLine (line: number, text: string) {
  const length = getEditor().getModel()!.getLineLength(line)

  getEditor().executeEdits('', [
    { range: new (getMonaco().Range)(line, 1, line, length + 1), text }
  ])
}

/**
 * 聚焦某一行到中间
 * @param line 行号
 */
export function revealLineInCenter (line: number) {
  getEditor().revealLineInCenter(line)
}

/**
 * 聚焦某一行
 * @param line 行号
 */
export function revealLine (line: number) {
  getEditor().revealLine(line)
}

/**
 * 设置纵向滚动条偏移
 * @param top 偏移
 */
export function setScrollToTop (top: number) {
  getEditor().setScrollTop(top)
}

/**
 * 获取某一行文本
 * @param line 行号
 * @returns 内容
 */
export function getLineContent (line: number) {
  return getEditor().getModel()!.getLineContent(line)
}

/**
 * 获取编辑器的文本
 * @returns 文本
 */
export function getValue () {
  return getEditor().getModel()!.getValue(getMonaco().editor.DefaultEndOfLine.LF as number)
}

/**
 * 替换文本
 * @param search 搜索值
 * @param val 替换值
 */
export function replaceValue (search: string, val: string) {
  getEditor().getModel()!.setValue(getValue().replace(search, val))
}

/**
 * 获取选区信息
 * @returns 选区信息
 */
export function getSelectionInfo () {
  const selection = getEditor().getSelection()!

  return {
    line: selection.positionLineNumber,
    column: selection.positionColumn,
    lineCount: getEditor().getModel()!.getLineCount(),
    textLength: getValue().length,
    selectedLength: getEditor().getModel()!.getValueInRange(selection).length
  }
}

/**
 * 切换软换行
 */
export function toggleWrap () {
  const isWrapping = getEditor().getOption(monaco.editor.EditorOption.wrappingInfo).isViewportWrapping
  getEditor().updateOptions({ wordWrap: (isWrapping ? 'off' : 'on') })
}

registerAction({ name: 'editor.toggle-wrap', handler: toggleWrap, keys: [Alt, 'w'] })

bus.on('monaco.before-init', (payload: any) => {
  monaco = payload.monaco

  monaco.editor.defineTheme('vs', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#F2F2F2',
      'minimap.background': '#EEEEEE',
    }
  })

  monaco.editor.defineTheme('vs-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#131416',
      'minimap.background': '#101113',
    }
  })
})

bus.on('monaco.ready', (payload) => {
  monaco = payload.monaco
  editor = payload.editor

  bus.emit('editor.ready', payload)
})

bus.on('monaco.change-value', payload => {
  bus.emit('editor.change', payload)
})

bus.on('theme.change', () => {
  monaco?.editor.setTheme(getColorScheme() === 'dark' ? 'vs-dark' : 'vs')
})
