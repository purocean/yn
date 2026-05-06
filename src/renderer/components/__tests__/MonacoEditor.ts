import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  getDefaultOptions: vi.fn(() => ({ fontSize: 14, wordWrap: 'on' })),
  triggerHook: vi.fn(),
  toUri: vi.fn(() => 'yn://blank.md'),
  isMarkdownFile: vi.fn((path: string) => path.endsWith('.md')),
  editorCreate: vi.fn(),
  createModel: vi.fn(),
  getModels: vi.fn(),
  setModelLanguage: vi.fn(),
  editor: {
    setModel: vi.fn(),
    layout: vi.fn(),
  },
  requireFn: vi.fn(),
  requireConfig: vi.fn(),
  models: [] as any[],
}))

vi.mock('@fe/services/editor', () => ({
  getDefaultOptions: mocks.getDefaultOptions,
}))

vi.mock('@fe/services/document', () => ({
  toUri: mocks.toUri,
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/support/args', () => ({
  MONACO_EDITOR_NLS: { 'zh-cn': {} },
}))

vi.mock('@share/misc', () => ({
  isMarkdownFile: mocks.isMarkdownFile,
}))

import MonacoEditor from '../MonacoEditor.vue'

const makeModel = (uriString: string, value: string, language = 'plaintext') => ({
  uri: { toString: () => uriString, path: uriString },
  getValue: vi.fn(() => value),
  setValue: vi.fn(),
  getLanguageId: vi.fn(() => language),
  getFullModelRange: vi.fn(() => ({ startLineNumber: 1 })),
  pushEditOperations: vi.fn(),
})

beforeEach(() => {
  vi.useFakeTimers()
  mocks.triggerHook.mockClear()
  mocks.getDefaultOptions.mockClear()
  mocks.toUri.mockClear()
  mocks.isMarkdownFile.mockImplementation((path: string) => path.endsWith('.md'))
  mocks.editorCreate.mockReset()
  mocks.editorCreate.mockReturnValue(mocks.editor)
  mocks.editor.setModel.mockClear()
  mocks.editor.layout.mockClear()
  mocks.createModel.mockReset()
  mocks.getModels.mockReset()
  mocks.setModelLanguage.mockClear()
  mocks.models = []
  mocks.getModels.mockImplementation(() => mocks.models)
  mocks.createModel.mockImplementation((value: string, _language: any, uri: any) => {
    const model = makeModel(uri.toString(), value)
    mocks.models.push(model)
    return model
  })
  mocks.requireFn.mockReset()
  mocks.requireFn.mockImplementation((_deps: string[], cb: Function) => cb())
  mocks.requireConfig.mockClear()
  mocks.requireFn.config = mocks.requireConfig

  ;(window as any).monaco = {
    editor: {
      create: mocks.editorCreate,
      createModel: mocks.createModel,
      getModels: mocks.getModels,
      setModelLanguage: mocks.setModelLanguage,
    },
    Uri: {
      parse: (value: string) => ({ toString: () => value, path: value }),
    },
  }
  ;(window as any).require = mocks.requireFn
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as any).require
  delete (window as any).monaco
})

describe('MonacoEditor', () => {
  test('initializes existing AMD loader with NLS config and emits monaco hooks', async () => {
    mount(MonacoEditor, { props: { nls: 'zh-cn' } })

    expect(mocks.requireConfig).toHaveBeenCalledWith({
      'vs/nls': { availableLanguages: { '*': 'zh-cn' } },
    })
    expect(mocks.requireFn).toHaveBeenCalledWith(['vs/editor/editor.main'], expect.any(Function))
    expect(mocks.triggerHook).toHaveBeenCalledWith('MONACO_BEFORE_INIT', { monaco: (window as any).monaco })
    expect(mocks.editorCreate).toHaveBeenCalledWith(expect.any(HTMLElement), {
      fontSize: 14,
      wordWrap: 'on',
      fixedOverflowWidgets: true,
    })
    expect(mocks.toUri).toHaveBeenCalledWith(null)
    expect(mocks.editor.setModel).toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(mocks.triggerHook).toHaveBeenCalledWith('MONACO_READY', {
      editor: mocks.editor,
      monaco: (window as any).monaco,
    })
  })

  test('creates, reuses, updates and resizes models', () => {
    const wrapper = mount(MonacoEditor)

    ;(wrapper.vm as any).createModel('repo:/note.md', '# title')
    const created = mocks.models.at(-1)
    expect(created.setValue).toHaveBeenCalledWith('# title')
    expect(mocks.setModelLanguage).toHaveBeenCalledWith(created, 'markdown')
    expect(mocks.editor.setModel).toHaveBeenLastCalledWith(created)

    const existing = makeModel('repo:/note.md', 'old', 'markdown')
    mocks.models = [existing]
    ;(wrapper.vm as any).createModel('repo:/note.md', 'new')
    expect(existing.pushEditOperations).toHaveBeenCalledWith(
      null,
      [{ range: { startLineNumber: 1 }, text: 'new' }],
      expect.any(Function)
    )
    expect(mocks.createModel).toHaveBeenCalledTimes(2)

    ;(wrapper.vm as any).resize()
    expect(mocks.editor.layout).toHaveBeenCalled()
  })

  test('injects loader script when AMD loader is missing', async () => {
    delete (window as any).require
    const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node)
    mount(MonacoEditor)

    const script = appendChild.mock.calls[0][0] as HTMLScriptElement
    expect(script.src).toContain('vs/loader.js')

    ;(window as any).require = mocks.requireFn
    script.dispatchEvent(new Event('load'))

    expect(mocks.requireFn).toHaveBeenCalledWith(['vs/editor/editor.main'], expect.any(Function))
    appendChild.mockRestore()
  })
})
