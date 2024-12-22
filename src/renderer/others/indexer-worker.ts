import AsyncLock from 'async-lock'
import MarkdownIt, { Token } from 'markdown-it'
import { throttle } from 'lodash-es'
import { JSONRPCClient, JSONRPCClientChannel, JSONRPCRequest, JSONRPCResponse, JSONRPCServer, JSONRPCServerChannel } from 'jsonrpc-bridge'
import { fetchTree, readFile, watchFs } from '@fe/support/api'
import { DOM_ATTR_NAME, FLAG_DEBUG, FLAG_DEMO, HELP_REPO_NAME, MODE } from '@fe/support/args'
import * as utils from '@fe/utils/pure'
import { DocumentEntity, documents } from '@fe/others/db'
import { isMarkdownFile } from '@share/misc'
import type { Stats } from 'fs'
import type { PathItem, Repo } from '@share/types'
import type { IndexerHostExports } from '@fe/services/indexer'
import type { Components, IndexItemLink, IndexItemResource } from '@fe/types'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { isAnchorToken, isDataUrl, isResourceToken, parseLink } from '@fe/plugins/markdown-link/lib'

const markdown = MarkdownIt({ linkify: false, breaks: true, html: true })

markdown.core.ruler.at('inline', function (state) {
  const tokens = state.tokens

  for (let i = 0, l = tokens.length; i < l; i++) {
    const tok = tokens[i]
    if (tok.type === 'inline') {
      state.md.inline.parse(tok.content, state.md, state.env, tok.children as any)

      let map = tok.map

      if (!map) {
        // find previous token with map info
        for (let j = i - 1; j >= 0; j--) {
          if (tokens[j].map) {
            map = tokens[j].map
            break
          }
        }
      }

      for (let j = 0; j < tok.children!.length; j++) {
        const token = tok.children![j]
        ;(token as any)._block_map = map
      }
    }
  }
})

const exportMain = {
  triggerWatchRepo,
  stopWatch,
  importScripts: async (urlOrCode: string, isCode = false) => {
    if (isCode) {
      const url = URL.createObjectURL(new Blob([urlOrCode], { type: 'application/javascript' }))
      await import(/* @vite-ignore */ url)
      URL.revokeObjectURL(url)
    } else {
      await import(/* @vite-ignore */ urlOrCode)
    }
  },
}

class WorkerChannel implements JSONRPCServerChannel, JSONRPCClientChannel {
  type: 'server' | 'client'

  constructor (type: 'server' | 'client') {
    this.type = type
  }

  send (message: JSONRPCRequest & JSONRPCResponse): void {
    if (this.type === 'client' && 'method' in message) {
      self.postMessage({ from: 'worker', message })
    } else if (this.type === 'server' && 'result' in message) {
      self.postMessage({ from: 'worker', message })
    }
  }

