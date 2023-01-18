import type { Plugin } from '@fe/context'
import type { Doc } from '@fe/types'
import { getLogger } from '@fe/utils'

export default {
  name: 'watch-file-refresh',
  register: (ctx) => {
    if (ctx.args.FLAG_DEMO || ctx.args.MODE !== 'normal') {
      return
    }

    const logger = getLogger('watch-file-refresh')

    const AsyncLock = ctx.lib.asynclock
    const lock = new AsyncLock()

    type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
    let handler: Awaited<ReturnType<typeof ctx.api.watchFile>> | null = null

    function stopWatch () {
      logger.debug('stopWatch', !!handler)
      if (handler) {
        handler.abort()
        handler = null
      }
    }

    async function startWatch (doc: Doc) {
      const { repo, path } = doc
      logger.debug('startWatch', repo, path)
      const watchHandler = await ctx.api.watchFile(
        repo,
        path,
        { awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 50 }, alwaysStat: true },
        payload => {
          logger.debug('startWatch onResult', payload)
          const currentFile = ctx.store.state.currentFile
          if (currentFile && currentFile.stat && currentFile?.absolutePath === payload.path && payload.stats) {
            const remoteFileUpdated = payload.stats.mtimeMs > currentFile.stat.mtime
            const currentFileSaved = ctx.store.getters.isSaved

            logger.debug('startWatch onResult', { remoteFileUpdated, currentFileSaved })
            if (remoteFileUpdated && currentFileSaved) {
              ctx.doc.switchDoc(currentFile, true)
            }
          } else {
            logger.debug('startWatch onResult abort watch')
            watchHandler?.abort()
          }
        },
        async error => {
          logger.error('startWatch error', error)
          // retry watch
          await ctx.utils.sleep(2000)
          triggerWatchFile(ctx.store.state.currentFile)
        }
      )

      handler = watchHandler
    }

    async function triggerWatchFile (doc?: Doc | null) {
      lock.acquire('triggerWatch', async (done) => {
        logger.debug('triggerWatch', !!doc)
        stopWatch()
        try {
          if (doc && ctx.doc.isSameFile(doc, ctx.store.state.currentFile)) {
            await startWatch(doc)
          }
        } finally {
          done()
        }
      })
    }

    ctx.registerHook('DOC_SWITCHED', ({ doc }) => {
      triggerWatchFile(doc)
    })
  }
} as Plugin
