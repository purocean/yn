const mocks = vi.hoisted(() => ({
  getLineContent: vi.fn(),
  getLineLanguageId: vi.fn(() => 'markdown'),
  getOneIndent: vi.fn(() => '  '),
  getSetting: vi.fn(() => 'auto'),
  isKeydown: vi.fn(() => false),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/services/editor', () => ({
  getLineContent: mocks.getLineContent,
  getLineLanguageId: mocks.getLineLanguageId,
  getOneIndent: mocks.getOneIndent,
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: mocks.getSetting,
}))

vi.mock('@fe/core/keybinding', () => ({
  isKeydown: mocks.isKeydown,
}))

import editorMdList from '../editor-md-list'

class Range {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number

  constructor (startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number) {
    this.startLineNumber = startLineNumber
    this.startColumn = startColumn
    this.endLineNumber = endLineNumber
    this.endColumn = endColumn
  }
}

class Position {
  lineNumber: number
  column: number

  constructor (lineNumber: number, column: number) {
    this.lineNumber = lineNumber
    this.column = column
  }
}

function createEditorHarness (initialLines: string[]) {
  const lines = [...initialLines]
  const cursorHandlers: Function[] = []
  const keyHandlers: Function[] = []
  const model = {
    tokenization: {
      grammarTokens: {
        getLineTokens: vi.fn(() => ({ getForeground: vi.fn(() => 0) })),
      },
    },
    getLineContent: vi.fn((line: number) => lines[line - 1] || ''),
    getLineCount: vi.fn(() => lines.length),
    getLineMaxColumn: vi.fn((line: number) => (lines[line - 1] || '').length + 1),
    getEOL: vi.fn(() => '\n'),
    getValueInRange: vi.fn((range: any) => (lines[range.startLineNumber - 1] || '').slice(range.startColumn - 1, range.endColumn - 1)),
  }
  const editor = {
    executeEdits: vi.fn((_source: string, edits: any[]) => {
      edits.forEach(edit => {
        const start = edit.range.startLineNumber
        const end = edit.range.endLineNumber
        lines.splice(start - 1, end - start + 1, ...edit.text.split('\n'))
      })
    }),
    getModel: vi.fn(() => model),
    getPosition: vi.fn(() => new Position(1, 1)),
    onDidChangeCursorPosition: vi.fn((fn: Function) => cursorHandlers.push(fn)),
    onKeyDown: vi.fn((fn: Function) => keyHandlers.push(fn)),
    pushUndoStop: vi.fn(),
    setPosition: vi.fn(),
  }
  const monaco = { Range, Position, KeyCode: { Tab: 2 } }
  const ctx = {
    editor: {
      whenEditorReady: vi.fn(() => Promise.resolve({ editor, monaco })),
    },
  } as any

  mocks.getLineContent.mockImplementation((line: number) => lines[line - 1] || '')

  return { ctx, editor, model, lines, cursorHandlers, keyHandlers }
}

