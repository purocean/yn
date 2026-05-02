import { defineComponent, nextTick, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  actions: new Map<string, Function>(),
  hooks: new Map<string, Function>(),
  loggerWarn: vi.fn(),
  sleep: vi.fn(() => Promise.resolve()),
  toggleXterm: vi.fn(),
  triggerHook: vi.fn(),
  getHeadings: vi.fn(),
  getViewDom: vi.fn(),
  scrollTopTo: vi.fn(),
  disableSyncScrollAwhile: vi.fn((fn: Function) => fn()),
  revealLineInCenter: vi.fn(),
  printCurrentDocument: vi.fn(),
  toggleExportPanel: vi.fn((val?: boolean) => {
    if (mocks.storeState) mocks.storeState.showExport = val
  }),
  toastShow: vi.fn(),
  fileTabsTapActionBtns: vi.fn(),
  fileTabsRemoveActionBtnTapper: vi.fn(),
  fileTabsRefreshActionBtns: vi.fn(),
  lastIframe: undefined as any,
  xtermInit: vi.fn(),
  xtermInput: vi.fn(),
  downloadContent: vi.fn(),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ warn: mocks.loggerWarn, debug: vi.fn() }),
  sleep: mocks.sleep,
  downloadContent: mocks.downloadContent,
}))

vi.mock('@fe/utils/path', () => ({
  basename: (name: string, ext?: string) => ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_XTERM: false,
  FLAG_DEMO: false,
  CSS_VAR_NAME: { PREVIEWER_HEIGHT: '--previewer-height' },
}))

vi.mock('@fe/services/layout', () => ({
  toggleXterm: mocks.toggleXterm,
}))

vi.mock('@fe/support/env', () => ({
  isElectron: false,
}))

vi.mock('@fe/support/embed', () => ({
  IFrame: defineComponent({
    name: 'XIFrame',
    props: ['html', 'iframeProps', 'onLoad'],
    mounted () {
      const doc = document.implementation.createHTMLDocument('preview')
      const app = doc.createElement('div')
      app.id = 'app'
      doc.body.appendChild(app)
      const iframe = {
        style: {},
        contentDocument: doc,
        contentWindow: {
          addEventListener: vi.fn((name: string, handler: Function) => {
            ;(iframe as any)[`on${name}`] = handler
          }),
        },
      } as any
      mocks.lastIframe = iframe
      this.onLoad(iframe)
    },
    template: '<iframe class="iframe-stub" />',
  }),
}))

vi.mock('@fe/services/view', () => ({
  disableSyncScrollAwhile: mocks.disableSyncScrollAwhile,
  getHeadings: mocks.getHeadings,
  getViewDom: mocks.getViewDom,
  scrollTopTo: mocks.scrollTopTo,
}))

vi.mock('@fe/services/export', () => ({
  printCurrentDocument: mocks.printCurrentDocument,
  printCurrentDocumentToPDF: vi.fn(),
  convertCurrentDocument: vi.fn(),
  toggleExportPanel: mocks.toggleExportPanel,
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@fe/services/editor', () => ({
  getEditor: () => ({ revealLineInCenter: mocks.revealLineInCenter }),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow, hide: vi.fn() }),
}))

vi.mock('@fe/services/workbench', () => ({
  FileTabs: {
    tapActionBtns: mocks.fileTabsTapActionBtns,
    removeActionBtnTapper: mocks.fileTabsRemoveActionBtnTapper,
    refreshActionBtns: mocks.fileTabsRefreshActionBtns,
  },
}))

vi.mock('@fe/services/document', () => ({
  isMarkdownFile: (file: any) => file?.name?.endsWith('.md') || file?.path?.endsWith('.md'),
}))

