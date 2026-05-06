import * as plugin from '@fe/core/plugin'

vi.mock('@fe/utils', () => ({
  getLogger: () => new Proxy({}, { get: () => () => 0 })
}))

// Mock window.document for init tests
const mockScript = { src: '' }
const mockBody = { appendChild: vi.fn() }
global.window = {
  document: {
    createElement: vi.fn(() => mockScript),
    body: mockBody,
  },
  registerPlugin: undefined,
} as any

beforeEach(() => {
  vi.clearAllMocks()
  mockScript.src = ''
  global.window.registerPlugin = undefined
})

test('plugin usage', () => {
  const fn = vi.fn()
  plugin.register({
    name: 'test',
    register: fn,
  }, 123)

  expect(fn).toHaveBeenCalledWith(123)

  plugin.register({
    name: 'test',
    register: fn,
  }, 123)

  expect(fn).toHaveBeenCalledTimes(1)

  plugin.register({
    name: 'test2',
    register: () => '12345',
  }, 123)

  expect(plugin.getApi('test2')).toBe('12345')
})

test('plugin getApi should return undefined for non-existent plugin', () => {
  expect(plugin.getApi('non-existent')).toBeUndefined()
})

test('plugin register without register function', () => {
  plugin.register({
    name: 'no-register-fn',
  }, 123)

  expect(plugin.getApi('no-register-fn')).toBeUndefined()
})

test('plugin init should register multiple plugins', () => {
  const fn1 = vi.fn(() => 'api1')
  const fn2 = vi.fn(() => 'api2')

  plugin.init([
    { name: 'plugin1', register: fn1 },
    { name: 'plugin2', register: fn2 },
  ], 'context')

  expect(fn1).toHaveBeenCalledWith('context')
  expect(fn2).toHaveBeenCalledWith('context')
  expect(plugin.getApi('plugin1')).toBe('api1')
  expect(plugin.getApi('plugin2')).toBe('api2')
})

test('plugin init should set up window.registerPlugin', () => {
  plugin.init([], 'context')

  expect(global.window.registerPlugin).toBeDefined()
  expect(typeof global.window.registerPlugin).toBe('function')
})

test('plugin init should create and append script tag', () => {
  plugin.init([], 'context')

  expect(global.window.document.createElement).toHaveBeenCalledWith('script')
  expect(mockScript.src).toBe('/api/plugins')
  expect(mockBody.appendChild).toHaveBeenCalledWith(mockScript)
})

test('window.registerPlugin should work after init', () => {
  const fn = vi.fn(() => 'dynamic-api')

  plugin.init([], 'context')

  global.window.registerPlugin!({
    name: 'dynamic-plugin',
    register: fn,
  })

  expect(fn).toHaveBeenCalledWith('context')
  expect(plugin.getApi('dynamic-plugin')).toBe('dynamic-api')
})
