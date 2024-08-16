import { parentPort, workerData, isMainThread, threadId } from 'worker_threads'
import * as fs from 'fs-extra'
import chokidar from 'chokidar'
import path from 'path'
import { isMarkdownFile } from '../../share/misc'

if (!isMainThread) {
  const { filePath, options } = workerData as { filePath: string, options: chokidar.WatchOptions & { mdContent?: boolean } }

  console.log(`watch worker ${threadId} >`, filePath)

  try {
    const ignoredRegexStr = options.ignored as string
    if (ignoredRegexStr && typeof ignoredRegexStr === 'string') {
      const ignoredRegex = new RegExp(ignoredRegexStr)
      options.ignored = (str: string) => {
        return str.split(path.sep)
          .some((x, i, arr) => ignoredRegex.test(i === arr.length - 1 ? x : x + '/'))
      }
    }
  } catch (error) {
    console.error(`watch worker ${threadId} >`, filePath, 'ignored error', error)
  }

  const watcher = chokidar.watch(filePath, options)

  const promiseQueue: Promise<any>[] = []

  let queueIsRunning = false
  const triggerPromiseQueue = async () => {
    if (queueIsRunning) {
      return
    }

    queueIsRunning = true
    while (promiseQueue.length) {
      const promise = promiseQueue.pop()
      if (promise) {
        try {
          enqueue('result', await promise)
        } catch (error) {
          console.error(`watch worker ${threadId} >`, filePath, 'promise error', error)
        }
      }
    }
    queueIsRunning = false
  }

  watcher.on('all', async (eventName, path, stats) => {
    promiseQueue.unshift(new Promise<any>(resolve => {
      const result = {
        eventName,
        path,
        content: null as string | null,
        stats: stats ? {
          ...stats,
          isFile: stats?.isFile(),
          isDirectory: stats.isDirectory(),
        } : undefined
      }

      if (options.mdContent && isMarkdownFile(path) && (eventName === 'add' || eventName === 'change')) {
        fs.readFile(path, 'utf-8').then(content => {
          result.content = content
          resolve(result)
        }).catch(() => {
          resolve(result)
        })
      } else {
        resolve(result)
      }
    }))

    triggerPromiseQueue()
  })

  watcher.on('ready', () => {
    promiseQueue.unshift(Promise.resolve({ eventName: 'ready' }))
    triggerPromiseQueue()
  })

  watcher.on('error', err => {
    console.error(`watch worker ${threadId} >`, filePath, 'error', err)
    enqueue('error', err)
  })

  const _cleanup = () => {
    console.log(`watch worker ${threadId} >`, filePath, 'cleanup')

    try {
      closeResponse()
      watcher.close()
      promiseQueue.length = 0
    } catch (error) {
      console.error(`watch worker ${threadId} >`, filePath, 'cleanup error', error)
    }

    process.exit(0)
  }

  function enqueue (type: string, data: any) {
    parentPort!.postMessage({ type: 'enqueue', payload: { type, data } })
  }

  function closeResponse () {
    parentPort!.postMessage({ type: 'close' })
  }

  parentPort!.on('message', (message) => {
    if (message.type === 'cleanup') {
      _cleanup()
    }
  })
}
