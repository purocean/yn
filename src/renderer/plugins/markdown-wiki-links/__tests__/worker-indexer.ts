import { afterEach, describe, expect, test, vi } from 'vitest'

function makeWorkerCtx (enabled: boolean) {
  const hooks = new Map<string, Function>()
  const md = {
    inline: {
      ruler: {
        after: vi.fn(),
      },
    },
  }
  const ctx = {
    bridgeClient: {
      call: {
        ctx: {
          setting: {
            getSetting: vi.fn(async () => enabled),
          },
        },
      },
    },
    markdown: {
      disable: vi.fn(),
      enable: vi.fn(),
      use: vi.fn((plugin: Function) => plugin(md)),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
  }
  return { ctx, hooks, md }
}

describe('markdown-wiki-links worker indexer', () => {
  afterEach(() => {
    vi.resetModules()
  })

  test('registers wiki-link rule and enables it when setting is true', async () => {
    const { ctx, hooks, md } = makeWorkerCtx(true)
    ;(globalThis.self as any).ctx = ctx

    await import('../worker-indexer')

    expect(md.inline.ruler.after).toHaveBeenCalledWith('link', 'wiki-links', expect.any(Function))
    await hooks.get('WORKER_INDEXER_BEFORE_START_WATCH')!()
    expect(ctx.bridgeClient.call.ctx.setting.getSetting).toHaveBeenCalledWith('render.md-wiki-links', true)
    expect(ctx.markdown.enable).toHaveBeenCalledWith(['wiki-links'], true)
  })

  test('disables wiki-link rule when setting is false', async () => {
    const { ctx, hooks } = makeWorkerCtx(false)
    ;(globalThis.self as any).ctx = ctx

    await import('../worker-indexer')
    await hooks.get('WORKER_INDEXER_BEFORE_START_WATCH')!()

    expect(ctx.markdown.disable).toHaveBeenCalledWith(['wiki-links'], true)
  })
})