  setMessageHandler (callback: (message: JSONRPCResponse & JSONRPCRequest) => void): void {
    self.addEventListener('message', (event) => {
      const { message, from } = event.data
      if (from !== 'host') {
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

export type IndexerWorkerExports = { main: typeof exportMain }

export interface IndexerWorkerCtx {
  markdown: MarkdownIt;
  bridgeClient: JSONRPCClient<IndexerHostExports>;
  registerHook: typeof registerHook;
  removeHook: typeof removeHook;
  utils: typeof utils;
}

// provide main to host
const bridgeServer = new JSONRPCServer(new WorkerChannel('server'), { debug: FLAG_DEBUG })
bridgeServer.addModule('main', exportMain)

// to call host
const bridgeClient = new JSONRPCClient<IndexerHostExports>(new WorkerChannel('client'), { debug: FLAG_DEBUG })

const processingStatus = {
  total: 0,
  indexed: 0,
  ready: false,
  startTime: 0,
}

function _reportStatus (repo: Repo, processing: string | null, cost: number) {
  const { total, indexed, ready } = processingStatus
  bridgeClient.call.ctx.indexer.updateIndexStatus(repo, { ready, total, indexed, processing, cost })
}

function _convertPathToPathItem (repo: Repo, payload: { path: string }): PathItem {
  const relativePath = '/' + utils.path.relative(repo.path, payload.path)
  return { repo: repo.name, path: relativePath }
}

const reportStatus = throttle(_reportStatus, 500, { leading: true, trailing: true })

let repoFiles: Components.Tree.Node[] = [] // TODO cache
let allMtimeMs: Map<string, { id: number, mtimeMs: number }> | null = null
let toPutItems: (Omit<DocumentEntity, 'id'> & { id?: number })[] = []
let reusedIds: number[] = []

class RepoWatcher {
  logger = utils.getLogger('indexer-worker-repo-watcher')

  lock = new AsyncLock()

  // type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
  handler: Awaited<ReturnType<typeof watchFs>> | null = null

  stopWatch () {
    this.logger.debug('stopWatch', !!this.handler)
    if (this.handler) {
      this.handler.abort()
      this.handler = null
    }
  }

  private async _startWatch (repo: Repo) {
    if (!repo.enableIndexing || repo.name === HELP_REPO_NAME || FLAG_DEMO || MODE !== 'normal') {
      this.logger.debug('startWatch', 'skip', repo)
      this.stopWatch()
      return
    }

    this.logger.debug('startWatch', repo)

    const ignored = ((await bridgeClient.call.ctx.setting.getSetting('tree.exclude')) || '') as string

    processingStatus.total = 0
    processingStatus.indexed = 0
    processingStatus.ready = false
    processingStatus.startTime = Date.now()

    const include = '/$|.md$' // dir or md file

    const initRes = await Promise.all([
      fetchTree(repo.name, { by: 'mtime', order: 'desc' }, include, true).catch(() => []),
      documents.findAllMtimeMsByRepo(repo.name),
    ])

    repoFiles = initRes[0]
    allMtimeMs = initRes[1]
    toPutItems = []
    reusedIds = []

    await triggerHook('WORKER_INDEXER_BEFORE_START_WATCH', { repo }, { breakable: true })

    this.handler = await watchFs(
      repo.name,
      '/**/*.md',
      { awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 50 }, alwaysStat: true, ignored, mdContent: true },
      async payload => {
        this.logger.debug('startWatch onResult', payload.eventName, (payload as any).path)

        if (payload.eventName === 'add' || payload.eventName === 'change') {
          if (!isMarkdownFile(payload.path)) {
            return
          }

          try {
            if (!processingStatus.ready) {
              processingStatus.total++
              reportStatus(repo, payload.path, Date.now() - processingStatus.startTime)
            }

            await processMarkdownFile(repo, payload)
            processingStatus.indexed++
          } catch (error) {
            this.logger.error('processFile error', error)
          }
        } else if (payload.eventName === 'ready') {
          allMtimeMs = null
          processingStatus.ready = true
          const ids = toPutItems.length ? await documents.bulkPut(toPutItems) : []
          await documents.deleteUnusedInRepo(repo.name, reusedIds.concat(ids))
          toPutItems = []
          reusedIds = []

          reportStatus(repo, null, Date.now() - processingStatus.startTime)
        } else if (payload.eventName === 'unlink') {
          const doc = _convertPathToPathItem(repo, payload)
          await documents.deletedByRepoAndPath(doc.repo, doc.path)
        }
      },
      async error => {
        this.logger.error('startWatch error', error)

        // ignore system error
        if ((error as any)?.syscall) {
          return
        }

        // retry watch then other error occurred
        await utils.sleep(2000)
        this.triggerWatchRepo(repo)
      }
    )
  }

  async triggerWatchRepo (repo: Repo | null | undefined) {
    this.lock.acquire('triggerWatch', async (done) => {
      this.logger.debug('triggerWatch', repo)
      this.stopWatch()
      try {
        if (repo?.name && repo?.path) {
          await this._startWatch(repo)
        }
      } finally {
        done()
      }
    })
  }
}

const logger = utils.getLogger('indexer-worker')
const watcher = new RepoWatcher()

function triggerWatchRepo (repo: Repo | null | undefined) {
  watcher.triggerWatchRepo(repo)
}

function stopWatch () {
  watcher.stopWatch()
}

async function processMarkdownFile (repo: Repo, payload: { content?: string | null, path: string, stats?: Stats }): Promise<void> {
  const doc = _convertPathToPathItem(repo, payload)

  const oldRecord = allMtimeMs ? allMtimeMs.get(doc.path) : await documents.findByRepoAndPath(doc.repo, doc.path)

  if (oldRecord && oldRecord.mtimeMs === payload.stats?.mtimeMs) {
    logger.debug('skip', oldRecord.id, doc.path)
    reusedIds.push(oldRecord.id)
    return
  }

  let content: string
  if (typeof payload.content === 'string') {
    content = payload.content
  } else {
    const res = await readFile(doc)
    content = res.content
  }

  const env: Record<string, any> = { file: doc }
  const tokens = markdown.parse(content, env)

  const links: IndexItemLink[] = []
  const resources: IndexItemResource[] = []

  const convert = (tokens: Token[]) => {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (isAnchorToken(token)) {
        const href = token.attrGet('href') || ''
        const blockMap = (token as any)._block_map
        if (!isDataUrl(href)) {
          const isWikiLink = !!token.attrGet(DOM_ATTR_NAME.WIKI_LINK)
          const parsedLink = isWikiLink ? parseLink(doc, href, true, repoFiles) : parseLink(doc, href, false)
          if (parsedLink?.type === 'external') {
            links.push({ href, internal: null, position: null, blockMap })
          } else if (parsedLink?.type === 'internal') {
            links.push({ href, internal: parsedLink.path, position: parsedLink.position, blockMap })
          }
        }
      } else if (isResourceToken(token)) {
        const path = token.attrGet(DOM_ATTR_NAME.TARGET_PATH)
        const src = token.attrGet('src') || ''

        if (!isDataUrl(src)) {
          const blockMap = (token as any)._block_map
          resources.push({ src, internal: path, tag: token.tag as any, blockMap })
        }
      }

      if (token.children) {
        convert(token.children)
      }
    }
  }

  convert(tokens)

  const item = {
    id: oldRecord?.id,
    repo: doc.repo,
    path: doc.path,
    name: utils.path.basename(doc.path),
    links,
    resources,
    frontmatter: env.attributes || {},
    ctimeMs: payload.stats?.ctimeMs || 0,
    mtimeMs: payload.stats?.mtimeMs || 0,
    size: payload.stats?.size || 0,
  }

  if (processingStatus.ready) {
    documents.put(item)
  } else {
    toPutItems.push(item)
  }
}

// expose to plugin
self.ctx = { bridgeClient, markdown, registerHook, removeHook, utils } satisfies IndexerWorkerCtx

logger.debug('indexer-worker loaded', self.location.href)
