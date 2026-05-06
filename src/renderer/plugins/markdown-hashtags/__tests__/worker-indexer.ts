import { afterEach, describe, expect, test, vi } from 'vitest'

function makeWorkerCtx (enabled: boolean) {
  const hooks = new Map<string, Function>()
  const md = {
    inline: {
      ruler: {
        push: vi.fn(),
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

describe('markdown-hashtags worker indexer', () => {
  afterEach(() => {
    vi.resetModules()
  })

  test('registers hash-tag rule and enables it when setting is true', async () => {
    const { ctx, hooks, md } = makeWorkerCtx(true)
    ;(globalThis.self as any).ctx = ctx

    await import('../worker-indexer')

    expect(md.inline.ruler.push).toHaveBeenCalledWith('hash-tags', expect.any(Function))
    await hooks.get('WORKER_INDEXER_BEFORE_START_WATCH')!()
    expect(ctx.bridgeClient.call.ctx.setting.getSetting).toHaveBeenCalledWith('render.md-hash-tags', true)
    expect(ctx.markdown.enable).toHaveBeenCalledWith(['hash-tags'], true)
  })

  test('disables hash-tag rule when setting is false', async () => {
    const { ctx, hooks } = makeWorkerCtx(false)
    ;(globalThis.self as any).ctx = ctx

    await import('../worker-indexer')
    await hooks.get('WORKER_INDEXER_BEFORE_START_WATCH')!()

    expect(ctx.markdown.disable).toHaveBeenCalledWith(['hash-tags'], true)
  })
})
