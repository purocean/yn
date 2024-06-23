import type * as Monaco from 'monaco-editor'
import { getLineContent, getOneIndent } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { getSetting } from '@fe/services/setting'
import { isKeydown } from '@fe/core/keybinding'

function processCursorChange (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco, e: Monaco.editor.ICursorPositionChangedEvent) {
  const model = editor.getModel()
  if (e.reason !== 0 || !model) {
    return
  }

  const source = 'list-completion'
  const emptyItemReg = /^\s*(?:[*+\->]|\d+[.)]|[*+-] \[ \])\s*$/
  const isTab = e.source === 'tab'
  const isEnter = e.source === 'keyboard' && isKeydown('ENTER')
  const isSpace = e.source === 'keyboard' && isKeydown(' ')

  if (!isTab && !isEnter && !isSpace) {
    return false
  }

  const processTab = (position: Monaco.Position) => {
    const currentLine = model.getLineContent(position.lineNumber)
    if (!currentLine) {
      return
    }

    const eolNumber = model.getLineMaxColumn(position.lineNumber)

    if (
      eolNumber === position.column &&
      /^\s*(?:[*+\->]|\d+[.)])/.test(currentLine)
    ) {
      const indent = getOneIndent()
      const val = currentLine.trimEnd()
      const end = /[-+*\].>)]$/.test(val) ? ' ' : ''
      editor.executeEdits(source, [
        {
          range: new monaco.Range(position.lineNumber, 1, position.lineNumber, eolNumber),
          text: indent + val + end
        },
      ])
    }
  }

  const processEnter = (position: Monaco.Position) => {
    const line = position.lineNumber

    if (line < 2) {
      return
    }

    const content = getLineContent(line)
    const prevContent = getLineContent(line - 1)
    if (
      emptyItemReg.test(content) && // current line content must a empty item
      emptyItemReg.test(prevContent) // next line content must a empty item
    ) {
      editor.executeEdits(source, [
        {
          range: new monaco.Range(line - 1, 1, line, model.getLineMaxColumn(line)),
          text: '',
          forceMoveMarkers: true
        }
      ])
      return true
    }
  }

  if (isTab) {
    processTab(e.position)
  } else if (isEnter) {
    if (processEnter(e.position)) {
      return // skip auto ordered list completion
    }
  }

  const orderedListCompletion = getSetting('editor.ordered-list-completion', 'auto')
  const maxLineCount = model.getLineCount()
  const reg = /^(\s*)(\d+)([.)])(\s)/

  const processOrderedList = (position: Monaco.Position) => {
    const line = position.lineNumber
    if (line < 2) {
      return
    }

    let startLine = line - 1
    let endLine = line + 1
    const prevLines = []
    const nextLines = []
    const currentLine = model.getLineContent(line)

    // check current line is a ordered list item
    const match = currentLine.match(reg)
    if (!match) {
      return
    }

    // if press space key, only auto complete empty item
    if (isSpace && !emptyItemReg.test(currentLine)) {
      return
    }

    while (startLine > 0) {
      const content = model.getLineContent(startLine)

      const m = content.match(reg)
      // check previous line is a ordered list item and is the same level
      if (!m || m[1] !== match[1]) {
        break
      }

      prevLines.unshift(content)
      startLine--
    }

    startLine++

    while (endLine <= maxLineCount) {
      const content = model.getLineContent(endLine)

      const m = content.match(reg)
      // check next line is a ordered list item and is the same level
      if (!m || m[1] !== match[1]) {
        break
      }

      nextLines.push(content)
      endLine++
    }

    endLine--

    const prevLine = prevLines[prevLines.length - 1]

    const prevMatch = prevLine ? prevLine.match(reg) : null

    const shouldInc = orderedListCompletion === 'increase' || (orderedListCompletion === 'auto' && prevMatch && parseInt(prevMatch[2]) > 1)

    let needUpdate = false
    const text = [...prevLines, currentLine, ...nextLines].map((line, i) => {
      const replaced = line.replace(reg, (_match, p1, p2, p3, p4) => {
        const num = shouldInc ? i + 1 : 1
        return `${p1}${num}${p3}${p4}`
      })

      if (replaced !== line) {
        needUpdate = true
      }

      return replaced
    })

    if (!needUpdate) {
      return
    }

    return { text, startLine, endLine }
  }

  const processCursor = (position: Monaco.Position) => {
    const strAfterPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: model.getLineMaxColumn(position.lineNumber)
    })

    if (strAfterPosition.trim().length) {
      return null
    } else {
      return new monaco.Position(position.lineNumber, model.getLineMaxColumn(position.lineNumber))
    }
  }

  const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [e.position].map(p => {
    const result = processOrderedList(p)
    if (!result) {
      return null
    }

    return {
      range: new monaco.Range(result.startLine, 1, result.endLine, model.getLineMaxColumn(result.endLine)),
      text: result.text.join(model.getEOL()),
    } satisfies Monaco.editor.IIdentifiedSingleEditOperation
  }).filter(Boolean) as Monaco.editor.IIdentifiedSingleEditOperation[]

  if (edits.length) {
    editor.executeEdits(source, edits)
    const newPosition = processCursor(e.position)
    if (newPosition) {
      editor.setPosition(newPosition)
    }
  }
}

export default {
  name: 'editor-md-list',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ editor, monaco }) => {
      editor.onDidChangeCursorPosition(e => {
        processCursorChange(editor, monaco, e)
      })
    })
  }
} as Plugin
