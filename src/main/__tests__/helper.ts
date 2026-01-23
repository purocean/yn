import { convertAppPath, mergeStreams, createStreamResponse } from '../helper'
import { PassThrough } from 'stream'

describe('helper module', () => {
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
    test('should merge multiple streams', (done) => {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const stream3 = new PassThrough()

      const merged = mergeStreams([stream1, stream2, stream3])

      const chunks: Buffer[] = []
      merged.on('data', (chunk) => chunks.push(chunk))
      merged.on('end', () => {
        const result = Buffer.concat(chunks).toString()
        expect(result).toContain('stream1')
        expect(result).toContain('stream2')
        expect(result).toContain('stream3')
        done()
      })

      stream1.write('stream1')
      stream1.end()
      stream2.write('stream2')
      stream2.end()
      stream3.write('stream3')
      stream3.end()
    })

    test('should handle empty stream array', (done) => {
      const merged = mergeStreams([])

      const chunks: Buffer[] = []
      merged.on('data', (chunk) => chunks.push(chunk))
      merged.on('end', () => {
        expect(chunks.length).toBe(0)
        done()
      })

      merged.emit('end')
    })

    test('should handle single stream', (done) => {
      const stream = new PassThrough()
      const merged = mergeStreams([stream])

      const chunks: Buffer[] = []
      merged.on('data', (chunk) => chunks.push(chunk))
      merged.on('end', () => {
        const result = Buffer.concat(chunks).toString()
        expect(result).toBe('test data')
        done()
      })

      stream.write('test data')
      stream.end()
    })
  })

  describe('createStreamResponse', () => {
    test('should create a stream response', () => {
      const { response, close, enqueue } = createStreamResponse()

      expect(response).toBeDefined()
      expect(typeof close).toBe('function')
      expect(typeof enqueue).toBe('function')
    })

    test('should enqueue result messages', (done) => {
      const { response, enqueue, close } = createStreamResponse()

      const chunks: string[] = []
      response.on('data', (chunk) => chunks.push(chunk.toString()))
      response.on('end', () => {
        expect(chunks.length).toBeGreaterThan(0)
        const message = JSON.parse(chunks[0])
        expect(message.type).toBe('result')
        expect(message.payload).toBe('test')
        done()
      })

      enqueue('result', 'test')
      setImmediate(() => close())
    })

    test('should enqueue error messages', (done) => {
      const { response, enqueue, close } = createStreamResponse()

      const chunks: string[] = []
      response.on('data', (chunk) => chunks.push(chunk.toString()))
      response.on('end', () => {
        expect(chunks.length).toBeGreaterThan(0)
        const message = JSON.parse(chunks[0])
        expect(message.type).toBe('error')
        done()
      })

      enqueue('error', 'test error')
      setImmediate(() => close())
    })

    test('should enqueue message and done messages', (done) => {
      const { response, enqueue, close } = createStreamResponse()

      const chunks: string[] = []
      response.on('data', (chunk) => chunks.push(chunk.toString()))
      response.on('end', () => {
        expect(chunks.length).toBeGreaterThan(0)
        done()
      })

      enqueue('message', 'hello')
      enqueue('done', 'finished')
      setImmediate(() => close())
    })
  })
})
