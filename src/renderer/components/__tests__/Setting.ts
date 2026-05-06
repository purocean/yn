import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  editor: undefined as any,
  editorValue: undefined as any,
  editorErrors: [] as any[],
  fieldSetValue: vi.fn(),
  editorDestroy: vi.fn(),
  editorOn: vi.fn(),
  fetchSettings: vi.fn(),
  writeSettings: vi.fn(),
  showSettingPanel: vi.fn(),
  choosePath: vi.fn(),
  toastShow: vi.fn(),
  modalConfirm: vi.fn(),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  triggerHook: vi.fn(),
  getActionHandler: vi.fn(),
}))

vi.mock('@json-editor/json-editor', () => {
  class MockJSONEditor {
    static defaults = {
      language: 'en',
      languages: {
        en: {},
      },
    }

    root: HTMLElement
    fields: Record<string, any>

    constructor (root: HTMLElement) {
      this.root = root
      root.innerHTML = `
        <div class="row">
          <div data-schematype="string" data-schemapath="root.repoPath">
            <label class="je-form-input-label">Repo Path</label>
            <input name="root[repoPath]" />
          </div>
        </div>
        <div class="row">
          <div data-schematype="boolean" data-schemapath="root.enableFeature">
            <label class="form-control">Enable</label>
          </div>
        </div>
      `

      const input = root.querySelector('input') as HTMLInputElement
      this.fields = {
        'root.repos': {
          constructor: { prototype: { addRow: vi.fn() } },
          schema: {},
          addRow: vi.fn(),
        },
        'root.repoPath': {
          schema: {
            suggestions: [
              { label: 'Workspace', value: '/workspace' },
              '/tmp',
            ],
            openDialogOptions: { properties: ['openDirectory'] },
          },
          input,
          getValue: () => '/custom',
          setValue: mocks.fieldSetValue,
        },
        'root.enableFeature': {
          schema: {},
          getValue: () => true,
          setValue: mocks.fieldSetValue,
        },
      }
      mocks.editor = this
    }

    on (name: string, handler: Function) {
      mocks.editorOn(name, handler)
      ;(this as any).handler = handler
    }

    getEditor (path: string) {
      return this.fields[path]
    }

    setValue (value: any) {
      mocks.editorValue = value
    }

    getValue () {
      return mocks.editorValue
    }

    validate () {
      return mocks.editorErrors
    }

    destroy () {
      mocks.editorDestroy()
    }
  }

  return { JSONEditor: MockJSONEditor }
})

vi.mock('@fe/support/api', () => ({
  choosePath: mocks.choosePath,
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({
    t: (key: string, value?: string) => value ? `${key}:${value}` : key,
  }),
}))

vi.mock('@fe/services/setting', () => ({
  fetchSettings: mocks.fetchSettings,
  getSchema: () => ({
    groups: [
      { label: 'Repos', value: 'repos' },
      { label: 'Other', value: 'other' },
    ],
    properties: {
      repos: { group: 'repos', defaultValue: [] },
      repoPath: { group: 'repos', defaultValue: '/default' },
      enableFeature: { group: 'other', defaultValue: false },
    },
  }),
  showSettingPanel: mocks.showSettingPanel,
  writeSettings: mocks.writeSettings,
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: mocks.registerHook,
  removeHook: mocks.removeHook,
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/utils/path', () => ({
  basename: (path: string) => path.split('/').filter(Boolean).pop() || '',
}))

vi.mock('@fe/core/action', () => ({
  getActionHandler: mocks.getActionHandler,
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ confirm: mocks.modalConfirm }),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: { showSetting: true } },
}))

vi.mock('../GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['tabs', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div><button v-for="tab in tabs" :key="tab.value" class="tab" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
  },
}))

import Setting from '../Setting.vue'

