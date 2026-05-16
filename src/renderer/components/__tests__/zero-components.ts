import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: {
    currentFile: undefined as any,
    currentContent: '',
    currentRepo: undefined as any,
    tree: undefined as any,
    previewer: '',
  } as any,
  actions: new Map<string, any>(),
  hooks: new Map<string, any>(),
  saveDoc: vi.fn(),
  createDoc: vi.fn(),
  createDir: vi.fn(),
  fetchSettings: vi.fn(),
  showSettingPanel: vi.fn(),
  getSetting: vi.fn(),
  refreshTree: vi.fn(),
  contextMenuShow: vi.fn(),
  quickFilterShow: vi.fn(),
  getAllPreviewers: vi.fn(),
  switchPreviewer: vi.fn(),
  tapActionBtns: vi.fn(),
  removeActionBtnTapper: vi.fn(),
  refreshActionBtns: vi.fn(),
  controlCenterSchema: null as any,
  editor: {
    updateOptions: vi.fn(),
    focus: vi.fn(),
    addCommand: vi.fn(),
  },
  createModel: vi.fn(),
  resizeEditor: vi.fn(),
  setValue: vi.fn(),
}))

vi.mock('@fe/support/store', async () => {
  const vue: any = await vi.importActual('vue')
  if (!mocks.storeState.__v_isReactive) {
    mocks.storeState = vue.reactive(mocks.storeState)
  }

  return {
    default: {
      state: mocks.storeState,
      getters: { isSaved: { value: true } },
    },
  }
})

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: any) => mocks.hooks.set(name, handler),
  removeHook: (name: string) => mocks.hooks.delete(name),
}))

vi.mock('@fe/core/keybinding', () => ({
  Alt: 'Alt',
  Escape: 'Escape',
  getKeyLabel: (key: string) => `[${key}]`,
  getKeysLabel: (name: string) => `[${name}]`,
}))

vi.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => 'en-US',
  t: (key: string, value?: string) => value ? `${key}:${value}` : key,
  useI18n: () => ({
    t: (key: string, ...args: string[]) => args.length ? `${key}:${args.join(':')}` : key,
    $t: {
      value: (key: string, value?: string) => value ? `${key}:${value}` : key,
    },
  }),
}))

vi.mock('@fe/support/args', () => ({
  FLAG_READONLY: false,
  HELP_REPO_NAME: 'help',
}))

vi.mock('@fe/services/setting', () => ({
  fetchSettings: mocks.fetchSettings,
  showSettingPanel: mocks.showSettingPanel,
  getSetting: mocks.getSetting,
}))

vi.mock('@fe/services/document', () => ({
  createDoc: mocks.createDoc,
  createDir: mocks.createDir,
  isEncrypted: (doc: any) => !!doc?.encrypted,
  isSameFile: (a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path,
  saveDoc: mocks.saveDoc,
  toUri: (doc: any) => doc ? `${doc.repo}:${doc.path}` : 'yank-note://system/blank.md',
}))

vi.mock('@fe/services/editor', () => ({
  getEditor: () => mocks.editor,
  isDefault: () => true,
  setValue: mocks.setValue,
  whenEditorReady: () => Promise.resolve({ editor: mocks.editor, monaco: { KeyMod: { CtrlCmd: 1 }, KeyCode: { KeyS: 2 } } }),
}))

vi.mock('@fe/services/tree', () => ({
  refreshTree: mocks.refreshTree,
}))

vi.mock('@fe/utils/composable', () => ({
  useLazyRef: (source: any) => ({
    __v_isRef: true,
    get value () {
      return typeof source === 'function' ? source() : source.value
    },
  }),
}))

vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({ show: mocks.contextMenuShow }),
}))

vi.mock('@fe/support/ui/quick-filter', () => ({
  useQuickFilter: () => ({ show: mocks.quickFilterShow }),
}))

vi.mock('@fe/services/view', () => ({
  getAllPreviewers: mocks.getAllPreviewers,
  switchPreviewer: mocks.switchPreviewer,
}))

vi.mock('@fe/services/workbench', () => ({
  ControlCenter: {
    getSchema: () => mocks.controlCenterSchema,
  },
  FileTabs: {
    tapActionBtns: mocks.tapActionBtns,
    removeActionBtnTapper: mocks.removeActionBtnTapper,
    refreshActionBtns: mocks.refreshActionBtns,
  },
}))

vi.mock('../MonacoEditor.vue', () => ({
  default: {
    name: 'MonacoEditor',
    template: '<div class="monaco-editor-stub" />',
    methods: {
      createModel: mocks.createModel,
      resize: mocks.resizeEditor,
    },
  },
}))

