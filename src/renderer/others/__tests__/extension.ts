import * as extension from '@fe/others/extension'
import untar from 'js-untar'

const apiMocks = vi.hoisted(() => ({
  fetchHttp: vi.fn(),
  fetchInstalledExtensions: vi.fn(async () => []),
  enableExtension: vi.fn(async () => undefined),
  disableExtension: vi.fn(async () => undefined),
  uninstallExtension: vi.fn(async () => undefined),
  abortExtensionInstallation: vi.fn(async () => undefined),
  installExtension: vi.fn(async () => undefined),
  proxyFetch: vi.fn(),
}))

const themeMocks = vi.hoisted(() => ({
  addStyleLink: vi.fn(),
  registerThemeStyle: vi.fn(),
}))

const viewMocks = vi.hoisted(() => ({
  addStyleLink: vi.fn(),
}))

const actionMocks = vi.hoisted(() => ({
  handler: vi.fn(),
  getActionHandler: vi.fn(() => actionMocks.handler),
}))

const hookMocks = vi.hoisted(() => ({
  registerHook: vi.fn((_name: string, cb: () => void) => cb),
  triggerHook: vi.fn(),
}))

vi.mock('@fe/support/api', () => apiMocks)
vi.mock('@fe/services/theme', () => themeMocks)
vi.mock('@fe/services/view', () => viewMocks)
vi.mock('js-untar', () => ({
  default: vi.fn(),
}))
vi.mock('pako', () => ({
  default: {
    inflate: vi.fn(() => new Uint8Array([1, 2, 3])),
  },
}))
vi.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
  FLAG_DEBUG: false,
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => new Proxy({}, { get: () => () => undefined }),
  path: {
    join: (...parts: string[]) => parts.join('/').replace(/\/+/g, '/'),
  },
}))

vi.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => 'zh-CN'
}))

vi.mock('@fe/core/action', () => ({
  getActionHandler: actionMocks.getActionHandler,
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: hookMocks.registerHook,
  triggerHook: hookMocks.triggerHook,
}))

;(global as any).__APP_VERSION__ = '3.29.0'

beforeEach(() => {
  vi.clearAllMocks()
})

test('readInfoFromJson', () => {
  expect(extension.readInfoFromJson(undefined)).toBeNull()
  expect(extension.readInfoFromJson({})).toBeNull()
  expect(extension.readInfoFromJson({ name: 'test' })).toBeNull()

  expect(extension.readInfoFromJson({ name: 'test', version: '1.1.2' })).toStrictEqual({
    id: 'test',
    author: { name: '' },
    displayName: 'test',
    main: '',
    style: '',
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    readmeUrl: '',
    changelogUrl: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
    requirements: {},
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    license: 'MIT',
    engines: {
      'yank-note': '>=3.29.0',
    },
  })).toStrictEqual({
    id: 'test',
    author: { name: '' },
    displayName: 'test',
    main: '',
    style: '',
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: 'MIT',
    compatible: {
      reason: 'Compatible',
      value: true,
    },
    readmeUrl: '',
    changelogUrl: '',
    requirements: {},
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    engines: {
      'yank-note': '>=3.30.0',
    },
    requirements: { premium: true, terminal: false }
  })).toStrictEqual({
    id: 'test',
    author: { name: '' },
    displayName: 'test',
    main: '',
    style: '',
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    requirements: { premium: true, terminal: false },
    compatible: {
      reason: 'Need Yank Note [>=3.30.0].',
      value: false,
    },
    readmeUrl: '',
    changelogUrl: '',
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    author: 'test <test@t.t>',
    version: '1.1.2',
    description: 'HELLO!',
    displayName: 'HELLO',
  })).toStrictEqual({
    id: 'test',
    author: { name: 'test', email: 'test@t.t' },
    main: '',
    style: '',
    displayName: 'HELLO',
    description: 'HELLO!',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
    readmeUrl: '',
    changelogUrl: '',
    requirements: {},
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    author: { name: 'hello', email: 'xxx@email.com' },
    description: 'HELLO!',
    displayName: 'HELLO',
    'description_ZH-CN': '你好！',
    'displayName_ZH-CN': '你好',
    main: 'test.js',
    style: 'test.css',
    themes: [
      { name: 'a', css: './a.css' },
      { name: 'b', css: './b.css' },
    ],
    readmeUrl: 'readmeUrl',
    changelogUrl: 'changelogUrl',
    origin: 'official',
  })).toStrictEqual({
    id: 'test',
    author: { name: 'hello', email: 'xxx@email.com' },
    main: 'test.js',
    style: 'test.css',
    displayName: '你好',
    description: '你好！',
    version: '1.1.2',
    themes: [
      { name: 'a', css: './a.css' },
      { name: 'b', css: './b.css' },
    ],
    origin: 'official',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
    readmeUrl: 'readmeUrl',
    changelogUrl: 'changelogUrl',
    requirements: {},
  })
})

