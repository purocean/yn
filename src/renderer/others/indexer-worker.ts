import AsyncLock from 'async-lock'
import MarkdownIt, { Token } from 'markdown-it'
import { throttle } from 'lodash-es'
import { JSONRPCClient, JSONRPCClientChannel, JSONRPCRequest, JSONRPCResponse, JSONRPCServer, JSONRPCServerChannel } from 'jsonrpc-bridge'
import { readFile, watchFs } from '@fe/support/api'
import { FLAG_DEBUG, FLAG_DEMO, HELP_REPO_NAME, MODE } from '@fe/support/args'
import { getLogger, path, removeQuery, sleep } from '@fe/utils/pure'
import { getDocument, updateOrInsertDocument } from '@fe/others/db'
import { isMarkdownFile } from '@share/misc'
import type { Stats } from 'fs'
import type { PathItem, Repo } from '@share/types'
import type { IndexerHostExports } from '@fe/services/indexer'
import type { IndexItemLink } from '@fe/types'

const markdown = MarkdownIt({ linkify: true, breaks: true, html: true })
const supportedLinkTags = ['audio', 'img', 'source', 'video', 'track', 'a', 'iframe', 'embed']

const exportMain = { triggerWatchRepo, stopWatch }

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

// provide ctx to worker
const server = new JSONRPCServer(new WorkerChannel('server'), { debug: FLAG_DEBUG })
server.addModule('main', exportMain)

// to call worker
const client = new JSONRPCClient<IndexerHostExports>(new WorkerChannel('client'), { debug: FLAG_DEBUG })

let total = 0
let indexed = 0
let startTime = 0

function _reportStatus (repo: Repo, processing: string | null, cost: number) {
  client.call.ctx.indexer.updateIndexStatus(repo, { total, indexed, processing, cost })
}

const reportStatus = throttle(_reportStatus, 900, { leading: true, trailing: true })

class RepoWatcher {
  logger = getLogger('indexer-worker-repo-watcher')

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

    const ignored = ((await client.call.ctx.setting.getSetting('tree.exclude')) || '') as string

    total = 0
    indexed = 0
    startTime = Date.now()

    this.handler = await watchFs(
      repo.name,
      '/',
      { awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 50 }, alwaysStat: true, ignored, mdContent: true },
      async payload => {
        this.logger.debug('startWatch onResult', payload.eventName, (payload as any).path)

        if (payload.eventName === 'add' || payload.eventName === 'change') {
          if (!isMarkdownFile(payload.path)) {
            return
          }

          try {
            total++
            reportStatus(repo, payload.path, Date.now() - startTime)
            await processMarkdownFile(repo, payload)
            indexed++
          } catch (error) {
            this.logger.error('processFile error', error)
          }
        } else if (payload.eventName === 'ready') {
          reportStatus(repo, null, Date.now() - startTime)
        }
      },
      async error => {
        this.logger.error('startWatch error', error)

        // ignore system error
        if ((error as any)?.syscall) {
          return
        }

        // retry watch then other error occurred
        await sleep(2000)
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

const logger = getLogger('indexer-worker')
const watcher = new RepoWatcher()

function triggerWatchRepo (repo: Repo | null | undefined) {
  watcher.triggerWatchRepo(repo)
}

function stopWatch () {
  watcher.stopWatch()
}

async function processMarkdownFile (repo: Repo, payload: { content?: string, path: string, stats?: Stats }) {
  const relativePath = '/' + path.relative(repo.path, payload.path)
  const doc: PathItem = { repo: repo.name, path: relativePath }

  const oldRecord = await getDocument(doc.repo, doc.path)
  if (oldRecord && oldRecord.mtimeMs === payload.stats?.mtimeMs) {
    logger.debug('skip', doc.path)
    return
  }

  let content = payload.content
  if (!content) {
    const res = await readFile(doc)
    content = res.content
  }

  const env = {}
  const tokens = markdown.parse(content, env)

  const links: IndexItemLink[] = []

  // TODO WIKI LINKS
  const buildLink = (token: Token) => {
    let link: string | null | undefined = token.tag === 'a' ? token.attrGet('href') : token.attrGet('src')
    const title = token.attrGet('title')

    link = link?.trim()
    if (!link) {
      return
    }

    if (link.startsWith('//')) {
      link = 'https:' + link
    }

    const val: IndexItemLink = {
      link,
      internal: null,
      title,
      holder: token.tag as any,
    }

    if (!/^[a-z+]+:/.test(link)) { // internal link
      const p = removeQuery(path.normalizeSep(link))
      val.internal = path.resolve(path.dirname(doc.path), p)
    }

    links.push(val)
  }

  const convert = (tokens: Token[]) => {
    tokens.forEach(token => {
      if (supportedLinkTags.includes(token.tag)) {
        buildLink(token)
      }

      if (token.children) {
        convert(token.children)
      }
    })
  }

  convert(tokens)

  await updateOrInsertDocument({
    id: oldRecord?.id,
    repo: doc.repo,
    path: doc.path,
    name: path.basename(doc.path),
    links,
    frontmatter: {}, // TODO frontmatter
    ctimeMs: payload.stats?.ctimeMs || 0,
    mtimeMs: payload.stats?.mtimeMs || 0,
    size: payload.stats?.size || 0,
  })
}

logger.debug('indexer-worker loaded', self.location.href)