vi.mock('../TreeNode.vue', () => ({
  default: { name: 'TreeNode', props: ['item'], template: '<div class="tree-node-stub">{{item.name}}</div>' },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name'], template: '<i class="svg-icon">{{name}}</i>' },
}))

vi.mock('../DefaultPreviewer.vue', () => ({
  default: { name: 'DefaultPreviewer', template: '<div class="default-previewer">default preview</div>' },
}))

vi.mock('../StatusBarMenu.vue', () => ({
  default: { name: 'StatusBarMenu', props: ['position'], template: '<div class="status-menu">{{position}}</div>' },
}))

import DefaultEditor from '../DefaultEditor.vue'
import Tree from '../Tree.vue'
import FixedFloat from '../FixedFloat.vue'
import Previewer from '../Previewer.vue'
import ControlCenter from '../ControlCenter.vue'
import StatusBar from '../StatusBar.vue'
import CreateFilePanel from '../CreateFilePanel.vue'

const directives = {
  autoZIndex: {},
  fixedFloat: {
    mounted (el: HTMLElement, binding: any) {
      ;(el as any).__fixedFloat = binding.value
    },
  },
}

beforeEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  mocks.storeState.currentFile = undefined
  mocks.storeState.currentContent = ''
  mocks.storeState.currentRepo = undefined
  mocks.storeState.tree = undefined
  mocks.storeState.previewer = ''
  mocks.actions.clear()
  mocks.hooks.clear()
  mocks.saveDoc.mockReset()
  mocks.createDoc.mockReset()
  mocks.createDir.mockReset()
  mocks.fetchSettings.mockReset()
  mocks.fetchSettings.mockResolvedValue(undefined)
  mocks.showSettingPanel.mockReset()
  mocks.getSetting.mockReset()
  mocks.getSetting.mockImplementation((key: string, fallback: any) => fallback)
  mocks.refreshTree.mockReset()
  mocks.refreshTree.mockResolvedValue(undefined)
  mocks.contextMenuShow.mockReset()
  mocks.quickFilterShow.mockReset()
  mocks.getAllPreviewers.mockReset()
  mocks.getAllPreviewers.mockReturnValue([])
  mocks.switchPreviewer.mockReset()
  mocks.tapActionBtns.mockReset()
  mocks.removeActionBtnTapper.mockReset()
  mocks.refreshActionBtns.mockReset()
  mocks.controlCenterSchema = null
  mocks.editor.updateOptions.mockReset()
  mocks.editor.focus.mockReset()
  mocks.editor.addCommand.mockReset()
  mocks.createModel.mockReset()
  mocks.resizeEditor.mockReset()
  mocks.setValue.mockReset()
})

describe('DefaultEditor', () => {
  test('creates and updates editor models, syncs content, resizes, and saves', async () => {
    vi.useFakeTimers()
    mocks.getSetting.mockImplementation((key: string, fallback: any) => key === 'auto-save' ? 20 : fallback)
    mocks.storeState.currentFile = {
      type: 'file',
      repo: 'repo',
      path: '/a.md',
      name: 'a.md',
      status: 'loaded',
      plain: true,
      content: 'old',
      writeable: true,
    }
    mocks.storeState.currentContent = 'new'

    const wrapper = mount(DefaultEditor)
    await flushPromises()

    expect(mocks.createModel).toHaveBeenCalledWith('repo:/a.md', 'old')
    expect(mocks.editor.updateOptions).toHaveBeenCalledWith({ readOnly: false })
    expect(mocks.editor.focus).toHaveBeenCalled()
    expect(mocks.editor.addCommand).toHaveBeenCalled()

    await mocks.hooks.get('EDITOR_CONTENT_CHANGE')?.({ uri: 'repo:/a.md', value: 'typed' })
    expect(mocks.storeState.currentContent).toBe('typed')

    mocks.storeState.currentFile = { ...mocks.storeState.currentFile, content: 'changed', writeable: false }
    await nextTick()
    expect(mocks.setValue).toHaveBeenCalledWith('changed')
    expect(mocks.editor.updateOptions).toHaveBeenCalledWith({ readOnly: true })

    mocks.hooks.get('GLOBAL_RESIZE')?.()
    await nextTick()
    expect(mocks.resizeEditor).toHaveBeenCalled()

    mocks.storeState.currentContent = 'autosaved'
    await nextTick()
    vi.advanceTimersByTime(20)
    await flushPromises()
    expect(mocks.saveDoc).toHaveBeenCalledWith(expect.objectContaining({ path: '/a.md' }), 'autosaved')

    mocks.saveDoc.mockClear()
    mocks.storeState.currentFile = { ...mocks.storeState.currentFile, repo: 'help', content: 'help' }
    mocks.storeState.currentContent = 'skip-help-save'
    await mocks.actions.get('editor.trigger-save')?.handler()
    expect(mocks.saveDoc).not.toHaveBeenCalled()

    wrapper.unmount()
  })
})

