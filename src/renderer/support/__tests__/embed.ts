import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  hooks: new Map<string, Function>(),
  emitResize: vi.fn(),
}))

vi.mock('@fe/utils', () => ({
  md5: (value: string) => `md5-${value.length}`,
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: vi.fn((name: string, handler: Function) => {
    mocks.hooks.set(name, handler)
  }),
  removeHook: vi.fn((name: string, handler: Function) => {
    if (mocks.hooks.get(name) === handler) {
      mocks.hooks.delete(name)
    }
  }),
}))

vi.mock('@fe/services/layout', () => ({
  emitResize: mocks.emitResize,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DEBUG: true,
}))

import { IFrame, buildSrc } from '@fe/support/embed'

beforeEach(() => {
  mocks.hooks.clear()
  mocks.emitResize.mockClear()
  ;(window as any).ctx = { app: 'ctx' }
})

test('buildSrc encodes html, title, debug flags, and generated id', () => {
  const src = buildSrc('<h1>Hello</h1>', 'Title', true)
  const [path, hash] = src.split('#')
  const params = new URLSearchParams(hash)

  expect(path).toBe('/embed/?_id=md5-14')
  expect(params.get('title')).toBe('Title')
  expect(params.get('html')).toBe('<h1>Hello</h1>')
  expect(params.get('globalStyle')).toBe('true')
  expect(params.get('with-global-style')).toBe('true')
  expect(params.get('trigger-parent-keyboard-event')).toBe('false')
  expect(params.get('debug')).toBe('true')
})

test('buildSrc supports explicit id and object options', () => {
  const src = buildSrc('<p>x</p>', undefined, {
    id: 'fixed',
    globalStyle: false,
    triggerParentKeyBoardEvent: true,
  })
  const [path, hash] = src.split('#')
  const params = new URLSearchParams(hash)

  expect(path).toBe('/embed/?_id=fixed')
  expect(params.get('title')).toBe('')
  expect(params.get('globalStyle')).toBe('false')
  expect(params.get('with-global-style')).toBe('false')
  expect(params.get('trigger-parent-keyboard-event')).toBe('true')
})

test('IFrame renders built src, wires load callback, resize helper, and theme hook', async () => {
  const onLoad = vi.fn()
  const wrapper = mount(IFrame, {
    props: {
      html: '<main>Body</main>',
      globalStyle: true,
      triggerParentKeyBoardEvent: true,
      debounce: 0,
      iframeProps: { class: 'embed-frame', title: 'embed' },
      onLoad,
    },
  })
  const iframe = wrapper.find('iframe').element as HTMLIFrameElement
  const setAttribute = vi.fn()
  const reload = vi.fn()
  const close = vi.fn()
  const onbeforeunload = vi.fn(() => undefined)

  Object.defineProperty(iframe, 'contentDocument', {
    value: { documentElement: { scrollHeight: 42, setAttribute } },
    configurable: true,
  })
  Object.defineProperty(iframe, 'contentWindow', {
    value: { location: { reload }, close, onbeforeunload },
    configurable: true,
  })

  await wrapper.find('iframe').trigger('load')

  expect(iframe.getAttribute('src')).toContain('/embed/?_id=md5-17#')
  expect(iframe.className).toBe('embed-frame')
  expect(onLoad).toHaveBeenCalledWith(iframe)
  expect((iframe.contentWindow as any).ctx).toStrictEqual({ app: 'ctx' })

  ;(iframe.contentWindow as any).resize()
  expect(iframe.height).toBe('43px')
  expect(mocks.emitResize).toHaveBeenCalledTimes(1)

  mocks.hooks.get('THEME_CHANGE')?.({ name: 'light' })
  expect(setAttribute).toHaveBeenCalledWith('app-theme', 'light')

  ;(wrapper.vm as any).reload()
  expect(reload).toHaveBeenCalledTimes(1)
  ;(wrapper.vm as any).close()
  expect(onbeforeunload).toHaveBeenCalledTimes(1)
  expect(close).toHaveBeenCalledTimes(1)

  wrapper.unmount()
  expect(mocks.hooks.has('THEME_CHANGE')).toBe(false)
})

test('IFrame close throws when embedded page blocks unload', () => {
  const wrapper = mount(IFrame, { props: { html: '<p>body</p>' } })
  const iframe = wrapper.find('iframe').element as HTMLIFrameElement

  Object.defineProperty(iframe, 'contentWindow', {
    value: { onbeforeunload: vi.fn(() => 'blocked'), close: vi.fn() },
    configurable: true,
  })

  expect(() => (wrapper.vm as any).close()).toThrow('Check close failed.')
})