test('paths and compatibility helpers normalize extension assets', () => {
  expect(extension.getExtensionPath('@scope/pkg', 'dist', 'main.js')).toBe('@scope$pkg/dist/main.js')
  expect(extension.getInstalledExtensionFileUrl('@scope/pkg', 'dist/main.js')).toBe('/extensions/@scope$pkg/dist/main.js')
  expect(extension.getInstalledExtensionFileUrl('@scope/pkg', 'https://cdn.example/main.js')).toBe('https://cdn.example/main.js')
  expect(extension.getLoadStatus('missing')).toEqual({
    version: undefined,
    themes: false,
    plugin: false,
    style: false,
    activationTime: 0,
  })
  expect(extension.getCompatible({ 'yank-note': '>=3.29.0' })).toEqual({ value: true, reason: 'Compatible' })
  expect(extension.getCompatible({ 'yank-note': '>=9.0.0' })).toEqual({ value: false, reason: 'Need Yank Note [>=9.0.0].' })
})

test('loads installed extension metadata and filters invalid entries', async () => {
  apiMocks.fetchHttp.mockImplementation(async (url: string) => {
    if (url.includes('valid/package.json')) {
      return {
        name: 'valid',
        version: '1.0.0',
        icon: 'icon.png',
        engines: { 'yank-note': '>=3.0.0' },
      }
    }

    if (url.includes('mismatch/package.json')) {
      return { name: 'other', version: '1.0.0' }
    }

    throw new Error('not found')
  })

  await expect(extension.getInstalledExtension('missing')).resolves.toBeNull()
  await expect(extension.getInstalledExtension('valid')).resolves.toMatchObject({
    id: 'valid',
    installed: true,
    origin: 'unknown',
  })

  apiMocks.fetchInstalledExtensions.mockResolvedValue([
    { id: 'valid', enabled: true, isDev: false },
    { id: 'mismatch', enabled: true, isDev: true },
    { id: 'missing', enabled: true, isDev: false },
  ])

  await expect(extension.getInstalledExtensions()).resolves.toEqual([
    expect.objectContaining({
      id: 'valid',
      enabled: true,
      icon: '/extensions/valid/icon.png',
      readmeUrl: '/extensions/valid/README.md',
      changelogUrl: '/extensions/valid/CHANGELOG.md',
      isDev: false,
    }),
  ])
})

test('delegates extension management actions to api and action handlers', async () => {
  const ext = {
    id: 'ext',
    version: '1.0.0',
    enabled: false,
    compatible: { value: true, reason: 'Compatible' },
    dist: { tarball: 'https://registry.npmjs.org/ext/-/ext.tgz', unpackedSize: 1 },
    themes: [],
    style: '',
    main: '',
  } as any

  extension.showManager('ext')
  expect(actionMocks.getActionHandler).toHaveBeenCalledWith('extension.show-manager')
  expect(actionMocks.handler).toHaveBeenCalledWith('ext')

  await extension.disable(ext)
  await extension.uninstall(ext)
  await extension.abortInstallation()
  expect(apiMocks.disableExtension).toHaveBeenCalledWith('ext')
  expect(apiMocks.uninstallExtension).toHaveBeenCalledWith('ext')
  expect(apiMocks.abortExtensionInstallation).toHaveBeenCalled()

  await extension.install(ext, 'registry.npmmirror.com')
  expect(apiMocks.installExtension).toHaveBeenCalledWith('ext', 'https://registry.npmmirror.com/ext/-/ext.tgz')
  expect(apiMocks.enableExtension).toHaveBeenCalledWith('ext')
  expect(hookMocks.triggerHook).toHaveBeenCalledWith('EXTENSION_READY', { extensions: [expect.objectContaining({ id: 'ext', enabled: true })] })
})