vi.mock('@share/misc', () => ({
  MARKDOWN_FILE_EXT: '.md',
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

vi.mock('../Xterm.vue', () => ({
  default: {
    name: 'XTerm',
    template: '<div class="xterm-stub" />',
    methods: {
      init: mocks.xtermInit,
      input: mocks.xtermInput,
    },
  },
}))

vi.mock('../DefaultPreviewerRender.ce.vue', () => ({
  default: { name: 'DefaultPreviewerRender', styles: ['.markdown{color:red}'], template: '<div class="render-stub" />' },
}))

vi.mock('../Outline.vue', () => ({
  default: { name: 'Outline', template: '<div class="outline-stub" />' },
}))

vi.mock('../FindInPreview.vue', () => ({
  default: { name: 'FindInPreview', template: '<div class="find-stub" />' },
}))

vi.mock('../Mask.vue', () => ({
  default: {
    name: 'XMask',
    props: ['show', 'maskCloseable'],
    emits: ['close'],
    template: '<div v-if="show" class="mask-stub" @click="$emit(\'close\')"><slot /></div>',
  },
}))

import Terminal from '../Terminal.vue'
import DefaultPreviewer from '../DefaultPreviewer.vue'
import ExportPanel from '../ExportPanel.vue'

beforeEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  mocks.storeState = reactive({
    currentRepo: { path: '/repo' },
    currentFile: { name: 'note.md', path: '/repo/note.md', content: '# Note' },
    presentation: false,
    previewer: 'default',
    showExport: true,
  })
  mocks.actions.clear()
  mocks.hooks.clear()
  mocks.loggerWarn.mockReset()
  mocks.sleep.mockClear()
  mocks.toggleXterm.mockReset()
  mocks.triggerHook.mockReset()
  mocks.getHeadings.mockReset()
  mocks.getHeadings.mockReturnValue([])
  mocks.getViewDom.mockReset()
  mocks.getViewDom.mockReturnValue(null)
  mocks.scrollTopTo.mockReset()
  mocks.disableSyncScrollAwhile.mockClear()
  mocks.revealLineInCenter.mockReset()
  mocks.printCurrentDocument.mockReset()
  mocks.toggleExportPanel.mockClear()
  mocks.toastShow.mockReset()
  mocks.fileTabsTapActionBtns.mockReset()
  mocks.fileTabsRemoveActionBtnTapper.mockReset()
  mocks.fileTabsRefreshActionBtns.mockReset()
  mocks.lastIframe = undefined
  mocks.xtermInit.mockReset()
  mocks.xtermInput.mockReset()
  mocks.downloadContent.mockReset()
})

describe('Terminal', () => {
  test('registers xterm actions, runs commands, and emits hide', async () => {
    const wrapper = mount(Terminal)

    expect(mocks.actions.has('xterm.run')).toBe(true)
    expect(mocks.actions.has('xterm.init')).toBe(true)

    await wrapper.find('.hide').trigger('click')
    expect(wrapper.emitted('hide')).toHaveLength(1)

    await mocks.actions.get('xterm.run')?.({ start: 'cd /tmp', code: 'npm test\nnpm run lint', exit: 'exit' })
    expect(mocks.toggleXterm).toHaveBeenCalledWith(true)
    expect(mocks.xtermInit).toHaveBeenCalledWith(expect.objectContaining({
      cwd: '/repo',
      onDisconnect: expect.any(Function),
    }))
    expect(mocks.xtermInput).toHaveBeenNthCalledWith(1, 'cd /tmp', true)
    expect(mocks.sleep).toHaveBeenCalledWith(400)
    expect(mocks.xtermInput).toHaveBeenCalledWith('npm test', true)
    expect(mocks.xtermInput).toHaveBeenCalledWith('npm run lint', true)
    expect(mocks.xtermInput).toHaveBeenCalledWith('exit', true)

    mocks.xtermInit.mock.calls[0][0].onDisconnect()
    expect(mocks.toggleXterm).toHaveBeenCalledWith(false)

    wrapper.unmount()
    expect(mocks.actions.has('xterm.run')).toBe(false)
    expect(mocks.actions.has('xterm.init')).toBe(false)
  })
})

describe('DefaultPreviewer', () => {
  test('mounts iframe, updates outline and todo progress, and contributes file tab actions', async () => {
    const viewDom = document.createElement('div')
    viewDom.innerHTML = '<input type="checkbox" checked><input type="checkbox">'
    mocks.getViewDom.mockReturnValue(viewDom)
    mocks.getHeadings.mockReturnValue([{ level: 1, text: 'Intro', line: 1 }])

    const wrapper = mount(DefaultPreviewer, {
      global: {
        mocks: { $t: (key: string) => key },
        stubs: { teleport: true },
      },
    })
    await flushPromises()

    expect(wrapper.find('.default-previewer').exists()).toBe(true)
    expect(mocks.hooks.has('GLOBAL_RESIZE')).toBe(true)
    expect(mocks.hooks.has('VIEW_RENDERED')).toBe(true)
    expect(mocks.fileTabsTapActionBtns).toHaveBeenCalledWith(expect.any(Function))
    expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_RENDER_IFRAME_READY', expect.any(Object))

    mocks.hooks.get('VIEW_RENDERED')?.()
    await new Promise(resolve => setTimeout(resolve, 90))
    await nextTick()

    expect(wrapper.find('.outline').exists()).toBe(true)
    const btns: any[] = []
    mocks.fileTabsTapActionBtns.mock.calls[0][0](btns)
    expect(btns).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'custom' }),
      expect.objectContaining({ icon: 'print-solid', title: 'print' }),
      expect.objectContaining({ icon: 'file-export-solid', title: 'export' }),
    ]))

    btns.find(btn => btn.icon === 'print-solid').onClick()
    btns.find(btn => btn.icon === 'file-export-solid').onClick()
    expect(mocks.printCurrentDocument).toHaveBeenCalled()
    expect(mocks.toggleExportPanel).toHaveBeenCalledWith()

    await wrapper.find('.outline-pin').trigger('click')
    expect(wrapper.find('.outline').classes()).toContain('pined')

    await wrapper.find('.scroll-to-top').trigger('click')
    expect(mocks.disableSyncScrollAwhile).toHaveBeenCalled()
    expect(mocks.scrollTopTo).toHaveBeenCalledWith(0)
    expect(mocks.revealLineInCenter).toHaveBeenCalledWith(1)

    wrapper.unmount()
    expect(mocks.hooks.has('GLOBAL_RESIZE')).toBe(false)
    expect(mocks.fileTabsRemoveActionBtnTapper).toHaveBeenCalledWith(expect.any(Function))
  })

  test('handles iframe scroll, beforeunload recovery, resize CSS variable, and empty tab action state', async () => {
    vi.useFakeTimers()
    const wrapper = mount(DefaultPreviewer, {
      global: {
        mocks: { $t: (key: string) => key },
        stubs: { teleport: true },
      },
    })
    await flushPromises()

    mocks.lastIframe.onscroll({ target: { documentElement: { scrollTop: 42 } } })
    await nextTick()
    expect(mocks.triggerHook).toHaveBeenCalledWith('VIEW_SCROLL', expect.any(Object))
    expect(wrapper.find('.scroll-to-top').classes()).not.toContain('hide')

    Object.defineProperty(wrapper.find('.default-previewer').element, 'clientHeight', {
      value: 640,
      configurable: true,
    })
    mocks.hooks.get('GLOBAL_RESIZE')?.()
    await nextTick()
    expect(mocks.lastIframe.contentDocument.documentElement.style.getPropertyValue('--previewer-height')).toBe('640px')

    const tapper = mocks.fileTabsTapActionBtns.mock.calls[0][0]
    mocks.storeState.currentFile = undefined
    const btns: any[] = []
    tapper(btns)
    expect(btns).toEqual([])

    mocks.lastIframe.onbeforeunload({})
    await nextTick()
    expect(wrapper.find('.iframe-stub').exists()).toBe(false)
    vi.advanceTimersByTime(3000)
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'IFrame Error!')

    vi.useRealTimers()
  })
})

describe('ExportPanel extra branches', () => {
  test('closes from mask/cancel and returns early when current file has no content', async () => {
    mocks.storeState.currentFile = { name: 'empty.md', path: '/empty.md', content: '' }
    const wrapper = mount(ExportPanel, {
      global: {
        mocks: { $t: (key: string) => key },
      },
    })

    await wrapper.find('.mask-stub').trigger('click')
    expect(mocks.toggleExportPanel).toHaveBeenCalledWith(false)

    mocks.storeState.showExport = true
    await nextTick()
    await wrapper.find('.btn.primary').trigger('click')
    await flushPromises()

    expect(mocks.printCurrentDocument).not.toHaveBeenCalled()
    expect(mocks.downloadContent).not.toHaveBeenCalled()
  })
})
