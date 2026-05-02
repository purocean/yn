const mocks = vi.hoisted(() => ({
  state: {
    showSide: true,
    showView: true,
    showEditor: true,
    editorPreviewExclusive: false,
    showXterm: false,
    showContentRightSide: false,
  },
  triggerHook: vi.fn(),
  renderView: vi.fn(),
  focusEditor: vi.fn(),
  xtermInit: vi.fn(),
  actions: [] as any[],
}))

vi.mock('lodash-es', async importOriginal => ({
  ...await importOriginal<typeof import('lodash-es')>(),
  throttle: (fn: any) => fn,
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: vi.fn((action: any) => {
    mocks.actions.push(action)
    return action
  }),
  getActionHandler: vi.fn((name: string) => {
    if (name !== 'xterm.init') {
      throw new Error(`Unexpected action: ${name}`)
    }

    return mocks.xtermInit
  }),
}))

vi.mock('@fe/core/keybinding', () => ({
  Alt: 'Alt',
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: mocks.state,
  },
}))

vi.mock('@fe/services/view', () => ({
  render: mocks.renderView,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

vi.mock('@fe/services/editor', () => ({
  getEditor: () => ({
    focus: mocks.focusEditor,
  }),
}))

import { nextTick } from 'vue'
import {
  getContainerDom,
  setContainerDom,
  toggleContentRightSide,
  toggleEditor,
  toggleEditorPreviewExclusive,
  toggleSide,
  toggleView,
  toggleXterm,
} from '@fe/services/layout'

beforeEach(() => {
  Object.assign(mocks.state, {
    showSide: true,
    showView: true,
    showEditor: true,
    editorPreviewExclusive: false,
    showXterm: false,
    showContentRightSide: false,
  })
  mocks.triggerHook.mockClear()
  mocks.renderView.mockClear()
  mocks.focusEditor.mockClear()
  mocks.xtermInit.mockClear()
})

test('registers layout actions on import', () => {
  expect(mocks.actions.map(x => x.name)).toStrictEqual([
    'layout.toggle-side',
    'layout.toggle-editor',
    'layout.toggle-view',
    'layout.toggle-xterm',
  ])
})

test('sets, gets, and removes container dom references', () => {
  const dom = document.createElement('main')

  setContainerDom('content', dom)
  expect(getContainerDom('content')).toBe(dom)

  setContainerDom('content', null)
  expect(getContainerDom('content')).toBeNull()
})

test('toggles side and content right side visibility', async () => {
  toggleSide()
  toggleContentRightSide(true)
  await nextTick()

  expect(mocks.state.showSide).toBe(false)
  expect(mocks.state.showContentRightSide).toBe(true)
  expect(mocks.triggerHook).toHaveBeenCalledWith('GLOBAL_RESIZE')
})

test('toggles preview and renders view when made visible', async () => {
  mocks.state.showView = false

  toggleView()
  await nextTick()

  expect(mocks.state.showView).toBe(true)
  expect(mocks.state.showEditor).toBe(true)
  expect(mocks.renderView).toHaveBeenCalledTimes(1)
})

test('preview hides editor when exclusive mode is active', () => {
  mocks.state.editorPreviewExclusive = true
  mocks.state.showEditor = true

  toggleView(true)

  expect(mocks.state.showView).toBe(true)
  expect(mocks.state.showEditor).toBe(false)
})

test('toggles editor, keeps preview visible when not exclusive, and focuses editor', async () => {
  mocks.state.showEditor = false
  mocks.state.showView = false

  toggleEditor(true)
  await Promise.resolve()

  expect(mocks.state.showEditor).toBe(true)
  expect(mocks.state.showView).toBe(true)
  expect(mocks.focusEditor).toHaveBeenCalledTimes(1)
})

test('editor hides preview when exclusive mode is active', () => {
  mocks.state.editorPreviewExclusive = true
  mocks.state.showView = true

  toggleEditor(true)

  expect(mocks.state.showEditor).toBe(true)
  expect(mocks.state.showView).toBe(false)
})

test('exclusive mode hides preview when both panes are visible', () => {
  toggleEditorPreviewExclusive(true)

  expect(mocks.state.editorPreviewExclusive).toBe(true)
  expect(mocks.state.showView).toBe(false)
})

test('toggling terminal initializes xterm only when it was previously hidden', async () => {
  toggleXterm(true)
  await nextTick()
  await nextTick()

  expect(mocks.state.showXterm).toBe(true)
  expect(mocks.xtermInit).toHaveBeenCalledTimes(1)

  toggleXterm(false)
  await nextTick()
  await nextTick()

  expect(mocks.state.showXterm).toBe(false)
  expect(mocks.xtermInit).toHaveBeenCalledTimes(1)
})
