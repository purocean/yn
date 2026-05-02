import { processFrontMatter, useMarkdownItRule } from '../lib'

describe('markdown-front-matter lib', () => {
  test('extracts attributes and records where markdown body begins', () => {
    const src = [
      '---',
      'title: Hello',
      'tags:',
      '  - one',
      '---',
      '# Body',
      'Text',
    ].join('\n')
    const env: any = {}

    expect(processFrontMatter(src, env)).toEqual({
      attributes: {
        title: 'Hello',
        tags: ['one'],
      },
    })
    expect(env).toEqual({
      attributes: {
        title: 'Hello',
        tags: ['one'],
      },
      bodyBegin: 5,
      bodyBeginPos: src.indexOf('# Body') - 1,
      _front_matter_exec_flag: false,
    })
  })

  test('uses empty attributes and body start for markdown without front matter', () => {
    const env: any = {}

    expect(processFrontMatter('plain\nbody', env)).toEqual({ attributes: {} })
    expect(env.bodyBegin).toBe(0)
    expect(env.bodyBeginPos).toBe(0)
    expect(env.attributes).toEqual({})
  })

  test('logs parse errors and leaves a usable default environment', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const env: any = {}

    expect(processFrontMatter('---\ntitle: [\n---\nBody', env)).toEqual({ attributes: {} })
    expect(env.bodyBegin).toBe(0)
    expect(env.bodyBeginPos).toBe(0)
    expect(env.attributes).toEqual({})
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })

  test('registers a block rule that skips front matter only once before the body', () => {
    let callback: (state: any, startLine: number) => boolean = () => false
    const before = vi.fn((firstRuleName, ruleName, cb) => {
      expect(firstRuleName).toBe('paragraph')
      expect(ruleName).toBe('front-matter')
      callback = cb
    })
    const md = {
      block: {
        ruler: {
          __rules__: [{ name: 'paragraph' }],
          before,
        },
      },
    } as any

    useMarkdownItRule(md)

    expect(before).toHaveBeenCalledTimes(1)

    const state = {
      env: {
        bodyBegin: 4,
        _front_matter_exec_flag: false,
      },
      line: 0,
    }

    expect(callback(state, 0)).toBe(true)
    expect(state.line).toBe(4)
    expect(state.env._front_matter_exec_flag).toBe(true)
    expect(callback(state, 0)).toBe(false)
    expect(callback({ env: { bodyBegin: 4 }, line: 0 }, 4)).toBe(false)
  })
})