describe('Tree', () => {
  test('shows add-repo state, refreshes repositories, opens context menu, and reveals current node', async () => {
    const emptyWrapper = mount(Tree, {
      global: { mocks: { $t: (key: string) => key } },
    })
    await emptyWrapper.find('.add-repo-btn').trigger('click')
    expect(mocks.showSettingPanel).toHaveBeenCalled()

    mocks.storeState.currentRepo = { name: 'repo' }
    mocks.storeState.tree = null
    const loadingWrapper = mount(Tree, {
      global: { mocks: { $t: (key: string) => key } },
    })
    expect(loadingWrapper.text()).toContain('loading')

    mocks.storeState.tree = [{ type: 'dir', repo: 'repo', name: 'root', path: '/', children: [] }]
    await nextTick()
    expect(loadingWrapper.find('.tree-node-stub').text()).toBe('root')

    await loadingWrapper.find('aside.side').trigger('contextmenu')
    const menu = mocks.contextMenuShow.mock.calls.at(-1)![0]
    expect(menu.map((item: any) => item.id)).toEqual(['refresh', 'create-doc', 'create-dir'])
    await menu[0].onClick()
    expect(mocks.fetchSettings).toHaveBeenCalled()
    expect(mocks.refreshTree).toHaveBeenCalled()
    menu[1].onClick()
    menu[2].onClick()
    expect(mocks.createDoc).toHaveBeenCalledWith({ repo: 'repo' }, mocks.storeState.tree[0])
    expect(mocks.createDir).toHaveBeenCalledWith({ repo: 'repo' }, mocks.storeState.tree[0])

    loadingWrapper.find('aside.side').element.innerHTML = '<details data-should-open="true"></details><div class="tree-node"><div class="name selected"></div></div>'
    const selected = loadingWrapper.find('.name.selected').element as HTMLElement
    selected.scrollIntoView = vi.fn()
    mocks.actions.get('tree.reveal-current-node')?.handler()
    await nextTick()
    expect((loadingWrapper.find('details').element as HTMLDetailsElement).open).toBe(true)
    expect(selected.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })
})

describe('FixedFloat', () => {
  test('renders teleported content, styles position props, and emits close channels', async () => {
    const wrapper = mount(FixedFloat, {
      props: { closeBtn: true, top: '1px', right: '2px', bottom: '3px', left: '4px' },
      slots: { default: '<span class="inside">content</span>' },
      global: {
        directives,
        mocks: { $t: (key: string) => key },
        stubs: { teleport: true },
      },
    })

    expect(wrapper.find('.inside').text()).toBe('content')
    expect(wrapper.find('.fixed-float').attributes('style')).toContain('top: 1px')
    expect(wrapper.find('.close-btn').attributes('title')).toBe('close [Escape]')

    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.emitted('close')).toEqual([[ 'btn' ]])

    const binding = (wrapper.find('.fixed-float').element as any).__fixedFloat
    binding.onBlur(true)
    binding.onEsc()
    binding.onClose('blur')
    expect(wrapper.emitted('blur')).toEqual([[ true ]])
    expect(wrapper.emitted('esc')).toEqual([[]])
    expect(wrapper.emitted('close')!.at(-1)).toEqual([ 'blur' ])
  })
})

