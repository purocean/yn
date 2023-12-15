import * as plugin from '@fe/core/plugin'

jest.mock('@fe/utils', () => ({
  getLogger: () => new Proxy({}, { get: () => () => 0 })
}))

test('plugin usage', () => {
  const fn = jest.fn()
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
