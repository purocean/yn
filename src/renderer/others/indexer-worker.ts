import AsyncLock from 'async-lock'
import MarkdownIt, { Token } from 'markdown-it'
import { JSONRPCClient, JSONRPCClientChannel, JSONRPCRequest, JSONRPCResponse, JSONRPCServer, JSONRPCServerChannel } from 'jsonrpc-bridge'
import { readFile, watchFs } from '@fe/support/api'
import { FLAG_DEBUG, HELP_REPO_NAME } from '@fe/support/args'
import { getLogger, path, removeQuery, sleep } from '@fe/utils/pure'
import { updateOrInsertDocument } from '@fe/others/db'
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
    if (repo.name === HELP_REPO_NAME) {
      this.stopWatch()
      return
    }

    this.logger.debug('startWatch', repo)

    const ignored = ((await client.call.ctx.setting.getSetting('tree.exclude')) || '') as string

    total = 0
    indexed = 0

    this.handler = await watchFs(
      repo.name,
      '/',
      { awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 50 }, alwaysStat: true, ignored },
      async payload => {
        this.logger.debug('startWatch onResult', payload)

        if (payload.eventName === 'add' || payload.eventName === 'change') {
          try {
            await processFile(repo, payload)
          } catch (error) {
            this.logger.error('processFile error', error)
          }
        } else if (payload.eventName === 'ready') {
          client.call.ctx.indexer.updateIndexStatus(repo, {
            total,
            indexed,
            processing: null
          })
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

async function processFile (repo: Repo, payload: { path: string, stats?: Stats }) {
  if (!isMarkdownFile(payload.path)) {
    return
  }

  const relativePath = '/' + path.relative(repo.path, payload.path)
  const doc: PathItem = { repo: repo.name, path: relativePath }

  total++

  client.call.ctx.indexer.updateIndexStatus(repo, {
    total,
    indexed,
    processing: doc
  })

  const { content } = await readFile(doc)
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
    repo: doc.repo,
    path: doc.path,
    name: path.basename(doc.path),
    links,
    frontmatter: {}, // TODO frontmatter
    ctimeMs: payload.stats?.ctimeMs || 0,
    mtimeMs: payload.stats?.mtimeMs || 0,
    size: payload.stats?.size || 0,
  })

  indexed++
}

logger.debug('indexer-worker loaded', self.location.href)