describe('Previewer', () => {
  test('renders custom previewers and registers file-tab switch action', async () => {
    const CustomPreviewer = defineComponent({ template: '<div class="custom-previewer">custom</div>' })
    mocks.storeState.previewer = 'custom'
    mocks.getAllPreviewers.mockReturnValue([
      { name: 'custom', displayName: 'Custom Preview', component: CustomPreviewer },
    ])

    const wrapper = mount(Previewer)
    expect(wrapper.find('.custom-previewer').text()).toBe('custom')
    expect(wrapper.find('.default-previewer').classes()).toContain('preview-hidden')
    expect(mocks.tapActionBtns).toHaveBeenCalledWith(expect.any(Function))
    expect(mocks.hooks.has('VIEW_PREVIEWER_CHANGE')).toBe(true)

    const tapper = mocks.tapActionBtns.mock.calls[0][0]
    const btns: any[] = []
    mocks.storeState.currentFile = { repo: 'repo' }
    tapper(btns)
    expect(btns[0]).toMatchObject({ icon: 'eye-solid', order: 7001 })
    btns[0].onClick({
      currentTarget: { getBoundingClientRect: () => ({ bottom: 10, right: 20 }) },
    })
    const quickFilter = mocks.quickFilterShow.mock.calls.at(-1)![0]
    expect(quickFilter.list.map((item: any) => item.key)).toEqual(['default', 'custom'])
    quickFilter.onChoose({ key: 'custom' })
    expect(mocks.switchPreviewer).toHaveBeenCalledWith('custom')

    const helpBtns: any[] = []
    mocks.storeState.currentFile = { repo: 'help' }
    tapper(helpBtns)
    expect(helpBtns).toEqual([])

    wrapper.unmount()
    expect(mocks.removeActionBtnTapper).toHaveBeenCalledWith(tapper)
    expect(mocks.hooks.has('VIEW_PREVIEWER_CHANGE')).toBe(false)
  })
})

describe('ControlCenter', () => {
  test('registers actions, renders schema buttons and custom controls, and taps file tabs', async () => {
    const click = vi.fn()
    mocks.controlCenterSchema = {
      main: {
        items: [
          { type: 'btn', icon: 'bold', title: 'Bold', onClick: click, checked: true },
          { type: 'btn', icon: 'hidden', title: 'Hidden', hidden: true, onClick: vi.fn() },
          { type: 'custom', component: defineComponent({ setup: () => () => h('button', { class: 'custom-control' }, 'C') }) },
        ],
      },
    }

    const wrapper = mount(ControlCenter, {
      global: {
        directives,
        stubs: { teleport: true },
      },
    })

    expect(mocks.actions.has('control-center.toggle')).toBe(true)
    expect(mocks.tapActionBtns).toHaveBeenCalledWith(expect.any(Function))

    mocks.actions.get('control-center.refresh').handler()
    mocks.actions.get('control-center.toggle').handler(true)
    await nextTick()
    expect(wrapper.find('.control-center').exists()).toBe(true)
    expect(wrapper.find('.btn.checked').attributes('title')).toBe('Bold')
    expect(wrapper.find('.custom-control').text()).toBe('C')
    expect(wrapper.text()).not.toContain('hidden')

    await wrapper.find('.btn').trigger('click')
    expect(click).toHaveBeenCalled()

    const tapper = mocks.tapActionBtns.mock.calls[0][0]
    const btns: any[] = []
    tapper(btns)
    expect(btns[0]).toMatchObject({ type: 'separator', order: 9999 })
    btns[1].onClick()
    await nextTick()
    expect(wrapper.find('.control-center').exists()).toBe(false)

    mocks.actions.get('control-center.toggle').handler(true)
    expect(mocks.actions.get('control-center.hide').when()).toBe(true)
    mocks.actions.get('control-center.hide').handler()
    await nextTick()
    expect(wrapper.find('.control-center').exists()).toBe(false)

    wrapper.unmount()
    expect(mocks.actions.has('control-center.refresh')).toBe(false)
    expect(mocks.removeActionBtnTapper).toHaveBeenCalledWith(tapper)
  })
})

describe('StatusBar and CreateFilePanel', () => {
  test('renders left and right status menus', () => {
    const wrapper = shallowMount(StatusBar)
    expect(wrapper.findAllComponents({ name: 'StatusBarMenu' }).map(item => item.props('position'))).toEqual(['left', 'right'])
  })

  test('filters creatable doc types and emits selection updates', async () => {
    const markdown = { id: 'md', displayName: 'Markdown', extension: ['.md'], buildNewContent: vi.fn() }
    const skipped = { id: 'txt', displayName: 'Text', extension: ['.txt'] }
    const wrapper = mount(CreateFilePanel, {
      props: {
        currentPath: '/docs',
        docType: markdown,
        categories: [
          { category: 'docs', displayName: 'Docs', types: [markdown, skipped] },
          { category: 'empty', displayName: 'Empty', types: [skipped] },
        ],
      },
      global: { mocks: { $t: (key: string, value?: string) => `${key}:${value}` } },
    })

    expect(wrapper.find('.category-title').text()).toBe('Docs')
    expect(wrapper.text()).toContain('Markdown')
    expect(wrapper.text()).not.toContain('Text')
    expect(wrapper.find('input').element.checked).toBe(true)
    expect(wrapper.find('.current-path').text()).toBe('document.current-path:/docs')

    await wrapper.find('.category-item').trigger('click')
    expect(wrapper.emitted('updateDocType')).toEqual([[ markdown ]])
  })
})