beforeEach(() => {
  vi.useRealTimers()
  mocks.editor = undefined
  mocks.editorValue = {
    repos: [{ name: '', path: '/Users/me/MyRepository', enableIndexing: false }],
    repoPath: '/custom',
    enableFeature: true,
  }
  mocks.editorErrors = []
  mocks.fieldSetValue.mockReset()
  mocks.editorDestroy.mockReset()
  mocks.editorOn.mockReset()
  mocks.fetchSettings.mockReset()
  mocks.fetchSettings.mockResolvedValue({
    repos: [],
    repoPath: '/custom',
    enableFeature: true,
  })
  mocks.writeSettings.mockReset()
  mocks.writeSettings.mockResolvedValue(undefined)
  mocks.showSettingPanel.mockReset()
  mocks.choosePath.mockReset()
  mocks.choosePath.mockResolvedValue({ canceled: false, filePaths: ['/chosen'] })
  mocks.toastShow.mockReset()
  mocks.modalConfirm.mockReset()
  mocks.modalConfirm.mockResolvedValue(true)
  mocks.registerHook.mockReset()
  mocks.removeHook.mockReset()
  mocks.triggerHook.mockReset()
  mocks.triggerHook.mockResolvedValue(undefined)
  mocks.getActionHandler.mockReset()
  mocks.getActionHandler.mockReturnValue(vi.fn())
})

const mountSetting = () => mount(Setting, {
  global: {
    mocks: { $t: (key: string) => key },
  },
})

describe('Setting', () => {
  test('initializes JSON editor, suggestions, reset buttons, path picker, and cleanup', async () => {
    vi.useFakeTimers()
    const wrapper = mountSetting()
    await flushPromises()

    expect(mocks.triggerHook).toHaveBeenCalledWith('SETTING_PANEL_BEFORE_SHOW', {}, { breakable: true })
    expect(mocks.editorOn).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mocks.editorValue.repos).toEqual([{ name: '', path: '', enableIndexing: false }])

    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(wrapper.find('.reset-button').exists()).toBe(true)

    await wrapper.find('.reset-button').trigger('click')
    await flushPromises()
    expect(mocks.fieldSetValue).toHaveBeenCalledWith('/default')

    await wrapper.find('input').trigger('click')
    await flushPromises()
    expect(mocks.choosePath).toHaveBeenCalledWith({ properties: ['openDirectory'] })
    expect(mocks.fieldSetValue).toHaveBeenCalledWith('/chosen')

    await wrapper.find('input').trigger('focus')
    await flushPromises()
    expect(wrapper.findAll('.suggestions-datalist li').map(x => x.text())).toEqual(['Workspace', '/tmp'])
    await wrapper.find('.suggestions-datalist li').trigger('click')
    expect(mocks.fieldSetValue).toHaveBeenCalledWith('/workspace')

    wrapper.unmount()
    expect(mocks.editorDestroy).toHaveBeenCalled()
    expect(mocks.removeHook).toHaveBeenCalledWith('I18N_CHANGE_LANGUAGE', expect.any(Function))
  })

  test('writes settings, derives missing repo names, and emits close', async () => {
    const wrapper = mountSetting()
    await flushPromises()

    mocks.editorValue = {
      repos: [{ name: '', path: '/Users/me/MyRepository', enableIndexing: false }],
      repoPath: '/custom',
      enableFeature: true,
    }

    await (wrapper.vm as any).ok()
    await flushPromises()

    expect(mocks.writeSettings).toHaveBeenCalledWith(expect.objectContaining({
      repos: [{ name: 'MyReposito', path: '/Users/me/MyRepository', enableIndexing: false }],
    }))
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('warns for invalid repository rows and validation errors', async () => {
    const wrapper = mountSetting()
    await flushPromises()

    mocks.editorValue = {
      repos: [{ name: 'Repo', path: '   ', enableIndexing: false }],
      repoPath: '/custom',
      enableFeature: true,
    }

    await expect((wrapper.vm as any).ok()).rejects.toThrow('setting-panel.error-choose-repo-path')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'setting-panel.error-choose-repo-path')

    mocks.editorValue = {
      repos: [{ name: 'Repo', path: '/repo', enableIndexing: false }],
      repoPath: '/custom',
      enableFeature: true,
    }
    mocks.editorErrors = [{ path: 'root.repoPath', message: 'Bad path' }]

    await expect((wrapper.vm as any).ok()).rejects.toThrow('Bad path')
    expect(mocks.showSettingPanel).toHaveBeenCalledWith('repoPath')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Bad path')
  })

  test('closes before showing keyboard shortcuts action', async () => {
    const handler = vi.fn()
    mocks.getActionHandler.mockReturnValue(handler)
    const wrapper = mountSetting()
    await flushPromises()

    await wrapper.find('.action a').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(handler).toHaveBeenCalled()
  })
})
