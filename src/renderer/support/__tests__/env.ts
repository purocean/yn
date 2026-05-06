async function importEnvWithUserAgent (userAgent: string) {
  vi.resetModules()
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  })

  return await import('@fe/support/env')
}

const originalWindowProcessDescriptor = Object.getOwnPropertyDescriptor(window, 'process')
const originalWindowNodeProcessDescriptor = Object.getOwnPropertyDescriptor(window, 'nodeProcess')
const originalWindowModuleDescriptor = Object.getOwnPropertyDescriptor(window, 'module')
const originalWindowNodeModuleDescriptor = Object.getOwnPropertyDescriptor(window, 'nodeModule')
const originalWindowRequireDescriptor = Object.getOwnPropertyDescriptor(window, 'require')
const originalWindowNodeRequireDescriptor = Object.getOwnPropertyDescriptor(window, 'nodeRequire')

function restoreWindowProperty (key: string, descriptor?: PropertyDescriptor) {
  if (descriptor) {
    Object.defineProperty(window, key, descriptor)
  } else {
    delete (window as any)[key]
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(window, 'nodeProcess', { value: undefined, configurable: true })
  Object.defineProperty(window, 'module', { value: undefined, configurable: true })
  Object.defineProperty(window, 'nodeModule', { value: undefined, configurable: true })
  Object.defineProperty(window, 'require', { value: undefined, configurable: true })
  Object.defineProperty(window, 'nodeRequire', { value: undefined, configurable: true })
})

afterEach(() => {
  restoreWindowProperty('process', originalWindowProcessDescriptor)
  restoreWindowProperty('nodeProcess', originalWindowNodeProcessDescriptor)
  restoreWindowProperty('module', originalWindowModuleDescriptor)
  restoreWindowProperty('nodeModule', originalWindowNodeModuleDescriptor)
  restoreWindowProperty('require', originalWindowRequireDescriptor)
  restoreWindowProperty('nodeRequire', originalWindowNodeRequireDescriptor)
})

test('detects operating systems from user agent at import time', async () => {
  let env = await importEnvWithUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
  expect(env.isMacOS).toBe(true)
  expect(env.isWindows).toBe(false)
  expect(env.isOtherOS).toBe(false)

  env = await importEnvWithUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  expect(env.isMacOS).toBe(false)
  expect(env.isWindows).toBe(true)
  expect(env.isOtherOS).toBe(false)

  env = await importEnvWithUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
  expect(env.isMacOS).toBe(false)
  expect(env.isWindows).toBe(false)
  expect(env.isOtherOS).toBe(true)
})

test('opens regular browser windows outside electron', async () => {
  const env = await importEnvWithUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
  const open = vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window)

  expect(env.isElectron).toBe(false)
  expect(env.openWindow('https://example.com', 'docs', { width: 500 })).toStrictEqual({ closed: false })
  expect(open).toHaveBeenCalledWith('https://example.com', 'docs')
  expect(() => env.getElectronRemote()).toThrow('not in electron')
})

test('detects electron globals, requires remote, and passes window options', async () => {
  const remote = {
    getCurrentWindow: vi.fn(() => ({
      getPosition: vi.fn(() => [10, 20]),
    })),
  }
  const fakeProcess = { versions: { electron: '30.0.0' } }
  vi.resetModules()
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    configurable: true,
  })
  Object.defineProperty(window, 'process', { value: fakeProcess, configurable: true })
  Object.defineProperty(window, 'nodeRequire', { value: vi.fn((name: string) => {
    if (name !== '@electron/remote') {
      throw new Error(name)
    }

    return remote
  }), configurable: true })

  const env = await import('@fe/support/env')
  restoreWindowProperty('process', originalWindowProcessDescriptor)
  const open = vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window)

  expect(env.isElectron).toBe(true)
  expect(env.nodeProcess).toBe(fakeProcess)
  expect(env.getElectronRemote()).toBe(remote)

  env.openWindow('app://settings', 'settings', { width: 400, height: undefined })

  expect(open).toHaveBeenCalledTimes(1)
  expect(open.mock.calls[0][0]).toBe('app://settings')
  expect(open.mock.calls[0][1]).toBe('settings')
  expect(open.mock.calls[0][2]).toContain('x=43')
  expect(open.mock.calls[0][2]).toContain('y=53')
  expect(open.mock.calls[0][2]).toContain('width=400')
  expect(open.mock.calls[0][2]).not.toContain('height=')
})
