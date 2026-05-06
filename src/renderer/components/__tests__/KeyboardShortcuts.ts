import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  rawActions: [] as any[],
  keybindings: [] as any[],
  setSetting: vi.fn(),
  modalAlert: vi.fn(),
  disableShortcuts: vi.fn(),
  enableShortcuts: vi.fn(),
  editorActions: [] as any[],
}))

vi.mock('@share/misc', () => ({
  getDefaultApplicationAccelerators: () => [
    { command: 'app.quit', accelerator: 'Ctrl+Q', description: 'Quit' },
  ],
}))

vi.mock('@fe/core/action', () => ({
  getRawActions: () => mocks.rawActions,
  registerAction: (action: any) => mocks.actions.set(action.name, action.handler),
  removeAction: (name: string) => mocks.actions.delete(name),
}))

vi.mock('@fe/core/keybinding', () => ({
  Alt: 'Alt',
  Cmd: 'Cmd',
  Ctrl: 'Ctrl',
  Meta: 'Meta',
  Shift: 'Shift',
  Win: 'Win',
  disableShortcuts: mocks.disableShortcuts,
  enableShortcuts: mocks.enableShortcuts,
  getKeyLabel: (key: string) => key,
  getKeysLabel: (keys: string[]) => keys.join(' + '),
}))

vi.mock('@fe/support/env', () => ({
  isMacOS: false,
  isWindows: false,
  isOtherOS: true,
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ alert: mocks.modalAlert }),
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: () => mocks.keybindings,
  setSetting: mocks.setSetting,
}))

vi.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => 'en',
  useI18n: () => ({
    t: (key: string, value?: string) => value ? `${key}:${value}` : key,
    $t: { value: (key: string) => key },
  }),
}))

vi.mock('@fe/services/editor', () => ({
  lookupKeybindingKeys: (id: string) => id === 'editor.action.enter' ? ['Enter'] : ['Ctrl', 'E'],
  whenEditorReady: () => Promise.resolve({
    editor: {
      getActions: () => mocks.editorActions,
    },
  }),
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

vi.mock('../Mask.vue', () => ({
  default: { name: 'XMask', props: ['show'], emits: ['close'], template: '<div><slot /></div>' },
}))

vi.mock('../GroupTabs.vue', () => ({
  default: {
    name: 'GroupTabs',
    props: ['tabs', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div><button v-for="tab in tabs" :key="tab.value" class="tab" @click="$emit(\'update:modelValue\', tab.value)">{{tab.label}}</button></div>',
  },
}))

import KeyboardShortcuts from '../KeyboardShortcuts.vue'

beforeEach(() => {
  mocks.actions.clear()
  mocks.rawActions = [
    { name: 'workbench.save', description: 'Save', keys: ['Ctrl', 'S'], forUser: true },
    { name: 'workbench.open', description: 'Open', keys: ['Ctrl', 'S'], forUser: true },
    { name: 'internal.hidden', keys: ['Ctrl', 'H'], forUser: false },
  ]
  mocks.keybindings = [
    { type: 'workbench', command: 'workbench.save', keys: 'Ctrl+S' },
    { type: 'workbench', command: 'missing.command', keys: 'Ctrl+S' },
  ]
  mocks.editorActions = [
    { id: 'editor.action.enter', label: 'Enter Action' },
    { id: 'editor.action.rename', label: 'Rename' },
  ]
  mocks.setSetting.mockReset()
  mocks.setSetting.mockResolvedValue(undefined)
  mocks.modalAlert.mockReset()
  mocks.disableShortcuts.mockReset()
  mocks.enableShortcuts.mockReset()
})

describe('KeyboardShortcuts', () => {
  test('shows workbench commands, filters modified and conflict rows, and opens conflict modal', async () => {
    const wrapper = mount(KeyboardShortcuts, {
      global: {
        mocks: { $t: (key: string, value?: string) => value ? `${key}:${value}` : key },
        directives: { autoFocus: {} },
      },
    })

    expect(mocks.actions.has('keyboard-shortcuts.show-manager')).toBe(true)

    await mocks.actions.get('keyboard-shortcuts.show-manager')?.()
    await flushPromises()

    expect(wrapper.findAll('tbody tr.item')).toHaveLength(3)
    expect(wrapper.text()).toContain('workbench.save')
    expect(wrapper.text()).toContain('missing.command')

    await wrapper.find('input').setValue('*')
    expect(wrapper.findAll('tbody tr.item')).toHaveLength(2)

    await wrapper.find('input').setValue('#')
    expect(wrapper.findAll('tbody tr.item')).toHaveLength(3)

    await wrapper.find('td a').trigger('click')
    expect(mocks.modalAlert).toHaveBeenCalledWith(expect.objectContaining({
      title: 'keyboard-shortcuts.conflict-title:Ctrl + S',
    }))
  })

  test('records, clears, resets shortcuts, switches tabs, and cleans up action', async () => {
    const wrapper = mount(KeyboardShortcuts, {
      global: {
        mocks: { $t: (key: string) => key },
        directives: { autoFocus: {} },
      },
    })

    await mocks.actions.get('keyboard-shortcuts.show-manager')?.()
    await flushPromises()

    ;(wrapper.vm as any).editShortcuts('workbench.open')
    await flushPromises()
    expect(mocks.disableShortcuts).toHaveBeenCalled()

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      ctrlKey: true,
      bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
    }))
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings', expect.arrayContaining([
      { type: 'workbench', command: 'workbench.open', keys: 'Ctrl+K' },
    ]))

    await (wrapper.vm as any).clearShortcuts('workbench.save')
    expect(mocks.setSetting).toHaveBeenLastCalledWith('keybindings', expect.arrayContaining([
      { type: 'workbench', command: 'workbench.save', keys: null },
    ]))

    await (wrapper.vm as any).resetShortcuts('workbench.save')
    expect(mocks.setSetting).toHaveBeenLastCalledWith('keybindings', expect.not.arrayContaining([
      expect.objectContaining({ command: 'workbench.save' }),
    ]))

    ;(wrapper.vm as any).tab = 'editor'
    await flushPromises()
    expect(wrapper.text()).toContain('editor.action.enter')

    ;(wrapper.vm as any).hide()
    expect((wrapper.vm as any).managerVisible).toBe(false)
    expect((wrapper.vm as any).commands).toEqual([])

    wrapper.unmount()
    expect(mocks.actions.has('keyboard-shortcuts.show-manager')).toBe(false)
  })
})
