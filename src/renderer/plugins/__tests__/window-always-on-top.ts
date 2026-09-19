import { nextTick } from 'vue'

const mocks = vi.hoisted(() => ({
  alwaysOnTop: undefined as any,
  toggle: vi.fn(),
}))

vi.mock('@fe/support/window-state', async () => {
  const { ref } = await import('vue')
  mocks.alwaysOnTop = ref(false)
  return {
    isWindowAlwaysOnTop: mocks.alwaysOnTop,
    toggleWindowAlwaysOnTop: mocks.toggle,
  }
})

import plugin from '../window-always-on-top'

test('registers the window pin as an Electron file-tabs action', async () => {
  const tapActionBtns = vi.fn()
  const refreshActionBtns = vi.fn()
  const ctx = {
    env: { isElectron: false },
    i18n: { t: (key: string) => key },
    workbench: { FileTabs: { tapActionBtns, refreshActionBtns } },
  } as any

  plugin.register?.(ctx)
  expect(tapActionBtns).not.toHaveBeenCalled()

  ctx.env.isElectron = true
  plugin.register?.(ctx)
  expect(tapActionBtns).toHaveBeenCalledTimes(1)

  const btns: any[] = []
  tapActionBtns.mock.calls[0][0](btns)
  expect(btns).toEqual([expect.objectContaining({
    key: 'window-always-on-top',
    icon: 'thumbtack-solid',
    iconWidth: '9px',
    checked: false,
  })])

  btns[0].onClick()
  expect(mocks.toggle).toHaveBeenCalledTimes(1)

  mocks.alwaysOnTop.value = true
  await nextTick()
  expect(refreshActionBtns).toHaveBeenCalledTimes(1)

  const refreshedBtns: any[] = []
  tapActionBtns.mock.calls[0][0](refreshedBtns)
  expect(refreshedBtns[0].checked).toBe(true)
})
