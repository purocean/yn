import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  storeState: {
    currentContent: 'current content',
    currentFile: { type: 'file', repo: 'repo', path: '/a.md', name: 'a.md' },
  } as any,
  fetchHistoryList: vi.fn(),
  fetchHistoryContent: vi.fn(),
  commentHistoryVersion: vi.fn(),
  deleteHistoryVersion: vi.fn(),
  setValue: vi.fn(),
  modalInput: vi.fn(),
  modalConfirm: vi.fn(),
  toastShow: vi.fn(),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  createEditor: vi.fn(),
  createDiffEditor: vi.fn(),
  createModel: vi.fn(),
}))

vi.mock('dayjs', () => ({
  default: () => ({ to: () => 'relative time' }),
}))

vi.mock('@fe/core/action', () => ({
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: mocks.registerHook,
  removeHook: mocks.removeHook,
}))

vi.mock('@fe/core/keybinding', () => ({ Alt: 'Alt' }))

vi.mock('@fe/support/api', () => ({
  commentHistoryVersion: mocks.commentHistoryVersion,
  deleteHistoryVersion: mocks.deleteHistoryVersion,
  fetchHistoryContent: mocks.fetchHistoryContent,
  fetchHistoryList: mocks.fetchHistoryList,
}))

vi.mock('@fe/services/editor', () => ({
  getDefaultOptions: () => ({ fontSize: 12 }),
  getMonaco: () => ({
    editor: {
      create: mocks.createEditor,
      createDiffEditor: mocks.createDiffEditor,
      createModel: mocks.createModel,
    },
  }),
  setValue: mocks.setValue,
  whenEditorReady: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/services/document', () => ({
  isEncrypted: (doc: any) => String(doc.path).includes('encrypted'),
  isSameFile: (a: any, b: any) => a?.repo === b?.repo && a?.path === b?.path,
}))

vi.mock('@fe/services/base', () => ({ inputPassword: vi.fn() }))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string, ...args: string[]) => args.length ? `${key}:${args.join(':')}` : key }),
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ input: mocks.modalInput, confirm: mocks.modalConfirm, alert: vi.fn() }),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ debug: vi.fn() }),
}))

vi.mock('@fe/utils/crypto', () => ({ decrypt: vi.fn() }))

vi.mock('@fe/others/premium', () => ({
  getPurchased: () => true,
  showPremium: vi.fn(),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))

vi.mock('../Mask.vue', () => ({
  default: { name: 'XMask', props: ['show'], emits: ['close'], template: '<div v-if="show" class="mask-stub"><slot /></div>' },
}))

vi.mock('../GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['modelValue', 'tabs'],
    emits: ['update:modelValue'],
    template: '<div class="group-tabs-stub"><button v-for="tab in tabs" :key="tab.value" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
  },
}))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', emits: ['click'], template: '<i class="svg-icon" @click="$emit(\'click\', $event)" />' },
}))

import DocHistory from '../DocHistory.vue'

const editorMock = () => ({
  layout: vi.fn(),
  dispose: vi.fn(),
  getModel: vi.fn(() => ({ dispose: vi.fn(), original: { dispose: vi.fn() }, modified: { dispose: vi.fn() } })),
  setModel: vi.fn(),
})

beforeEach(() => {
  mocks.actions.clear()
  mocks.storeState.currentContent = 'current content'
  mocks.storeState.currentFile = { type: 'file', repo: 'repo', path: '/a.md', name: 'a.md' }
  mocks.fetchHistoryList.mockResolvedValue({
    size: 4096,
    list: [
      { name: '2024-01-02 03-04-05.md', comment: '' },
      { name: '2024-01-03 03-04-05.md', comment: 'important' },
    ],
  })
  mocks.fetchHistoryContent.mockResolvedValue('history content')
  mocks.commentHistoryVersion.mockResolvedValue(undefined)
  mocks.deleteHistoryVersion.mockResolvedValue(undefined)
  mocks.setValue.mockReset()
  mocks.modalInput.mockReset()
  mocks.modalConfirm.mockReset()
  mocks.toastShow.mockReset()
  mocks.registerHook.mockReset()
  mocks.removeHook.mockReset()
  mocks.createEditor.mockReturnValue(editorMock())
  mocks.createDiffEditor.mockReturnValue({ ...editorMock(), onDidUpdateDiff: vi.fn() })
  mocks.createModel.mockImplementation((content: string) => ({ content, dispose: vi.fn() }))
})

describe('DocHistory', () => {
  test('registers history actions, shows versions, chooses content, and applies to current doc', async () => {
    const wrapper = shallowMount(DocHistory, {
      global: {
        mocks: { $t: (key: string) => key },
        stubs: {
          XMask: { props: ['show'], template: '<div v-if="show" class="mask-stub"><slot /></div>' },
          GroupTabs: {
            props: ['modelValue', 'tabs'],
            emits: ['update:modelValue'],
            template: '<div class="group-tabs-stub"><button v-for="tab in tabs" :key="tab.value" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
          },
          SvgIcon: { emits: ['click'], template: '<i class="svg-icon" @click="$emit(\'click\', $event)" />' },
        },
      },
    })

    mocks.actions.get('doc.show-history')?.()
    await nextTick()
    await nextTick()
    await nextTick()

    expect(mocks.fetchHistoryList).toHaveBeenCalledWith(mocks.storeState.currentFile)
    expect(wrapper.findAll('.versions .item')).toHaveLength(2)
    expect(wrapper.text()).toContain('a.md')
    expect(mocks.fetchHistoryContent).toHaveBeenCalledWith(mocks.storeState.currentFile, '2024-01-02 03-04-05.md')

    await wrapper.find('.btn.primary').trigger('click')
    expect(mocks.setValue).toHaveBeenCalledWith('history content')
    expect(wrapper.find('.history-wrapper').exists()).toBe(false)
  })

  test('marks, filters, deletes and clears versions', async () => {
    mocks.modalInput.mockResolvedValue('note')
    mocks.modalConfirm.mockResolvedValue(true)
    const wrapper = shallowMount(DocHistory, {
      global: {
        mocks: { $t: (key: string) => key },
        stubs: {
          XMask: { props: ['show'], template: '<div v-if="show" class="mask-stub"><slot /></div>' },
          GroupTabs: {
            props: ['modelValue', 'tabs'],
            emits: ['update:modelValue'],
            template: '<div class="group-tabs-stub"><button v-for="tab in tabs" :key="tab.value" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
          },
          SvgIcon: { emits: ['click'], template: '<i class="svg-icon" @click="$emit(\'click\', $event)" />' },
        },
      },
    })

    mocks.actions.get('doc.show-history')?.()
    await nextTick()
    await nextTick()
    await nextTick()

    await (wrapper.vm as any).markVersion((wrapper.vm as any).versions[0])
    expect(mocks.commentHistoryVersion).toHaveBeenCalledWith(mocks.storeState.currentFile, '2024-01-02 03-04-05.md', 'note')

    ;(wrapper.vm as any).listType = 'marked'
    await nextTick()
    expect(wrapper.findAll('.versions .item')).toHaveLength(2)

    await (wrapper.vm as any).deleteVersion((wrapper.vm as any).versions[0])
    expect(mocks.deleteHistoryVersion).toHaveBeenCalledWith(mocks.storeState.currentFile, '2024-01-02 03-04-05.md')

    await (wrapper.vm as any).clearVersions()
    expect(mocks.deleteHistoryVersion).toHaveBeenCalledWith(mocks.storeState.currentFile, '--all--')
  })
})
