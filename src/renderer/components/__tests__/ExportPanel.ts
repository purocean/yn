import { reactive, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  toastShow: vi.fn(),
  toastHide: vi.fn(),
  convertCurrentDocument: vi.fn(),
  printCurrentDocument: vi.fn(),
  printCurrentDocumentToPDF: vi.fn(),
  toggleExportPanel: vi.fn((val: boolean) => { mocks.storeState.showExport = val }),
  downloadContent: vi.fn(),
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@share/misc', () => ({
  MARKDOWN_FILE_EXT: '.md',
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

vi.mock('@fe/support/env', () => ({
  isElectron: false,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow, hide: mocks.toastHide }),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@fe/services/export', () => ({
  convertCurrentDocument: mocks.convertCurrentDocument,
  printCurrentDocument: mocks.printCurrentDocument,
  printCurrentDocumentToPDF: mocks.printCurrentDocumentToPDF,
  toggleExportPanel: mocks.toggleExportPanel,
}))

vi.mock('@fe/utils', () => ({
  downloadContent: mocks.downloadContent,
  sleep: mocks.sleep,
}))

vi.mock('@fe/utils/path', () => ({
  basename: (name: string, ext?: string) => ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name,
}))

vi.mock('../Mask.vue', () => ({
  default: {
    name: 'XMask',
    props: ['show', 'maskCloseable'],
    emits: ['close'],
    template: '<div class="mask"><slot /></div>',
  },
}))

import ExportPanel from '../ExportPanel.vue'

const mountExportPanel = () => mount(ExportPanel, {
  global: {
    mocks: { $t: (key: string) => key },
  },
})

beforeEach(() => {
  mocks.storeState = reactive({
    showExport: true,
    currentFile: { name: 'note.md', path: '/note.md', content: '# Note' },
  })
  mocks.toastShow.mockReset()
  mocks.toastHide.mockReset()
  mocks.convertCurrentDocument.mockReset()
  mocks.convertCurrentDocument.mockResolvedValue(new Blob(['html']))
  mocks.printCurrentDocument.mockReset()
  mocks.printCurrentDocument.mockResolvedValue(undefined)
  mocks.printCurrentDocumentToPDF.mockReset()
  mocks.toggleExportPanel.mockClear()
  mocks.downloadContent.mockReset()
  mocks.sleep.mockClear()
})

describe('ExportPanel', () => {
  test('closes and uses browser print for pdf exports outside electron', async () => {
    const wrapper = mountExportPanel()

    await (wrapper.vm as any).ok()
    await flushPromises()

    expect(mocks.toggleExportPanel).toHaveBeenCalledWith(false)
    expect(mocks.sleep).toHaveBeenCalledWith(300)
    expect(mocks.printCurrentDocument).toHaveBeenCalled()
    expect(mocks.downloadContent).not.toHaveBeenCalled()
  })

  test('converts non-pdf documents and downloads the result', async () => {
    const wrapper = mountExportPanel()
    ;(wrapper.vm as any).convert.toType = 'html'
    ;(wrapper.vm as any).convert.fromType = 'html'

    await (wrapper.vm as any).ok()
    await flushPromises()

    expect(mocks.toastShow).toHaveBeenCalledWith('info', 'export-panel.loading', 5000)
    expect(mocks.convertCurrentDocument).toHaveBeenCalledWith({
      fromType: 'html',
      toType: 'html',
      fromHtmlOptions: expect.objectContaining({
        codeCopyButton: true,
      }),
    })
    expect(mocks.downloadContent).toHaveBeenCalledWith('note.html', expect.any(Blob))
    expect(mocks.toastHide).toHaveBeenCalled()
  })

  test('keeps mutually exclusive local html options exclusive', async () => {
    const wrapper = mountExportPanel()
    const convert = (wrapper.vm as any).convert

    convert.toType = 'html'
    convert.fromType = 'html'
    convert.localHtmlOptions.uploadLocalImage = true
    await nextTick()
    expect(convert.localHtmlOptions.inlineLocalImage).toBe(false)

    convert.localHtmlOptions.inlineStyle = true
    await nextTick()
    expect(convert.localHtmlOptions.includeStyle).toBe(false)
  })
})
