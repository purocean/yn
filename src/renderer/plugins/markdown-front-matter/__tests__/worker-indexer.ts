import { afterEach, describe, expect, test, vi } from 'vitest'

function makeWorkerCtx () {
  const md: any = {
    parse: vi.fn(() => ['parsed']),
    block: {
      ruler: {
        __rules__: [{ name: 'paragraph' }],
        before: vi.fn(),
      },
    },
  }
  const ctx = {
    markdown: {
      use: vi.fn((plugin: Function) => plugin(md)),
    },
  }
  return { ctx, md }
}

describe('markdown-front-matter worker indexer', () => {
  afterEach(() => {
    vi.resetModules()
  })

  test('processes front matter before worker markdown parsing', async () => {
    const { ctx, md } = makeWorkerCtx()
    ;(globalThis.self as any).ctx = ctx

    await import('../worker-indexer')

    const env: any = {}
    expect(md.parse('---\ntitle: Worker\n---\n# Body', env)).toEqual(['parsed'])
    expect(env.attributes).toEqual({ title: 'Worker' })
    expect(md.block.ruler.before).toHaveBeenCalledWith('paragraph', 'front-matter', expect.any(Function))
  })
})
