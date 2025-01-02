import type * as Monaco from 'monaco-editor'
import { getLineContent, getOneIndent } from '@fe/services/editor'
import type { Plugin } from '@fe/context'
import { getSetting } from '@fe/services/setting'
import { isKeydown } from '@fe/core/keybinding'

const emptyItemReg = /^\s*(?:[*+\->]|\d+[.)]|[*+-] \[ \])\s*$/
const unorderedListReg = /^\s*[*+-]\s/
const orderedListReg = /^(\s*)(\d+)([.)])(\s)/
const emptyLineReg = /^\s*$/

let ignoreTabProcess = false

function processCursorChange (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco, e: Monaco.editor.ICursorPositionChangedEvent) {
  const model = editor.getModel()
  if (e.reason !== 0 || !model) {
    return
  }

  const source = 'list-completion'
  const isTab = e.source === 'tab'
  const isOutdent = e.source === 'outdent'
  const isDeleteLeft = e.source === 'deleteLeft'
  const isEnter = (e.source === 'keyboard' || e.source === 'editor.action.insertLineAfter') && isKeydown('ENTER')
  const isSpace = e.source === 'keyboard' && isKeydown(' ')

  if (!isTab && !isDeleteLeft && !isEnter && !isSpace && !isOutdent) {
    return false
  }

  const cursorAtEnd = model.getLineMaxColumn(e.position.lineNumber) === e.position.column

  const tryKeepCursorAtEnd = () => {
    if (cursorAtEnd) {
      // force set position to the end of line
      editor.setPosition(new monaco.Position(e.position.lineNumber, model.getLineMaxColumn(e.position.lineNumber)))
    }
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
      editor.pushUndoStop()
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
      editor.pushUndoStop()
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
    if (!ignoreTabProcess) {
      processTab(e.position)
      tryKeepCursorAtEnd()
    }
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
    const prefix = currentLine.slice(0, position.column - 1)

    // check current line is an ordered list item
    const match = currentLine.match(orderedListReg)
    if (!match) {
      return
    }

    const indent = match[1]

    // if press space key, only auto complete when cursor at the start of line
    if (isSpace && !emptyItemReg.test(prefix)) {
      return
    }

    // if press delete left key, only auto complete when cursor at the end of line
    if (isDeleteLeft && model.getLineMaxColumn(line) !== position.column) {
      return
    }

    // 1. outdent a <- break
    //     1. aaa <- matched
    //     2. bbb <- matched
    //        1. bbb.aaa <- matched
    //        2. bbb.bbb <- matched
    //     3. ccc <- matched
    //        CCC <- matched
    //     4. ddd <- [*]cursor here
    //     5. eee <- matched
    //        1. eee.aaa <- matched
    //     6. ddd <- matched
    // 2. outdent b <- break
    const matchContent = (content: string) => {
      if (emptyLineReg.test(content)) { // empty line
        return false
      }

      if (unorderedListReg.test(content)) { // unordered list
        return false
      }

      const m = content.match(orderedListReg)
      if (m && m[1].length < indent.length) { // outdent
        return false
      }

      return true
    }

    while (startLine > 0) {
      const content = model.getLineContent(startLine)
      if (!matchContent(content)) {
        break
      }

      // if we are here, it means the line is ordered list item (same or deeper indent)
      prevLines.unshift(content)
      startLine--
    }

    startLine++

    while (endLine <= maxLineCount) {
      const content = model.getLineContent(endLine)
      if (!matchContent(content)) {
        break
      }

      // if we are here, it means the line is ordered list item (same or deeper indent)
      nextLines.push(content)
      endLine++
    }

    endLine--

    // if orderedListCompletion is auto, only auto complete when previous 2 lines are ordered list item
    if (orderedListCompletion === 'auto' && prevLines.length < 2) {
      return
    }

    const firstLine = prevLines[0]
    const firstMatch = firstLine ? firstLine.match(orderedListReg) : null
    const startNum = firstMatch ? parseInt(firstMatch[2]) : 1
    let shouldInc = orderedListCompletion === 'increase'

    if (orderedListCompletion === 'auto') {
      const secondLine = prevLines[1]
      const secondMatch = secondLine ? secondLine.match(orderedListReg) : null
      shouldInc = secondMatch ? parseInt(secondMatch[2]) > 1 : false
    }

    const changedLines: number[] = []
    let seq = 0
    const text = [...prevLines, currentLine, ...nextLines].map((line, i) => {
      const replaced = line.replace(orderedListReg, (s, p1, p2, p3, p4) => {
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
      editor.pushUndoStop()
      editor.executeEdits(source, edits)
      tryKeepCursorAtEnd()
    }
  }

  doEdits(e.position)

  // if press tab key, auto complete the next outdent line
  if ((isTab || isOutdent)) {
    // find the next outdent line
    let outdentLine: number = 0
    const lineCount = model.getLineCount()
    const currentLine = model.getLineContent(e.position.lineNumber)
    const currentLineIndent = currentLine.match(orderedListReg)?.[1]

    if (typeof currentLineIndent !== 'string') return

    let line = e.position.lineNumber + 1
    while (line < lineCount) {
      const content = model.getLineContent(line)
      const m = content.match(orderedListReg)
      if (!m) return

      if (m[1].length < currentLineIndent.length) {
        outdentLine = line
        break
      }

      line++
    }

    if (outdentLine) {
      doEdits(new monaco.Position(outdentLine, 1))
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

      // ignore tab process when cursor at the start of line
      editor.onKeyDown(e => {
        ignoreTabProcess = false
        if (e.keyCode === monaco.KeyCode.Tab && !e.shiftKey && !e.altKey) {
          const position = editor.getPosition()
          const model = editor.getModel()

          if (position && model) {
            // get before cursor content
            const line = model.getValueInRange({
              startLineNumber: position.lineNumber,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            })

            if (line.trim() === '') {
              ignoreTabProcess = true
            }
          }
        }
      })
    })
  }
} as Plugin
