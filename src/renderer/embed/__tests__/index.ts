import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
})

describe('embed entry', () => {
  it('exposes api and args on window.embedCtx', async () => {
    const api = { open: vi.fn() }
    const args = { FLAG_DEMO: false }
    vi.doMock('@fe/support/api', () => api)
    vi.doMock('@fe/support/args', () => args)

    delete (window as any).embedCtx
    await import('../index')

    expect((window as any).embedCtx).toEqual({ api, args })
  })
})