describe('editor-md-list plugin', () => {
  beforeEach(() => {
    mocks.getLineContent.mockReset()
    mocks.getLineLanguageId.mockReturnValue('markdown')
    mocks.getOneIndent.mockReturnValue('  ')
    mocks.getSetting.mockReturnValue('auto')
    mocks.isKeydown.mockReturnValue(false)
  })

  test('registers cursor and key handlers after editor is ready', async () => {
    const harness = createEditorHarness([''])

    editorMdList.register(harness.ctx)
    await Promise.resolve()

    expect(harness.editor.onDidChangeCursorPosition).toHaveBeenCalledWith(expect.any(Function))
    expect(harness.editor.onKeyDown).toHaveBeenCalledWith(expect.any(Function))
  })

  test('tab indents a list marker at the end of the line', async () => {
    const harness = createEditorHarness(['-'])
    editorMdList.register(harness.ctx)
    await Promise.resolve()

    harness.cursorHandlers[0]({
      reason: 0,
      source: 'tab',
      position: new Position(1, 2),
    })

    expect(harness.lines[0]).toBe('  - ')
    expect(harness.editor.pushUndoStop).toHaveBeenCalled()
    expect(harness.editor.setPosition).toHaveBeenCalledWith(expect.objectContaining({ lineNumber: 1, column: 5 }))
  })

  test('enter on two empty list items removes the duplicate pair', async () => {
    const harness = createEditorHarness(['- ', '- '])
    editorMdList.register(harness.ctx)
    await Promise.resolve()
    mocks.isKeydown.mockImplementation((key: string) => key === 'ENTER')

    harness.cursorHandlers[0]({
      reason: 0,
      source: 'keyboard',
      position: new Position(2, 3),
    })

    expect(harness.lines).toEqual([''])
  })

  test('auto-renumbers ordered lists when enough previous ordered items exist', async () => {
    const harness = createEditorHarness(['1. One', '2. Two', '9. Three'])
    editorMdList.register(harness.ctx)
    await Promise.resolve()
    mocks.isKeydown.mockImplementation((key: string) => key === ' ')

    harness.cursorHandlers[0]({
      reason: 0,
      source: 'keyboard',
      position: new Position(3, 4),
    })

    expect(harness.lines).toEqual(['1. One', '2. Two', '3. Three'])
  })

  test('does not process non-markdown lines or fenced-code tokens', async () => {
    const harness = createEditorHarness(['1. One', '2. Two', '9. Three'])
    editorMdList.register(harness.ctx)
    await Promise.resolve()
    mocks.getLineLanguageId.mockReturnValueOnce('plaintext')

    harness.cursorHandlers[0]({
      reason: 0,
      source: 'tab',
      position: new Position(3, 4),
    })

    harness.model.tokenization.grammarTokens.getLineTokens.mockReturnValueOnce({ getForeground: vi.fn(() => 23) })
    harness.cursorHandlers[0]({
      reason: 0,
      source: 'tab',
      position: new Position(3, 4),
    })

    expect(harness.editor.executeEdits).not.toHaveBeenCalled()
  })

  test('skips tab indentation when tab starts from leading whitespace', async () => {
    const harness = createEditorHarness(['  -'])
    editorMdList.register(harness.ctx)
    await Promise.resolve()

    harness.keyHandlers[0]({ keyCode: 2, shiftKey: false, altKey: false })
    harness.cursorHandlers[0]({
      reason: 0,
      source: 'tab',
      position: new Position(1, 4),
    })

    expect(harness.editor.executeEdits).not.toHaveBeenCalled()
  })

  test('honors ordered-list completion settings and follows next outdent lines', async () => {
    const offHarness = createEditorHarness(['1. One', '2. Two', '9. Three'])
    mocks.getSetting.mockReturnValueOnce('off')
    editorMdList.register(offHarness.ctx)
    await Promise.resolve()
    mocks.isKeydown.mockImplementation((key: string) => key === ' ')

    offHarness.cursorHandlers[0]({
      reason: 0,
      source: 'keyboard',
      position: new Position(3, 4),
    })
    expect(offHarness.editor.executeEdits).not.toHaveBeenCalled()

    const outdentHarness = createEditorHarness(['1. A', '  1. B', '  9. C', '5. D', '6. E'])
    mocks.getSetting.mockReturnValue('increase')
    editorMdList.register(outdentHarness.ctx)
    await Promise.resolve()
    mocks.isKeydown.mockReturnValue(false)

    outdentHarness.cursorHandlers[0]({
      reason: 0,
      source: 'outdent',
      position: new Position(3, 7),
    })

    expect(outdentHarness.editor.executeEdits).toHaveBeenCalled()
    expect(outdentHarness.lines).toEqual(['1. A', '  1. B', '  2. C', '2. D', '3. E'])
  })
})
