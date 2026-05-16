import * as ioc from '@fe/core/ioc'
import { registerHook } from '@fe/core/hook'
import type { CodeRunner } from '@fe/types'
import { getAllRunners, registerRunner, removeRunner } from '@fe/services/runner'

function makeRunner (name: string, order?: number): CodeRunner {
  return {
    name,
    order,
    match: vi.fn(),
    getTerminalCmd: vi.fn(),
    run: vi.fn(),
  }
}

afterEach(() => {
  ioc.removeAll('CODE_RUNNER')
  ioc.removeAll('CODE_RUNNER_CHANGE')
})

test('registers runners and emits change hook', () => {
  const onChange = vi.fn()
  const runner = makeRunner('node')
  registerHook('CODE_RUNNER_CHANGE', onChange)

  registerRunner(runner)

  expect(ioc.get('CODE_RUNNER')).toStrictEqual([runner])
  expect(onChange).toHaveBeenCalledWith({ type: 'register' })
})

test('returns runners sorted by order without mutating registry order', () => {
  const low = makeRunner('low', 20)
  const defaultOrder = makeRunner('default')
  const high = makeRunner('high', -1)

  registerRunner(low)
  registerRunner(defaultOrder)
  registerRunner(high)

  expect(getAllRunners().map(x => x.name)).toStrictEqual(['high', 'default', 'low'])
  expect(ioc.get('CODE_RUNNER').map(x => x.name)).toStrictEqual(['low', 'default', 'high'])
})

test('removes runners by name and emits change hook', () => {
  const onChange = vi.fn()
  const keep = makeRunner('keep')
  const remove = makeRunner('remove')
  registerRunner(keep)
  registerRunner(remove)
  registerHook('CODE_RUNNER_CHANGE', onChange)

  removeRunner('remove')

  expect(getAllRunners()).toStrictEqual([keep])
  expect(onChange).toHaveBeenCalledWith({ type: 'remove' })
})
