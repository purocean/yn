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
  const isDeleteLeft = e.source === 'deleteLeft'
  const isEnter = e.source === 'keyboard' && isKeydown('ENTER')
  const isSpace = e.source === 'keyboard' && isKeydown(' ')

  if (!isTab && !isDeleteLeft && !isEnter && !isSpace && e.source !== 'outdent') {
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

  if (orderedListCompletion === 'off') {
    return
  }

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

    const indent = match[1]

    // if press space key, only auto complete empty item
    if (isSpace && !emptyItemReg.test(currentLine)) {
      return
    }

    // if pres delete left key, only auto complete when cursor at the end of line
    if (isDeleteLeft && model.getLineMaxColumn(line) !== position.column) {
      return
    }

    while (startLine > 0) {
      const content = model.getLineContent(startLine)

      const m = content.match(reg)
      if (!m || m[1].length < indent.length) {
        break
      }

      prevLines.unshift(content)
      startLine--
    }

    startLine++

    while (endLine <= maxLineCount) {
      const content = model.getLineContent(endLine)

      const m = content.match(reg)
      if (!m || m[1].length < indent.length) {
        break
      }

      nextLines.push(content)
      endLine++
    }

    endLine--

    // if orderedListCompletion is auto, only auto complete when previous 2 lines are ordered list item
    if (orderedListCompletion === 'auto' && prevLines.length < 2) {
      return
    }

    const firstLine = prevLines[0]
    const firstMatch = firstLine ? firstLine.match(reg) : null
    const startNum = firstMatch ? parseInt(firstMatch[2]) : 1
    let shouldInc = orderedListCompletion === 'increase'

    if (orderedListCompletion === 'auto') {
      const secondLine = prevLines[1]
      const secondMatch = secondLine ? secondLine.match(reg) : null
      shouldInc = secondMatch ? parseInt(secondMatch[2]) > 1 : false
    }

    const changedLines: number[] = []
    let seq = 0
    const text = [...prevLines, currentLine, ...nextLines].map((line, i) => {
      const replaced = line.replace(reg, (s, p1, p2, p3, p4) => {
        if (p1 !== indent) {
          return s
        }

        const num = shouldInc ? (seq++) + startNum : startNum
        return `${p1}${num}${p3}${p4}`
      })

      if (replaced !== line) {
        changedLines.push(i)
      }

      return replaced
    })

    if (!changedLines.length) {
      return
    }

    const changedLineStart = changedLines[0]
    const changedLineEnd = changedLines[changedLines.length - 1]

    return {
      text: text.slice(changedLineStart, changedLineEnd + 1),
      startLine: startLine + changedLineStart,
      endLine: startLine + changedLineEnd
    }
  }

  const doEdits = (position: Monaco.Position) => {
    const edits: Monaco.editor.IIdentifiedSingleEditOperation[] = [position].map(p => {
      const result = processOrderedList(p)
      if (!result) {
        return null
      }

      return {
        range: new monaco.Range(result.startLine, 1, result.endLine, model.getLineMaxColumn(result.endLine)),
        text: result.text.join(model.getEOL()),
      } satisfies Monaco.editor.IIdentifiedSingleEditOperation
    }).filter(Boolean) as Monaco.editor.IIdentifiedSingleEditOperation[]

    // apply edits
    if (edits.length) {
      const cursorAtEnd = model.getLineMaxColumn(position.lineNumber) === position.column
      editor.executeEdits(source, edits)
      if (cursorAtEnd) {
        // force set position to the end of line
        editor.setPosition(new monaco.Position(position.lineNumber, model.getLineMaxColumn(position.lineNumber)))
      }
    }
  }

  doEdits(e.position)

  // if press tab key, auto complete the next line
  if (isTab && model.getLineCount() > e.position.lineNumber) {
    doEdits(new monaco.Position(e.position.lineNumber + 1, 1))
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
