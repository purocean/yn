const mocks = vi.hoisted(() => ({
  uploaded: undefined as any,
  rpc: vi.fn(),
  upload: vi.fn(async () => ({ data: { path: '/docs/FILES/note/image.png' } })),
  fileToBase64URL: vi.fn(async () => 'data:image/png;base64,abc'),
  modalInput: vi.fn(),
  toastShow: vi.fn(),
  actionHandler: vi.fn(),
  triggerHook: vi.fn(),
  settings: new Map<string, any>(),
  isElectron: true,
  isWindows: false,
}))

vi.mock('@fe/support/api', () => ({
  rpc: mocks.rpc,
  upload: mocks.upload,
}))

vi.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
  HELP_REPO_NAME: '__help__',
}))

vi.mock('@fe/utils', () => ({
  binMd5: () => '1234567890abcdef',
  quote: (value: string) => JSON.stringify(value),
  fileToBase64URL: mocks.fileToBase64URL,
  getLogger: () => ({ debug: vi.fn() }),
}))

vi.mock('@fe/context/lib', () => ({
  dayjs: () => ({ format: () => '2026-05-02' }),
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: () => ({ input: mocks.modalInput }),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/support/env', () => ({
  get isElectron () {
    return mocks.isElectron
  },
  get isWindows () {
    return mocks.isWindows
  },
}))

vi.mock('@fe/core/action', () => ({
  getActionHandler: vi.fn(() => mocks.actionHandler),
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: (key: string, fallback?: any) => mocks.settings.has(key) ? mocks.settings.get(key) : fallback,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => `translated:${key}`,
}))

import {
  findInRepository,
  getAttachmentURL,
  inputPassword,
  openExternal,
  openPath,
  readFromClipboard,
  reloadMainWindow,
  showItemInFolder,
  trashItem,
  triggerDeepLinkOpen,
  upload,
  writeToClipboard,
} from '@fe/services/base'

beforeEach(() => {
  mocks.rpc.mockClear()
  mocks.upload.mockClear()
  mocks.fileToBase64URL.mockClear()
  mocks.modalInput.mockReset()
  mocks.toastShow.mockClear()
  mocks.actionHandler.mockClear()
  mocks.triggerHook.mockReset()
  mocks.settings.clear()
  mocks.isElectron = true
  mocks.isWindows = false
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://yn.local', reload: vi.fn() },
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('getAttachmentURL builds normal, absolute, and help urls and rejects non-files', () => {
  expect(getAttachmentURL({ type: 'file', repo: 'notes', path: '/dir/a b.md', name: 'a b.md' } as any)).toBe('/api/attachment/notes/dir/a%20b.md')
  expect(getAttachmentURL({ type: 'file', repo: 'notes', path: 'a.md', name: 'a.md' } as any, { origin: true })).toBe('https://yn.local/api/attachment/notes/a.md')
  expect(getAttachmentURL({ type: 'file', repo: '__help__', path: '/intro.md', name: 'intro.md' } as any)).toBe('/api/help/file?path=%2Fintro.md')
  expect(() => getAttachmentURL({ type: 'dir', repo: 'notes', path: '/dir', name: 'dir' } as any)).toThrow('Document type must be file')
})

test('upload converts file content and returns relative asset paths when configured automatically', async () => {
  mocks.settings.set('assets.path-type', 'auto')
  mocks.settings.set('assets-dir', './FILES/{docBasename}')
  const file = new File(['image'], 'photo.png', { type: 'image/png' })

  await expect(upload(file, { repo: 'notes', path: '/docs/note.md' })).resolves.toBe('./FILES/note/image.png')

  expect(mocks.fileToBase64URL).toHaveBeenCalledWith(file)
  expect(mocks.upload).toHaveBeenCalledWith('notes', 'data:image/png;base64,abc', '/docs/FILES/note/12345678.png', 'rename')
})

test('inputPassword returns input and warns or throws on empty input', async () => {
  mocks.modalInput.mockResolvedValueOnce('secret')
  await expect(inputPassword('Title', 'Hint')).resolves.toBe('secret')
  expect(mocks.modalInput).toHaveBeenCalledWith({ title: 'Title', type: 'password', hint: 'Hint' })

  mocks.modalInput.mockResolvedValueOnce('')
  await expect(inputPassword('Title', 'Hint')).resolves.toBe('')
  expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'translated:no-password')

  mocks.modalInput.mockResolvedValueOnce(undefined)
  await expect(inputPassword('Title', 'Hint', true)).rejects.toThrow('translated:no-password')
})

test('electron shell helpers quote paths and normalize windows paths', async () => {
  await openExternal('https://example.com/a b')
  expect(mocks.rpc).toHaveBeenLastCalledWith('require(\'electron\').shell.openExternal("https://example.com/a b")')

  mocks.isWindows = true
  await openPath('/tmp/a/b.md')
  await showItemInFolder('/tmp/a/b.md')
  await trashItem('/tmp/a/b.md')

  expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'require(\'electron\').shell.openPath("\\\\tmp\\\\a\\\\b.md")')
  expect(mocks.rpc).toHaveBeenNthCalledWith(3, 'require(\'electron\').shell.showItemInFolder("\\\\tmp\\\\a\\\\b.md")')
  expect(mocks.rpc).toHaveBeenNthCalledWith(4, 'require(\'electron\').shell.trashItem("\\\\tmp\\\\a\\\\b.md")')
})

