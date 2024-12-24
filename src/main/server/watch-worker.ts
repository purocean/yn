import * as fs from 'fs-extra'
import chokidar from 'chokidar'
import path from 'path'
import { isMarkdownFile } from '../../share/misc'

export type Message = { id: number, type: 'init' | 'stop' | 'enqueue', payload?: any }
export type WatchOpts = chokidar.WatchOptions & { mdContent?: boolean, mdFilesOnly?: boolean }

function init (id: number, filePath: string | string[], options: WatchOpts) {
  console.log(`watch process ${id} >`, filePath, 'init')

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
    console.error(`watch process ${id} >`, filePath, 'ignored error', error)
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
          console.error(`watch process ${id} >`, filePath, 'promise error', error)
        }
      }
    }
    queueIsRunning = false
  }

  watcher.on('all', async (eventName, path, stats) => {
    const isMdFile = isMarkdownFile(path)

    if (options.mdFilesOnly && !isMdFile) {
      return
    }

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

      if (options.mdContent && isMdFile && (eventName === 'add' || eventName === 'change')) {
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
    console.error(`watch process ${id} >`, filePath, 'error', err)
    enqueue('error', err)
  })

  function enqueue (type: string, data: any) {
    process.send?.({ id, type: 'enqueue', payload: { type, data } } satisfies Message)
  }

  function stop () {
    console.log(`watch process ${id} >`, filePath, 'stop')
    promiseQueue.length = 0
    watcher.close()
  }

  function onMessage (message: Message) {
    if (message.id === id && message.type === 'stop') {
      stop()
      process.off('message', onMessage)
    }
  }

  process.on('message', onMessage)
}

process.on('message', (message: Message) => {
  if (message.type === 'init') {
    const { filePath, options } = message.payload!
    init(message.id, filePath, options)
  }
})
