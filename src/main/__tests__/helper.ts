import { convertAppPath, mergeStreams, createStreamResponse } from '../helper'
import { PassThrough } from 'stream'

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
