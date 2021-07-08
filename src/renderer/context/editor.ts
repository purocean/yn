import { $args } from '@fe/support/global-args'
import env from '@fe/utils/env'
import * as Monaco from 'monaco-editor'
import { useBus } from '@fe/support/bus'

const bus = useBus()

let monaco: typeof Monaco
let editor: Monaco.editor.IStandaloneCodeEditor

export const defaultOptions: {[key: string]: any} = {
  value: '',
  theme: 'vs-dark',
  fontSize: 18,
  wordWrap: false,
  links: !env.isElectron,
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
  readOnly: $args().get('readonly') === 'true',
}

export const getMonaco = () => monaco
export const getEditor = () => editor

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

export function replaceLine (line: number, text: string) {
  const length = getEditor().getModel()!.getLineLength(line)

  getEditor().executeEdits('', [
    { range: new (getMonaco().Range)(line, 1, line, length + 1), text }
  ])
}

export function revealLineInCenter (line: number) {
  getEditor().revealLineInCenter(line)
}

export function revealLine (line: number) {
  getEditor().revealLine(line)
}

export function setScrollToTop (top: number) {
  getEditor().setScrollTop(top)
}

export function getLineContent (line: number) {
  return getEditor().getModel()!.getLineContent(line)
}

export function getValue () {
  return getEditor().getModel()!.getValue(getMonaco().editor.DefaultEndOfLine.LF as number)
}

export function replaceValue (oldValue: string, newValue: string) {
  getEditor().getModel()!.setValue(getValue().replace(oldValue, newValue))
}

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

export function toggleWrap () {
  const isWrapping = getEditor().getOption(monaco.editor.EditorOption.wrappingInfo).isViewportWrapping
  getEditor().updateOptions({ wordWrap: (isWrapping ? 'off' : 'on') })
}

bus.on('monaco.ready', (payload: any) => {
  monaco = payload.monaco
  editor = payload.editor

  bus.emit('editor.ready', payload)
})

bus.on('monaco.change-value', payload => {
  bus.emit('editor.change', payload)
})
