import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  startup: vi.fn(),
  getActionHandler: vi.fn(),
  toggleXterm: vi.fn(),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  editorChangeHandler: undefined as any,
  storeState: {
    showOutline: false,
    presentation: true,
  },
  emitResize: vi.fn(),
  exitPresent: vi.fn(),
  stub: (name: string) => ({
    name,
    template: `<div class="${name}"><slot /></div>`,
  }),
}))

vi.mock('@fe/startup', () => ({ default: mocks.startup }))
vi.mock('@fe/core/action', () => ({
  getActionHandler: mocks.getActionHandler,
}))
vi.mock('@fe/core/hook', () => ({
  registerHook: (name: string, handler: Function) => {
    mocks.registerHook(name, handler)
    if (name === 'EDITOR_CURRENT_EDITOR_CHANGE') {
      mocks.editorChangeHandler = handler
    }
  },
  removeHook: mocks.removeHook,
}))
vi.mock('@fe/support/args', () => ({
  FLAG_DISABLE_XTERM: true,
  MODE: 'normal',
}))
vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))
vi.mock('@fe/services/layout', () => ({
  emitResize: mocks.emitResize,
}))
vi.mock('@fe/services/view', () => ({
  exitPresent: mocks.exitPresent,
}))

vi.mock('@fe/components/Layout.vue', () => ({
  default: {
    name: 'Layout',
    template: `
      <div class="layout">
        <slot name="header" />
        <slot name="left" />
        <slot name="terminal" />
        <slot name="editor" />
        <slot name="preview" />
        <slot name="content-right-side" />
        <slot name="right-before" />
        <slot name="footer" />
      </div>
    `,
  },
}))
vi.mock('@fe/components/SvgIcon.vue', () => ({ default: mocks.stub('SvgIcon') }))
vi.mock('@fe/components/TitleBar.vue', () => ({ default: mocks.stub('TitleBar') }))
vi.mock('@fe/components/StatusBar.vue', () => ({ default: mocks.stub('StatusBar') }))
vi.mock('@fe/components/Tree.vue', () => ({ default: mocks.stub('Tree') }))
vi.mock('@fe/components/Terminal.vue', () => ({
  default: {
    name: 'Terminal',
    emits: ['hide'],
    template: '<button class="Terminal" @click="$emit(\'hide\')">terminal</button>',
  },
}))
vi.mock('@fe/components/FileTabs.vue', () => ({ default: mocks.stub('FileTabs') }))
vi.mock('@fe/components/Editor.vue', () => ({ default: mocks.stub('Editor') }))
vi.mock('@fe/components/Previewer.vue', () => ({ default: mocks.stub('Previewer') }))
vi.mock('@fe/components/ContentRightSide.vue', () => ({ default: mocks.stub('ContentRightSide') }))
vi.mock('@fe/components/SettingPanel.vue', () => ({ default: mocks.stub('SettingPanel') }))
vi.mock('@fe/components/ExportPanel.vue', () => ({ default: mocks.stub('ExportPanel') }))
vi.mock('@fe/components/Premium.vue', () => ({ default: mocks.stub('Premium') }))
vi.mock('@fe/components/Filter.vue', () => ({ default: mocks.stub('Filter') }))
vi.mock('@fe/components/ControlCenter.vue', () => ({ default: mocks.stub('ControlCenter') }))
vi.mock('@fe/components/DocHistory.vue', () => ({ default: mocks.stub('DocHistory') }))
vi.mock('@fe/components/ActionBar.vue', () => ({ default: mocks.stub('ActionBar') }))
vi.mock('@fe/components/Outline.vue', () => ({ default: mocks.stub('Outline') }))
vi.mock('@fe/components/SearchPanel.vue', () => ({ default: mocks.stub('SearchPanel') }))
vi.mock('@fe/components/ExtensionManager.vue', () => ({ default: mocks.stub('ExtensionManager') }))
vi.mock('@fe/components/KeyboardShortcuts.vue', () => ({ default: mocks.stub('KeyboardShortcuts') }))

import Main from '../Main.vue'

beforeEach(() => {
  mocks.startup.mockClear()
  mocks.getActionHandler.mockReturnValue(mocks.toggleXterm)
  mocks.toggleXterm.mockClear()
  mocks.registerHook.mockClear()
  mocks.removeHook.mockClear()
  mocks.editorChangeHandler = undefined
  mocks.storeState.showOutline = false
  mocks.storeState.presentation = true
  mocks.emitResize.mockClear()
  mocks.exitPresent.mockClear()
})

describe('Main', () => {
  test('starts renderer, registers editor hook, toggles terminal and presentation exit', async () => {
    const wrapper = mount(Main)
    await nextTick()

    expect(mocks.startup).toHaveBeenCalled()
    expect(mocks.registerHook).toHaveBeenCalledWith('EDITOR_CURRENT_EDITOR_CHANGE', expect.any(Function))
    expect(wrapper.findComponent({ name: 'Layout' }).classes()).toContain('flag-disable-xterm')
    expect(wrapper.findComponent({ name: 'Tree' }).exists()).toBe(true)

    await wrapper.find('.Terminal').trigger('click')
    expect(mocks.getActionHandler).toHaveBeenCalledWith('layout.toggle-xterm')
    expect(mocks.toggleXterm).toHaveBeenCalledWith(false)

    mocks.editorChangeHandler({ current: { hiddenPreview: true } })
    await nextTick()
    expect(wrapper.findComponent({ name: 'Layout' }).classes()).toContain('editor-force-only')
    expect(mocks.emitResize).toHaveBeenCalled()

    await wrapper.find('.presentation-exit').trigger('click')
    expect(mocks.exitPresent).toHaveBeenCalled()

    wrapper.unmount()
    expect(mocks.removeHook).toHaveBeenCalledWith('EDITOR_CURRENT_EDITOR_CHANGE', mocks.editorChangeHandler)
  })

  test('shows outline instead of tree and hides presentation exit outside presentation mode', async () => {
    mocks.storeState.showOutline = true
    mocks.storeState.presentation = false

    const wrapper = mount(Main)
    await nextTick()

    expect(wrapper.findComponent({ name: 'Outline' }).exists()).toBe(true)
    expect(wrapper.find('.presentation-exit').exists()).toBe(false)
  })
})
