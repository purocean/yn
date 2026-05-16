import { defineComponent, nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: undefined as any,
  actions: new Map<string, any>(),
  hooks: new Map<string, { handler: Function, once?: boolean }>(),
  getAvailableCustomEditors: vi.fn(),
  isDefault: vi.fn(() => false),
  getValue: vi.fn(() => 'editor value'),
  setValue: vi.fn(),
  switchEditor: vi.fn((name: string) => { mocks.storeState.editor = name }),
  triggerHook: vi.fn(),
  storageValue: { editorA: 100, editorB: 200 } as Record<string, number>,
  storageSet: vi.fn(),
  tapActionBtns: vi.fn(),
  removeActionBtnTapper: vi.fn(),
  refreshActionBtns: vi.fn(),
  quickFilterShow: vi.fn(),
  loggerDebug: vi.fn(),
}))

vi.mock('@fe/services/editor', () => ({
  getAvailableCustomEditors: mocks.getAvailableCustomEditors,
  isDefault: mocks.isDefault,
  getValue: mocks.getValue,
  setValue: mocks.setValue,
  switchEditor: mocks.switchEditor,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function, once?: boolean) => mocks.hooks.set(name, { handler, once }),
  removeHook: (name: string) => mocks.hooks.delete(name),
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ debug: mocks.loggerDebug }),
  storage: {
    get: () => mocks.storageValue,
    set: mocks.storageSet,
  },
}))

vi.mock('@fe/services/workbench', () => ({
  FileTabs: {
    tapActionBtns: mocks.tapActionBtns,
    removeActionBtnTapper: mocks.removeActionBtnTapper,
    refreshActionBtns: mocks.refreshActionBtns,
  },
}))

vi.mock('@fe/support/ui/quick-filter', () => ({
  useQuickFilter: () => ({
    show: mocks.quickFilterShow,
  }),
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@fe/support/store', () => ({
  default: {
    get state () { return mocks.storeState },
  },
}))

vi.mock('../DefaultEditor.vue', () => ({
  default: {
    name: 'DefaultEditor',
    template: '<div class="default-editor" />',
  },
}))

import Editor from '../Editor.vue'

const CustomA = defineComponent({ name: 'CustomA', template: '<div class="custom-a">A</div>' })
const CustomB = defineComponent({ name: 'CustomB', template: '<div class="custom-b">B</div>' })
const doc = { repo: 'repo-a', path: '/a.md', name: 'a.md', type: 'file' }

const flush = async () => {
  await Promise.resolve()
  await nextTick()
}

beforeEach(() => {
  mocks.storeState = reactive({
    editor: 'missing',
    currentFile: doc,
    currentContent: 'current body',
  })
  mocks.actions.clear()
  mocks.hooks.clear()
  mocks.getAvailableCustomEditors.mockResolvedValue([
    { name: 'editorA', displayName: 'Editor A', component: CustomA },
    { name: 'editorB', displayName: 'Editor B', component: CustomB },
  ])
  mocks.isDefault.mockReturnValue(false)
  mocks.getValue.mockReturnValue('editor value')
  mocks.setValue.mockClear()
  mocks.switchEditor.mockClear()
  mocks.triggerHook.mockClear()
  mocks.storageSet.mockClear()
  mocks.tapActionBtns.mockClear()
  mocks.removeActionBtnTapper.mockClear()
  mocks.refreshActionBtns.mockClear()
  mocks.quickFilterShow.mockClear()
  mocks.loggerDebug.mockClear()
})

describe('Editor', () => {
  test('loads custom editors, switches missing editor to most recently used one, and rotates editors', async () => {
    const wrapper = mount(Editor)
    await flush()

    expect(mocks.actions.has('editor.refresh-custom-editor')).toBe(true)
    expect(mocks.actions.has('editor.rotate-custom-editors')).toBe(true)
    expect(mocks.hooks.has('DOC_BEFORE_SWITCH')).toBe(true)
    expect(mocks.tapActionBtns).toHaveBeenCalledWith(expect.any(Function))
    expect(mocks.switchEditor).toHaveBeenCalledWith('editorB')
    expect(wrapper.find('.custom-b').exists()).toBe(true)

    mocks.actions.get('editor.rotate-custom-editors').handler()
    await nextTick()
    expect(mocks.switchEditor).toHaveBeenLastCalledWith('editorA')
    expect(mocks.triggerHook).toHaveBeenCalledWith('EDITOR_CURRENT_EDITOR_CHANGE', {
      current: expect.objectContaining({ name: 'editorA' }),
    })
    expect(mocks.refreshActionBtns).toHaveBeenCalled()
    expect(mocks.storageSet).toHaveBeenCalledWith('editor.last-usage-time', expect.objectContaining({ editorA: expect.any(Number) }))

    await mocks.hooks.get('DOC_BEFORE_SWITCH')!.handler({ doc: { ...doc, path: '/b.md' } })
    expect(mocks.getAvailableCustomEditors).toHaveBeenLastCalledWith({ doc: { ...doc, path: '/b.md' } })
  })

  test('injects file-tab editor switcher and syncs default editor content when chosen', async () => {
    mount(Editor)
    await flush()

    const actionBtns: any[] = []
    const tapper = mocks.tapActionBtns.mock.calls[0][0]
    tapper(actionBtns)

    expect(actionBtns.map(btn => btn.type)).toEqual(['separator', 'normal'])

    actionBtns[1].onClick({
      currentTarget: {
        getBoundingClientRect: () => ({ bottom: 20, right: 30 }),
      },
    })

    const filterOptions = mocks.quickFilterShow.mock.calls[0][0]
    expect(filterOptions).toMatchObject({
      filterInputHidden: true,
      current: mocks.storeState.editor,
    })
    expect(filterOptions.list).toEqual(expect.arrayContaining([
      { key: 'editorA', label: 'Editor A' },
      { key: 'editorB', label: 'Editor B' },
    ]))

    mocks.isDefault.mockReturnValue(true)
    mocks.quickFilterShow.mock.calls[0][0].onChoose({ key: 'default' })
    await nextTick()

    expect(mocks.switchEditor).toHaveBeenCalledWith('default')
    expect(mocks.setValue).toHaveBeenCalledWith('current body')
  })

  test('falls back to default and unregisters hooks/actions on unmount', async () => {
    mocks.getAvailableCustomEditors.mockResolvedValueOnce([])
    const wrapper = mount(Editor)
    await flush()

    expect(mocks.switchEditor).toHaveBeenCalledWith('default')
    expect(wrapper.find('.default-editor').isVisible()).toBe(true)

    wrapper.unmount()
    expect(mocks.actions.size).toBe(0)
    expect(mocks.hooks.has('DOC_BEFORE_SWITCH')).toBe(false)
    expect(mocks.removeActionBtnTapper).toHaveBeenCalledWith(expect.any(Function))
  })
})
