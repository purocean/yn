import * as ioc from '@fe/core/ioc'
import { triggerHook } from '@fe/core/hook'
import type { RenderEnv, Renderer } from '@fe/types'
import { getRenderCache, registerRenderer, removeRenderer, render } from '@fe/services/renderer'

function makeEnv (overrides: Partial<RenderEnv> = {}): RenderEnv {
  return {
    source: 'source.md',
    file: null,
    renderCount: 1,
    tokens: [],
    ...overrides,
  }
}

function makeRenderer (name: string, order: number, when = vi.fn(() => false)): Renderer {
  return {
    name,
    order,
    when,
    render: vi.fn((src: string) => `${name}:${src}`),
  }
}

afterEach(async () => {
  ioc.removeAll('RENDERERS')
  await triggerHook('VIEW_BEFORE_REFRESH')
})

test('requires a cache domain', () => {
  expect(() => getRenderCache('')).toThrow('Domain is required')
})

test('stores domain cache values and builds fallback once for truthy values', () => {
  const fallback = vi.fn(() => ({ rendered: true }))

  const value = getRenderCache('markdown', 'ast', fallback)
  const sameValue = getRenderCache('markdown', 'ast', fallback)

  expect(value).toStrictEqual({ rendered: true })
  expect(sameValue).toBe(value)
  expect(fallback).toHaveBeenCalledTimes(1)
  expect(getRenderCache('markdown').get('ast')).toBe(value)
})

test('clears render cache on view refresh hook', async () => {
  getRenderCache('markdown', 'html', '<p>x</p>')

  await triggerHook('VIEW_BEFORE_REFRESH')

  expect(getRenderCache('markdown').size).toBe(0)
})

test('registers renderers sorted by order and removes by name', () => {
  const late = makeRenderer('late', 10)
  const early = makeRenderer('early', -1)

  registerRenderer(late)
  registerRenderer(early)

  expect(ioc.get('RENDERERS').map(x => x.name)).toStrictEqual(['early', 'late'])

  removeRenderer('early')

  expect(ioc.get('RENDERERS')).toStrictEqual([late])
})

test('renders with first matching renderer', () => {
  const first = makeRenderer('first', 1, vi.fn(() => false))
  const second = makeRenderer('second', 2, vi.fn(() => true))
  registerRenderer(first)
  registerRenderer(second)

  const env = makeEnv()

  expect(render('hello', env)).toBe('second:hello')
  expect(first.when).toHaveBeenCalledWith(env)
  expect(second.render).toHaveBeenCalledWith('hello', env)
})

test('keeps cache for the same file and clears it when file changes', () => {
  const renderer = makeRenderer('markdown', 1, vi.fn(() => true))
  registerRenderer(renderer)

  const firstFileEnv = makeEnv({ file: { repo: 'notes', path: 'a.md' } as RenderEnv['file'] })
  const secondFileEnv = makeEnv({ file: { repo: 'notes', path: 'b.md' } as RenderEnv['file'] })

  render('one', firstFileEnv)
  getRenderCache('expensive', 'value', 'cached')
  render('two', firstFileEnv)

  expect(getRenderCache('expensive').get('value')).toBe('cached')

  render('three', secondFileEnv)

  expect(getRenderCache('expensive').has('value')).toBe(false)
})

test('throws when no renderer matches', () => {
  registerRenderer(makeRenderer('never', 1, vi.fn(() => false)))

  expect(() => render('hello', makeEnv())).toThrow('No renderer found')
})
