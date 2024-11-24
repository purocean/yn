import { JSONRPCClient, JSONRPCClientChannel, JSONRPCRequest, JSONRPCResponse, JSONRPCServer, JSONRPCServerChannel } from 'jsonrpc-bridge'
import store from '@fe/support/store'
import type { Repo } from '@share/types'
import { FLAG_DEBUG, FLAG_DEMO, MODE } from '@fe/support/args'
import ctx from '@fe/context'
import { documents } from '@fe/others/db'
import { getLogger } from '@fe/utils'
import { getAllRepos } from './repo'
import type { IndexerWorkerExports } from '@fe/others/indexer-worker'
import type { IndexStatus } from '@fe/types'

import workerUrl from '@fe/others/indexer-worker?worker&url'

const workerURL = new URL(workerUrl, import.meta.url)

const searchParams = new URLSearchParams(window.location.search)

for (const [key, value] of searchParams) {
  workerURL.searchParams.set(key, value)
}

const logger = getLogger('indexer')

const worker = new Worker(workerURL, { type: 'module' })

class WorkerChannel implements JSONRPCServerChannel, JSONRPCClientChannel {
  worker: Worker
  type: 'server' | 'client'

  constructor (worker: Worker, type: 'server' | 'client') {
    this.worker = worker
    this.type = type
  }

  send (message: JSONRPCRequest & JSONRPCResponse): void {
    if (this.type === 'client' && 'method' in message) {
      this.worker.postMessage({ from: 'host', message })
    } else if (this.type === 'server' && 'result' in message) {
      this.worker.postMessage({ from: 'host', message })
    }
  }

  setMessageHandler (callback: (message: JSONRPCResponse & JSONRPCRequest) => void): void {
    this.worker.addEventListener('message', (event) => {
      const { message, from } = event.data
      if (from !== 'worker') {
        return
      }

      if (this.type === 'client' && 'result' in message) {
        callback(message)
      } else if (this.type === 'server' && 'method' in message) {
        callback(message)
      }
    })
  }
}

export type IndexerHostExports = { ctx: typeof ctx }

// provide ctx to worker
const server = new JSONRPCServer(new WorkerChannel(worker, 'server'), { debug: FLAG_DEBUG })

// to call worker
const client = new JSONRPCClient<IndexerWorkerExports>(new WorkerChannel(worker, 'client'), { debug: FLAG_DEBUG })

function triggerWatchRepo (repo?: Repo) {
  if (!repo?.enableIndexing) {
    logger.info('triggerWatchRepo', repo?.name, 'disabled')
    stopWatch()
    return
  }

  client.call.main.triggerWatchRepo(repo ? { ...repo } : null)
}

export function getDocumentsManager () {
  return documents
}

export function stopWatch () {
  client.call.main.stopWatch()
}

export async function cleanCurrentRepo () {
  const repo = store.state.currentRepo
  store.state.currentRepoIndexStatus = null
  if (repo) {
    await documents.deleteByRepo(repo.name)
  }
}

export function cleanUnusedRepo () {
  const repos = getAllRepos()

  documents.deleteUnusedRepo(repos.filter(x => x.enableIndexing).map(repo => repo.name))
}

export function triggerWatchCurrentRepo () {
  const repo = store.state.currentRepo
  triggerWatchRepo(repo)
  cleanUnusedRepo()
}

export async function rebuildCurrentRepo () {
  await cleanCurrentRepo()
  triggerWatchCurrentRepo()
}

export function updateIndexStatus (repo: Repo, status: IndexStatus) {
  logger.info('updateIndexStatus', repo.name, status.ready, status.indexed, status.cost)
  store.state.currentRepoIndexStatus = { repo: repo.name, status }
}

export async function importScriptsToWorker (url: string | URL) {
  if (FLAG_DEMO || MODE !== 'normal') {
    return
  }

  await client.call.main.importScripts(typeof url === 'string' ? url : url.href)
}

Promise.resolve().then(() => {
  server.addModule('ctx', ctx)
})
