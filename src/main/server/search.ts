import os from 'os'
import { ReadableStream } from 'stream/web'
import { Readable } from 'node:stream'
import { CancellationTokenSource, ITextQuery, TextSearchEngineAdapter } from 'ripgrep-wrapper'
import { rgPath } from '@vscode/ripgrep'
import { SearchMessage } from '../../share/typings'
import { BIN_DIR } from '../constant'
import { convertAppPath } from '../helper'

let rgDiskPath: string
if (os.platform() === 'darwin') {
  rgDiskPath = BIN_DIR + '/rg-darwin-' + os.arch()
} else {
  rgDiskPath = convertAppPath(rgPath)
}

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

export async function search (query: ITextQuery) {
  const cts = new CancellationTokenSource()
  const cancel = () => {
    cts.cancel()
  }

  const stream = new ReadableStream({
    start (controller) {
      if (cts.token.isCancellationRequested) {
        controller.close()
        return
      }

      const close = () => {
        try {
          controller.close()
        } catch {
          // ignore
        }
      }

      const _enqueue = (chunk: any) => {
        if (cts.token.isCancellationRequested) {
          close()
        } else {
          controller.enqueue(chunk)
        }
      }

      const enqueue = <T extends 'result' | 'message' | 'done' | 'error'> (type: T, payload: SearchMessage<T>['payload']) => {
        const message: SearchMessage<T> = { type, payload }
        _enqueue(JSON.stringify(message) + '\n')
      }

      const adapter = new TextSearchEngineAdapter(rgDiskPath, query)

      adapter.search(cts.token, (res) => {
        enqueue('result', res)
      }, message => {
        enqueue('message', message)
      }).then((success) => {
        enqueue('done', success)
        _enqueue(null)
        close()
      }, (err) => {
        enqueue('error', err)
        _enqueue(null)
        close()
      })
    }
  })

  // Readable.fromWeb only available in node 17
  // const result = Readable.fromWeb(stream)
  const result = newStreamReadableFromReadableStream(stream)

  result.once('close', cancel)
  result.once('error', cancel)

  return result
}
