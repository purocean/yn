import { PassThrough, Readable } from 'stream'
import { ReadableStream } from 'stream/web'
import * as path from 'path'

export const convertAppPath = (path: string) => path.replace('app.asar', 'app.asar.unpacked')

/**
 * Resolve a relative path strictly inside root using native path semantics.
 * Absolute and drive-qualified inputs are rejected on every platform.
 * This is a lexical check only; it does not resolve symlinks or filesystem aliases.
 */
export function resolvePathWithin (root: string, input: unknown): string | null {
  if (typeof input !== 'string' || !input || input.includes('\0') || path.isAbsolute(input) || path.win32.parse(input).root) {
    return null
  }

  const target = path.resolve(root, input)
  const relative = path.relative(path.resolve(root), target)
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative) ? target : null
}

export function mergeStreams (streams: NodeJS.ReadableStream[]) {
  let pass = new PassThrough()
  let waiting = streams.length
  for (const stream of streams) {
    pass = stream.pipe(pass, { end: false })
    stream.once('end', () => --waiting === 0 && pass.emit('end'))
  }
  return pass
}

export function createStreamResponse (isCanceled = () => false) {
  function isReadableEnded (stream: any) {
    if (stream.readableEnded === true) return true
    const rState = stream._readableState
    if (!rState || rState.errored) return false
    if (typeof rState?.ended !== 'boolean') return null
    return rState.ended
  }

  /**
   * from https://github.com/nodejs/node/blob/ba67fe66eb7777d5055c785be153374843fc647e/lib/internal/streams/readable.js
   * @param {ReadableStream} readableStream
   * @param {{
   *   highWaterMark? : number,
   *   encoding? : string,
   *   objectMode? : boolean,
   *   signal? : AbortSignal,
   * }} [options]
   * @returns {Readable}
   */
  function newStreamReadableFromReadableStream (readableStream: ReadableStream, options: any = {}) {
    const reader = readableStream.getReader()
    let closed = false

    const readable = new Readable({
      ...options,
      read () {
        reader.read().then((chunk) => {
          if (chunk.done) {
            // Value should always be undefined here.
            readable.push(null)
          } else {
            readable.push(chunk.value)
          }
        },
        (error) => readable.destroy(error))
      },

      destroy (error, callback) {
        function done () {
          try {
            callback(error)
          } catch (error) {
            // In a next tick because this is happening within
            // a promise context, and if there are any errors
            // thrown we don't want those to cause an unhandled
            // rejection. Let's just escape the promise and
            // handle it separately.
            process.nextTick(() => { throw error })
          }
        }

        if (!closed) {
          reader.cancel().then(done, done)
          return
        }
        done()
      },
    })

    reader.closed.then(
      () => {
        closed = true
        if (!isReadableEnded(readable)) { readable.push(null) }
      },
      (error) => {
        closed = true
        readable.destroy(error)
      }
    )

    return readable
  }

  let close: () => void = () => undefined
  let enqueue: <T extends 'result' | 'message' | 'done' | 'error' | 'null'> (type: T, payload: any) => void = () => undefined
  const stream = new ReadableStream({
    start (controller) {
      if (isCanceled()) {
        controller.close()
        return
      }

      const _enqueue = (chunk: any) => {
        if (isCanceled()) {
          close()
        } else {
          controller.enqueue(chunk)
        }
      }

      close = () => {
        try {
          controller.close()
        } catch {
          // ignore
        }
      }

      enqueue = <T extends 'result' | 'message' | 'done' | 'error' | 'null'> (type: T, payload: any) => {
        if (type === 'null') {
          _enqueue(null)
        } else {
          const message = { type, payload }
          _enqueue(JSON.stringify(message) + '\n')
        }
      }
    }
  })

  // Readable.fromWeb only available in node 17
  // const response = Readable.fromWeb(stream)
  const response = newStreamReadableFromReadableStream(stream)

  return { response, close, enqueue }
}
