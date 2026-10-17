import { convertAppPath, mergeStreams, createStreamResponse } from '../helper'
import { PassThrough } from 'stream'
import * as nodePath from 'node:path'

describe.each([
  { name: 'POSIX', paths: nodePath.posix, root: '/app/help' },
  { name: 'Windows', paths: nodePath.win32, root: 'C:\\app\\help' }
])('resolvePathWithin with $name semantics', ({ paths, root }) => {
  let resolvePathWithin: typeof import('../helper').resolvePathWithin

  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('path', () => paths)
    ;({ resolvePathWithin } = await import('../helper'))
  })

  afterEach(() => vi.doUnmock('path'))

  test.each([
    'README.md', 'nested/guide.png', './nested/guide.md',
    'nested/../README.md', '..guide.md', 'nested/使用 指南.md'
  ])('resolves a contained relative path: %s', input => {
    expect(resolvePathWithin(root, input)).toBe(paths.resolve(root, input))
  })

  test.each([
    '../README.md', '../../secret', '..//../secret', 'nested/../../secret',
    '../help-other/secret', '/README.md', 'C:\\secret', 'C:/secret', 'C:secret', 'D:/secret',
    '//server/share/secret', '\\\\server\\share\\secret', '\\secret', '\\\\?\\C:\\secret',
    '.', '..', 'nested/..', '', undefined, null, ['README.md'], 123, {}, 'README.md\0'
  ])('rejects invalid, rooted or escaping inputs: %j', input => {
    expect(resolvePathWithin(root, input)).toBeNull()
  })

  test('uses native separator rules', () => {
    const input = '..\\secret.md'
    expect(resolvePathWithin(root, input)).toBe(paths === nodePath.win32 ? null : paths.resolve(root, input))
  })

  test('accepts a root with a trailing separator and does not require an existing file', () => {
    expect(resolvePathWithin(root + paths.sep, 'not-created.md')).toBe(paths.resolve(root, 'not-created.md'))
  })
})

describe('helper module', () => {
  function collectChunks<T extends Buffer | string> (
    stream: NodeJS.ReadableStream,
    write: () => void,
    map: (chunk: any) => T = chunk => chunk
  ): Promise<T[]> {
    const chunks: T[] = []
    return new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(map(chunk)))
      stream.once('error', reject)
      stream.once('end', () => resolve(chunks))
      write()
    })
  }

  describe('convertAppPath', () => {
    test('should convert app.asar to app.asar.unpacked', () => {
      const path = '/path/to/app.asar/file.txt'
      const converted = convertAppPath(path)

      expect(converted).toBe('/path/to/app.asar.unpacked/file.txt')
    })

    test('should convert first occurrence of app.asar', () => {
      const path = '/path/to/app.asar/file.txt'
      const converted = convertAppPath(path)

      expect(converted).toBe('/path/to/app.asar.unpacked/file.txt')
    })

    test('should not modify paths without app.asar', () => {
      const path = '/normal/path/to/file.txt'
      const converted = convertAppPath(path)

      expect(converted).toBe(path)
    })

    test('should handle empty string', () => {
      expect(convertAppPath('')).toBe('')
    })
  })

  describe('mergeStreams', () => {
    test('should merge multiple streams', async () => {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const stream3 = new PassThrough()

      const merged = mergeStreams([stream1, stream2, stream3])

      const chunks = await collectChunks<Buffer>(merged, () => {
        stream1.write('stream1')
        stream1.end()
        stream2.write('stream2')
        stream2.end()
        stream3.write('stream3')
        stream3.end()
      })

      const result = Buffer.concat(chunks).toString()
      expect(result).toContain('stream1')
      expect(result).toContain('stream2')
      expect(result).toContain('stream3')
    })

    test('should handle empty stream array', async () => {
      const merged = mergeStreams([])

      const chunks = await collectChunks<Buffer>(merged, () => merged.emit('end'))

      expect(chunks.length).toBe(0)
    })

    test('should handle single stream', async () => {
      const stream = new PassThrough()
      const merged = mergeStreams([stream])

      const chunks = await collectChunks<Buffer>(merged, () => {
        stream.write('test data')
        stream.end()
      })

      const result = Buffer.concat(chunks).toString()
      expect(result).toBe('test data')
    })
  })

  describe('createStreamResponse', () => {
    test('should create a stream response', () => {
      const { response, close, enqueue } = createStreamResponse()

      expect(response).toBeDefined()
      expect(typeof close).toBe('function')
      expect(typeof enqueue).toBe('function')
    })

    test('should enqueue result messages', async () => {
      const { response, enqueue, close } = createStreamResponse()

      const chunks = await collectChunks<string>(response, () => {
        enqueue('result', 'test')
        setImmediate(() => close())
      }, chunk => chunk.toString())

      expect(chunks.length).toBeGreaterThan(0)
      const message = JSON.parse(chunks[0])
      expect(message.type).toBe('result')
      expect(message.payload).toBe('test')
    })

    test('should enqueue error messages', async () => {
      const { response, enqueue, close } = createStreamResponse()

      const chunks = await collectChunks<string>(response, () => {
        enqueue('error', 'test error')
        setImmediate(() => close())
      }, chunk => chunk.toString())

      expect(chunks.length).toBeGreaterThan(0)
      const message = JSON.parse(chunks[0])
      expect(message.type).toBe('error')
    })

    test('should enqueue message and done messages', async () => {
      const { response, enqueue, close } = createStreamResponse()

      const chunks = await collectChunks<string>(response, () => {
        enqueue('message', 'hello')
        enqueue('done', 'finished')
        setImmediate(() => close())
      }, chunk => chunk.toString())

      expect(chunks.length).toBeGreaterThan(0)
    })
  })
})
