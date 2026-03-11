import { registerAction, getAction } from '../action'

describe('action module', () => {
  beforeEach(() => {
    // Clear actions between tests by re-requiring the module
    jest.resetModules()
  })

  describe('registerAction', () => {
    test('should register an action with a name and handler', () => {
      const handler = jest.fn()
      registerAction('test-action', handler)

      const retrievedAction = getAction('test-action')
      expect(retrievedAction).toBe(handler)
    })

    test('should allow multiple actions to be registered', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      registerAction('action-1', handler1)
      registerAction('action-2', handler2)

      expect(getAction('action-1')).toBe(handler1)
      expect(getAction('action-2')).toBe(handler2)
    })

    test('should override existing action with same name', () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()

      registerAction('test-action', handler1)
      registerAction('test-action', handler2)

      expect(getAction('test-action')).toBe(handler2)
      expect(getAction('test-action')).not.toBe(handler1)
    })
  })

  describe('getAction', () => {
    test('should return registered action handler', () => {
      const handler = () => 'test'
      registerAction('my-action', handler)

      expect(getAction('my-action')).toBe(handler)
    })

    test('should return undefined for non-existent action', () => {
      expect(getAction('non-existent')).toBeUndefined()
    })

    test('should return the exact function that was registered', () => {
      const handler = jest.fn().mockReturnValue('result')
      registerAction('test-action', handler)

      const action = getAction('test-action')
      expect(action()).toBe('result')
      expect(handler).toHaveBeenCalled()
    })
  })
})
