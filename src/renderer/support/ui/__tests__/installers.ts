import { afterEach, describe, expect, it, vi } from 'vitest'

interface MockedApp {
  use: ReturnType<typeof vi.fn>;
  mount: ReturnType<typeof vi.fn>;
  exposed?: Record<string, any>;
  render?: () => any;
}

function callHandler (handler: any, ...args: any[]) {
  if (Array.isArray(handler)) {
    handler.forEach(fn => fn(...args))
  } else {
    handler(...args)
  }
}

function mockCreateApp (mountedInstance: Record<string, any> = {}) {
  const apps: MockedApp[] = []
  const createApp = vi.fn((component: any) => {
    const app: MockedApp = {
      use: vi.fn(() => app),
      mount: vi.fn((el: Element) => {
        if (component?.setup) {
          const exposed: Record<string, any> = {}
          app.render = component.setup({}, {
            expose: (value: Record<string, any>) => {
              Object.assign(exposed, value)
            },
          })
          app.exposed = exposed
          return exposed
        }

        expect(el.parentElement).toBe(document.body)
        return mountedInstance
      }),
    }

    apps.push(app)
    return app
  })

  vi.doMock('vue', async () => ({
    ...await vi.importActual<typeof import('vue')>('vue'),
    createApp,
  }))

  vi.doMock('@fe/directives', () => ({ default: { install: vi.fn() } }))

  return { apps, createApp }
}

async function loadSimpleInstaller (
  modulePath: '../context-menu' | '../modal' | '../toast',
  componentPath: string,
  useName: 'useContextMenu' | 'useModal' | 'useToast',
  propertyName: '$modal' | '$toast',
) {
  const mountedInstance = { show: vi.fn(), hide: vi.fn() }
  const { apps } = mockCreateApp(mountedInstance)
  vi.doMock(componentPath, () => ({ default: { name: componentPath } }))

  const installer = await import(modulePath)
  const hostApp = { config: { globalProperties: {} as Record<string, any> } }

  installer.default(hostApp as any)

  return { installer, hostApp, mountedInstance, mountedApp: apps[0], useName, propertyName }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.resetModules()
  vi.clearAllMocks()
})

describe('support ui installers', () => {
  it('installs context menu, modal and toast singletons', async () => {
    const contextMenu = await loadSimpleInstaller('../context-menu', '@fe/components/ContextMenu.vue', 'useContextMenu', '$modal')
    expect(contextMenu.mountedApp.use).toHaveBeenCalledTimes(1)
    expect(contextMenu.mountedApp.mount).toHaveBeenCalledTimes(1)
    expect(contextMenu.hostApp.config.globalProperties.$modal).toBe(contextMenu.mountedInstance)
    expect(contextMenu.installer.useContextMenu()).toBe(contextMenu.mountedInstance)

    vi.resetModules()
    document.body.innerHTML = ''

    const modal = await loadSimpleInstaller('../modal', '@fe/components/ModalUi.vue', 'useModal', '$modal')
    expect(modal.hostApp.config.globalProperties.$modal).toBe(modal.mountedInstance)
    expect(modal.installer.useModal()).toBe(modal.mountedInstance)

    vi.resetModules()
    document.body.innerHTML = ''

    const toast = await loadSimpleInstaller('../toast', '@fe/components/Toast.vue', 'useToast', '$toast')
    expect(toast.hostApp.config.globalProperties.$toast).toBe(toast.mountedInstance)
    expect(toast.installer.useToast()).toBe(toast.mountedInstance)
  })

  it('shows and hides the quick filter wrapper', async () => {
    const { apps } = mockCreateApp()
    vi.doMock('@fe/components/QuickFilter.vue', () => ({ default: { name: 'QuickFilter' } }))

    const quickFilter = await import('../quick-filter')
    quickFilter.default()

    const instance = quickFilter.useQuickFilter()
    expect(instance).toBe(apps[0].exposed)

    instance.show({ keyword: 'doc', items: [{ id: '1', label: 'Document' }] } as any)
    const vnode = apps[0].render?.()

    expect(vnode.type.name).toBe('QuickFilter')
    expect(vnode.props.keyword).toBe('doc')

    vnode.props.onClose()
    expect(apps[0].render?.()).toBeNull()
  })

  it('handles fixed float close policies and callbacks', async () => {
    const { defineComponent, nextTick } = await vi.importActual<typeof import('vue')>('vue')
    const { apps } = mockCreateApp()
    vi.doMock('@fe/components/FixedFloat.vue', () => ({ default: { name: 'FixedFloat' } }))

    const fixedFloat = await import('../fixed-float')
    fixedFloat.default()

    const instance = fixedFloat.useFixedFloat()
    const onBlur = vi.fn()
    const onEsc = vi.fn()
    const Inline = defineComponent({ name: 'Inline', render: () => null })

    instance.show({ component: Inline, closeOnBlur: false, onBlur, onEsc } as any)
    let vnode = apps[0].render?.()

    expect(vnode.type.name).toBe('FixedFloat')
    vnode.props.onClose('byClickSelf')
    vnode.props.onClose('blur')
    expect(apps[0].render?.()).not.toBeNull()

    const blurHandler = vnode.props.onBlur || vnode.props.onblur
    const escHandler = vnode.props.onEsc || vnode.props.onesc
    callHandler(blurHandler, true)
    callHandler(escHandler)
    expect(onBlur).toHaveBeenCalledWith(true)
    expect(onEsc).toHaveBeenCalled()

    vnode.props.onClose('btn')
    expect(apps[0].render?.()).toBeNull()

    instance.show({ component: Inline } as any)
    vnode = apps[0].render?.()
    vnode.props.onClose('esc')
    expect(apps[0].render?.()).toBeNull()

    instance.show({ component: Inline } as any)
    instance.show({ component: Inline, closeOnEsc: false } as any)
    expect(apps[0].render?.()).toBeNull()

    await nextTick()
    vnode = apps[0].render?.()
    vnode.props.onClose('esc')
    expect(apps[0].render?.()).not.toBeNull()

    instance.hide()
    expect(apps[0].render?.()).toBeNull()
  })
})