test('reads registry extension indexes and version metadata', async () => {
  apiMocks.proxyFetch.mockImplementation(async (url: string) => {
    if (url === 'https://registry.npmmirror.com/yank-note-registry') {
      return {
        json: async () => ({
          'dist-tags': { latest: '1.0.0' },
          versions: {
            '1.0.0': {
              dist: { tarball: 'https://registry.npmjs.org/yank-note-registry/-/registry.tgz' },
            },
          },
        }),
      }
    }

    if (url === 'https://registry.npmmirror.com/yank-note-registry/-/registry.tgz') {
      return { arrayBuffer: async () => new ArrayBuffer(1) }
    }

    if (url === 'https://registry.npmmirror.com/%40scope%2Fext') {
      return {
        json: async () => ({
          versions: {
            '1.0.0': { name: '@scope/ext', version: '1.0.0', engines: { 'yank-note': '>=3.0.0' } },
            '1.2.0': { name: '@scope/ext', version: '1.2.0', engines: { 'yank-note': '>=3.0.0' } },
          },
        }),
      }
    }

    throw new Error(`unexpected url ${url}`)
  })
  ;(untar as any).mockResolvedValue([{
    name: 'package/index.json',
    buffer: new TextEncoder().encode(JSON.stringify([
      { name: 'registry-ext', version: '1.0.0', engines: { 'yank-note': '>=3.0.0' } },
      { name: 'invalid' },
    ])).buffer,
  }])

  await expect(extension.getRegistryExtensions('registry.npmmirror.com')).resolves.toEqual([
    expect.objectContaining({ id: 'registry-ext', version: '1.0.0' }),
    null,
  ])

  await expect(extension.getRegistryExtensionVersions('@scope/ext', 'registry.npmmirror.com')).resolves.toEqual([
    expect.objectContaining({ id: '@scope/ext', version: '1.2.0', installed: false }),
    expect.objectContaining({ id: '@scope/ext', version: '1.0.0', installed: false }),
  ])
})

test('enable loads styles and theme declarations once', async () => {
  const ext = {
    id: '@scope/theme-ext',
    version: '2.0.0',
    enabled: false,
    compatible: { value: true, reason: 'Compatible' },
    dist: { tarball: '', unpackedSize: 0 },
    main: '',
    style: 'style.css',
    themes: [{ name: 'Dark', css: 'dark.css' }],
  } as any

  await extension.enable(ext)
  await extension.enable(ext)

  expect(themeMocks.addStyleLink).toHaveBeenCalledTimes(1)
  expect(themeMocks.addStyleLink).toHaveBeenCalledWith('/extensions/@scope$theme-ext/style.css')
  expect(viewMocks.addStyleLink).toHaveBeenCalledTimes(1)
  expect(themeMocks.registerThemeStyle).toHaveBeenCalledTimes(1)
  expect(themeMocks.registerThemeStyle).toHaveBeenCalledWith({
    from: 'extension',
    name: '[@scope/theme-ext]: Dark',
    css: 'extension:@scope$theme-ext/dark.css',
  })
})

test('loads extension scripts as classic or module scripts and records failures', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const appended: HTMLScriptElement[] = []
  vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
    appended.push(node as HTMLScriptElement)
    return node
  })

  const classic = {
    id: 'script-ext',
    version: '1.0.0',
    enabled: false,
    compatible: { value: true, reason: 'Compatible' },
    dist: { tarball: '', unpackedSize: 0 },
    main: 'main.js',
    style: '',
    themes: [],
  } as any

  const classicPromise = extension.enable(classic)
  await Promise.resolve()
  const classicScript = appended.at(-1)!
  expect(classicScript.defer).toBe(true)
  expect(classicScript.src).toContain('/extensions/script-ext/main.js')
  classicScript.onload?.(new Event('load'))
  await classicPromise

  expect(extension.getLoadStatus('script-ext')).toMatchObject({
    version: '1.0.0',
    plugin: true,
  })

  const moduleExt = {
    ...classic,
    id: 'module-ext',
    main: 'main.mjs',
  }
  const modulePromise = extension.enable(moduleExt)
  await Promise.resolve()
  const moduleScript = appended.at(-1)!
  expect(moduleScript.type).toBe('module')
  expect(moduleScript.src).toContain('/extensions/module-ext/main.mjs')
  moduleScript.onerror?.(new Event('error'))
  await modulePromise

  expect(console.warn).toHaveBeenCalledWith('Load extension error [module-ext]', expect.any(Event))
  expect(extension.getLoadStatus('module-ext')).toMatchObject({ plugin: true })
  ;(document.body.appendChild as any).mockRestore()
})

test('initialization loads compatible enabled installed extensions and resolves waiters', async () => {
  expect(extension.getInitialized()).toBe(false)
  const waiter = extension.whenInitialized()
  const readyCallback = hookMocks.registerHook.mock.calls.at(-1)?.[1]
  readyCallback?.()
  await expect(waiter).resolves.toBeUndefined()

  apiMocks.fetchInstalledExtensions.mockResolvedValue([
    { id: 'init-ext', enabled: true, isDev: false },
    { id: 'disabled-ext', enabled: false, isDev: false },
  ])
  apiMocks.fetchHttp.mockImplementation(async (url: string) => ({
    name: url.includes('disabled-ext') ? 'disabled-ext' : 'init-ext',
    version: '1.0.0',
    engines: { 'yank-note': '>=3.0.0' },
  }))

  await extension.init()

  expect(extension.getInitialized()).toBe(true)
  expect(hookMocks.triggerHook).toHaveBeenCalledWith('EXTENSION_READY', {
    extensions: [expect.objectContaining({ id: 'init-ext', enabled: true })],
  })
})