test('reloadMainWindow uses rpc in electron and location.reload in browser', async () => {
  await reloadMainWindow()
  expect(mocks.rpc).toHaveBeenCalledWith("require('./action').getAction('reload-main-window')()")

  mocks.isElectron = false
  await reloadMainWindow()
  expect(window.location.reload).toHaveBeenCalledTimes(1)
})

test('clipboard read supports object result, callback mode, and denied permission', async () => {
  const png = new Blob(['png'], { type: 'image/png' })
  const text = new Blob(['text'], { type: 'text/plain' })
  const getType = vi.fn(async (type: string) => type === 'image/png' ? png : text)
  Object.defineProperty(navigator, 'permissions', {
    value: { query: vi.fn(async () => ({ state: 'granted' })) },
    configurable: true,
  })
  Object.defineProperty(navigator, 'clipboard', {
    value: { read: vi.fn(async () => [{ types: ['image/png', 'text/plain'], getType }]) },
    configurable: true,
  })

  await expect(readFromClipboard()).resolves.toStrictEqual({
    'image/png': png,
    'text/plain': text,
  })

  const callback = vi.fn()
  await readFromClipboard(callback)
  expect(callback).toHaveBeenCalledWith('image/png', expect.any(Function))
  expect(callback).toHaveBeenCalledWith('text/plain', expect.any(Function))

  Object.defineProperty(navigator, 'permissions', {
    value: { query: vi.fn(async () => ({ state: 'denied' })) },
    configurable: true,
  })
  await expect(readFromClipboard()).resolves.toBeUndefined()
  expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'translated:need-clipboard-permission')
})

test('writeToClipboard writes a typed Blob when permission is granted', async () => {
  const write = vi.fn()
  const clipboardItems: any[] = []
  Object.defineProperty(navigator, 'permissions', {
    value: { query: vi.fn(async () => ({ state: 'granted' })) },
    configurable: true,
  })
  Object.defineProperty(navigator, 'clipboard', {
    value: { write },
    configurable: true,
  })
  ;(window as any).ClipboardItem = class {
    constructor (item: any) {
      clipboardItems.push(item)
    }
  }

  await writeToClipboard('text/plain', 'hello')

  expect(write).toHaveBeenCalledWith([expect.any((window as any).ClipboardItem)])
  expect(clipboardItems[0]['text/plain']).toBeInstanceOf(Blob)
})

test('find and deep link helpers delegate to action and hook layers', () => {
  mocks.triggerHook.mockReturnValueOnce('handled')

  findInRepository({ pattern: 'todo' } as any)
  expect(mocks.actionHandler).toHaveBeenCalledWith({ pattern: 'todo' })
  expect(triggerDeepLinkOpen('yank-note://open')).toBe('handled')
  expect(mocks.triggerHook).toHaveBeenCalledWith('DEEP_LINK_OPEN', { url: 'yank-note://open' }, { breakable: true })
})
