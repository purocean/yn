import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  actions: new Map<string, Function>(),
  rawActions: [] as any[],
  keybindings: [] as any[],
  nonUsLayout: false,
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
  getSetting: (key: string) => key === 'keybindings' ? mocks.keybindings : mocks.nonUsLayout,
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
  mocks.nonUsLayout = false
  mocks.setSetting.mockReset()
  mocks.setSetting.mockResolvedValue(undefined)
  mocks.modalAlert.mockReset()
  mocks.disableShortcuts.mockReset()
  mocks.enableShortcuts.mockReset()
})

describe('KeyboardShortcuts', () => {
  test('keeps existing bindings intact when switching modes', async () => {
    mocks.keybindings = [
      { type: 'workbench', command: 'workbench.save', keys: 'Ctrl+Z', binding: 'mode=key,key=w,code=KeyZ,ctrl,location=0' },
    ]
    const wrapper = mount(KeyboardShortcuts, {
      global: {
        mocks: { $t: (key: string) => key },
        directives: { autoFocus: {} },
      },
    })

    await mocks.actions.get('keyboard-shortcuts.show-manager')?.()
    await flushPromises()
    const checkbox = wrapper.find('.action input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.find('[data-id="workbench.save"] kbd').text()).toBe('Ctrl')
    expect(wrapper.findAll('[data-id="workbench.save"] kbd')[1].text()).toBe('Z')

    await checkbox.setValue(true)
    await flushPromises()
    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings.non-us-layout', true)
    expect(wrapper.findAll('[data-id="workbench.save"] kbd')[1].text()).toBe('w')

    await checkbox.setValue(false)
    await flushPromises()
    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings.non-us-layout', false)
    expect(wrapper.findAll('[data-id="workbench.save"] kbd')[1].text()).toBe('Z')
    expect(mocks.setSetting).not.toHaveBeenCalledWith('keybindings', expect.anything())
    expect(mocks.keybindings[0].binding).toBe('mode=key,key=w,code=KeyZ,ctrl,location=0')
    wrapper.unmount()
  })

  test('shows cleared legacy shortcuts as unset', async () => {
    mocks.keybindings = [{ type: 'workbench', command: 'workbench.save', keys: null }]
    const wrapper = mount(KeyboardShortcuts, {
      global: {
        mocks: { $t: (key: string) => key },
        directives: { autoFocus: {} },
      },
    })

    await mocks.actions.get('keyboard-shortcuts.show-manager')?.()
    await flushPromises()
    expect(wrapper.findAll('[data-id="workbench.save"] kbd')).toHaveLength(0)
    expect(wrapper.find('[data-id="workbench.save"]').text()).toContain('keyboard-shortcuts.not-set')
    wrapper.unmount()
  })

  test('records only legacy keys with the option disabled', async () => {
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
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyZ', ctrlKey: true, bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings', expect.arrayContaining([
      { type: 'workbench', command: 'workbench.open', keys: 'Ctrl+Z' },
    ]))
    wrapper.unmount()
  })

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
    mocks.nonUsLayout = true
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
      key: 'w',
      code: 'KeyZ',
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
      { type: 'workbench', command: 'workbench.open', keys: 'Ctrl+w', binding: 'mode=key,key=w,code=KeyZ,ctrl,location=0' },
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

  test('does not record IME composition or repeated keydown events', async () => {
    mocks.nonUsLayout = true
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

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'w',
      code: 'KeyZ',
      ctrlKey: true,
      isComposing: true,
      bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'w',
      code: 'KeyZ',
      ctrlKey: true,
      repeat: true,
      bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
    }))
    await flushPromises()

    expect(mocks.setSetting).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('records keypad keys as physical bindings', async () => {
    mocks.nonUsLayout = true
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

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: '1', code: 'Numpad1', location: 3, ctrlKey: true, bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true,
    }))
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings', expect.arrayContaining([
      { type: 'workbench', command: 'workbench.open', keys: 'Ctrl+Numpad1', binding: 'mode=code,key=1,code=Numpad1,ctrl,location=3' },
    ]))
    wrapper.unmount()
  })

  test('records modified Enter instead of treating it as confirmation', async () => {
    mocks.nonUsLayout = true
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

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', ctrlKey: true, bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true,
    }))
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings', expect.arrayContaining([
      { type: 'workbench', command: 'workbench.open', keys: 'Ctrl+Enter', binding: 'mode=key,key=Enter,code=Enter,ctrl,location=0' },
    ]))
    wrapper.unmount()
  })

  test('clears stale binding metadata when the latest event is modifier-only', async () => {
    mocks.nonUsLayout = true
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

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'w', code: 'KeyZ', ctrlKey: true, bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true,
    }))
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings', expect.arrayContaining([
      { type: 'workbench', command: 'workbench.open', keys: 'Shift' },
    ]))
    wrapper.unmount()
  })

  test('compares conflict by effective binding instead of displayed label', async () => {
    mocks.nonUsLayout = true
    mocks.keybindings = [
      { type: 'workbench', command: 'workbench.open', keys: 'Ctrl+S', binding: 'mode=code,key=s,code=KeyZ,ctrl,location=0' },
    ]
    const wrapper = mount(KeyboardShortcuts, {
      global: {
        mocks: { $t: (key: string) => key },
        directives: { autoFocus: {} },
      },
    })

    await mocks.actions.get('keyboard-shortcuts.show-manager')?.()
    await flushPromises()
    await wrapper.find('input').setValue('#')

    expect(wrapper.findAll('tbody tr.item')).toHaveLength(0)
    wrapper.unmount()
  })

  test('records editor letters logically and punctuation by physical code', async () => {
    mocks.nonUsLayout = true
    const wrapper = mount(KeyboardShortcuts, {
      global: {
        mocks: { $t: (key: string) => key },
        directives: { autoFocus: {} },
      },
    })

    await mocks.actions.get('keyboard-shortcuts.show-manager')?.()
    await flushPromises()
    ;(wrapper.vm as any).tab = 'editor'
    await flushPromises()
    ;(wrapper.vm as any).editShortcuts('editor.action.rename')
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'w',
      code: 'KeyZ',
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
      { type: 'editor', command: 'editor.action.rename', keys: 'Ctrl+w', binding: 'mode=key,key=w,code=KeyZ,ctrl,location=0' },
    ]))

    ;(wrapper.vm as any).editShortcuts('editor.action.rename')
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: '-',
      code: 'Minus',
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
      { type: 'editor', command: 'editor.action.rename', keys: 'Ctrl+-', binding: 'mode=code,key=-,code=Minus,ctrl,location=0' },
    ]))

    ;(wrapper.vm as any).editShortcuts('editor.action.rename')
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: '!', code: 'Digit1', ctrlKey: true, shiftKey: true, bubbles: true,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true,
    }))
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('keybindings', expect.arrayContaining([
      { type: 'editor', command: 'editor.action.rename', keys: 'Ctrl+Shift+!', binding: 'mode=code,key=!,code=Digit1,ctrl,shift,location=0' },
    ]))
    wrapper.unmount()
  })

  test('records application letters using the same logical key representation', async () => {
    mocks.nonUsLayout = true
    const wrapper = mount(KeyboardShortcuts, {
      global: {
        mocks: { $t: (key: string) => key },
        directives: { autoFocus: {} },
      },
    })

    await mocks.actions.get('keyboard-shortcuts.show-manager')?.()
    await flushPromises()
    ;(wrapper.vm as any).tab = 'application'
    await flushPromises()
    ;(wrapper.vm as any).editShortcuts('app.quit')
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'w',
      code: 'KeyZ',
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
      { type: 'application', command: 'app.quit', keys: 'Ctrl+w', binding: 'mode=key,key=w,code=KeyZ,ctrl,location=0' },
    ]))
    wrapper.unmount()
  })
})
