const mocks = vi.hoisted(() => ({
  state: {
    showEditor: true,
  },
  editorInstance: {
    setScrollTop: vi.fn(),
    setPosition: vi.fn(),
    focus: vi.fn(),
  },
  editorHighlightLine: vi.fn(),
  editorIsDefault: vi.fn(() => true),
  viewScrollTopTo: vi.fn(),
  viewDisableSyncScrollAwhile: vi.fn(async (fn: any) => fn()),
  viewHighlightLine: vi.fn(),
  viewHighlightAnchor: vi.fn(),
  chooseDocumentHandler: vi.fn(),
  sleep: vi.fn(async () => undefined),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.state },
}))

vi.mock('@fe/utils', () => ({
  sleep: mocks.sleep,
}))

vi.mock('@fe/services/editor', () => ({
  getEditor: () => mocks.editorInstance,
  highlightLine: mocks.editorHighlightLine,
  isDefault: mocks.editorIsDefault,
}))

vi.mock('@fe/services/view', () => ({
  scrollTopTo: mocks.viewScrollTopTo,
  disableSyncScrollAwhile: mocks.viewDisableSyncScrollAwhile,
  highlightLine: mocks.viewHighlightLine,
  highlightAnchor: mocks.viewHighlightAnchor,
}))

vi.mock('@fe/core/action', () => ({
  getActionHandler: vi.fn((name: string) => {
    if (name !== 'filter.choose-document') {
      throw new Error(`Unexpected action: ${name}`)
    }
    return mocks.chooseDocumentHandler
  }),
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    SOURCE_LINE_START: 'data-source-line',
    SOURCE_LINE_END: 'data-source-line-end',
  },
}))

import {
  changePosition,
  chooseDocument,
} from '@fe/services/routines'

async function flushAsyncPositionWork () {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  mocks.state.showEditor = true
  mocks.editorInstance.setScrollTop.mockClear()
  mocks.editorInstance.setPosition.mockClear()
  mocks.editorInstance.focus.mockClear()
  mocks.editorHighlightLine.mockClear()
  mocks.editorIsDefault.mockReset()
  mocks.editorIsDefault.mockReturnValue(true)
  mocks.viewScrollTopTo.mockClear()
  mocks.viewDisableSyncScrollAwhile.mockClear()
  mocks.viewDisableSyncScrollAwhile.mockImplementation(async (fn: any) => fn())
  mocks.viewHighlightLine.mockClear()
  mocks.viewHighlightAnchor.mockReset()
  mocks.chooseDocumentHandler.mockReset()
  mocks.sleep.mockClear()
})

test('restores both editor and preview scroll positions while sync scroll is disabled', async () => {
  await changePosition({ editorScrollTop: 10, viewScrollTop: 20 })
  await vi.waitFor(() => {
    expect(mocks.viewScrollTopTo).toHaveBeenCalledTimes(2)
  })

  expect(mocks.viewDisableSyncScrollAwhile).toHaveBeenCalledTimes(1)
  expect(mocks.editorInstance.setScrollTop).toHaveBeenCalledWith(10)
  expect(mocks.viewScrollTopTo).toHaveBeenNthCalledWith(1, 20)
  expect(mocks.viewScrollTopTo).toHaveBeenNthCalledWith(2, 20)
  expect(mocks.sleep).toHaveBeenCalledWith(50)
})

test('restores editor-only and preview-only scroll positions', async () => {
  await changePosition({ editorScrollTop: 7 })
  expect(mocks.editorInstance.setScrollTop).toHaveBeenCalledWith(7)

  await changePosition({ viewScrollTop: 9 })
  expect(mocks.viewScrollTopTo).toHaveBeenNthCalledWith(1, 9)
  expect(mocks.viewScrollTopTo).toHaveBeenNthCalledWith(2, 9)
})

test('reveals a line in editor and preview', async () => {
  await changePosition({ line: 5, column: 3 })
  await vi.waitFor(() => {
    expect(mocks.viewHighlightLine).toHaveBeenCalledWith(5, true)
  })

  expect(mocks.viewDisableSyncScrollAwhile).toHaveBeenCalledTimes(1)
  expect(mocks.editorHighlightLine).toHaveBeenCalledWith(5, true)
  expect(mocks.editorInstance.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 3 })
  expect(mocks.editorInstance.focus).toHaveBeenCalledTimes(1)
})

test('reveals heading anchors in the editor when default editor is visible', async () => {
  const heading = document.createElement('h2')
  heading.setAttribute('data-source-line', '10')
  heading.setAttribute('data-source-line-end', '13')
  heading.click = vi.fn()
  mocks.viewHighlightAnchor.mockResolvedValue(heading)

  await changePosition({ anchor: 'intro' })

  expect(mocks.viewHighlightAnchor).toHaveBeenCalledWith('intro', true)
  expect(mocks.editorHighlightLine).toHaveBeenCalledWith([10, 12], true, 1000)
  expect(heading.click).toHaveBeenCalledTimes(1)
})

test('does not reveal editor line for anchors when editor is hidden or non-default', async () => {
  const heading = document.createElement('h1')
  heading.setAttribute('data-source-line', '1')
  heading.click = vi.fn()
  mocks.viewHighlightAnchor.mockResolvedValue(heading)
  mocks.state.showEditor = false

  await changePosition({ anchor: 'hidden' })
  expect(mocks.editorHighlightLine).not.toHaveBeenCalled()
  expect(heading.click).toHaveBeenCalledTimes(1)

  mocks.state.showEditor = true
  mocks.editorIsDefault.mockReturnValue(false)
  await changePosition({ anchor: 'custom' })
  expect(mocks.editorHighlightLine).not.toHaveBeenCalled()
})

test('delegates document chooser to registered action handler', async () => {
  const filter = vi.fn()
  mocks.chooseDocumentHandler.mockResolvedValue({ path: '/a.md' })

  await expect(chooseDocument(filter)).resolves.toStrictEqual({ path: '/a.md' })
  expect(mocks.chooseDocumentHandler).toHaveBeenCalledWith(filter)
})
