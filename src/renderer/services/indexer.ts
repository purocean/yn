import { JSONRPCClient, JSONRPCClientChannel, JSONRPCRequest, JSONRPCResponse, JSONRPCServer, JSONRPCServerChannel } from 'jsonrpc-bridge'
import store from '@fe/support/store'
import type { Repo } from '@share/types'
import { FLAG_DEBUG } from '@fe/support/args'
import ctx from '@fe/context'
import { documents } from '@fe/others/db'
import { getAllRepos } from './repo'
import type { IndexerWorkerExports } from '@fe/others/indexer-worker'
import type { IndexStatus } from '@fe/types'

import workerUrl from '@fe/others/indexer-worker?worker&url'

const workerURL = new URL(workerUrl, import.meta.url)

const searchParams = new URLSearchParams(window.location.search)

for (const [key, value] of searchParams) {
  workerURL.searchParams.set(key, value)
}

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
  client.call.main.triggerWatchRepo(repo ? { ...repo } : null)
}

export function stopWatch () {
  client.call.main.stopWatch()
}

export function cleanCurrentRepo () {
  const repo = store.state.currentRepo
  if (repo) {
    documents.deleteByRepo(repo.name)
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

export function updateIndexStatus (repo: Repo, status: IndexStatus) {
  console.log('xxx index status', status)
}

export async function importScriptsToWorker (url: string) {
  await client.call.main.importScripts(url)
}

Promise.resolve().then(() => {
  server.addModule('ctx', ctx)
})
