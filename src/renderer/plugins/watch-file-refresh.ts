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
          if (
            currentFile &&
            currentFile.stat &&
            payload.stats &&
            currentFile?.absolutePath === ctx.utils.path.normalizeSep(payload.path)
          ) {
            const remoteFileUpdated = payload.stats.mtimeMs > currentFile.stat.mtime
            const currentFileSaved = ctx.store.getters.isSaved

            logger.debug('startWatch onResult', { remoteFileUpdated, currentFileSaved })
            if (remoteFileUpdated) {
              if (currentFileSaved) {
                ctx.doc.switchDoc(currentFile, true)
              } else {
                ctx.ui.useModal().confirm({
                  title: ctx.i18n.t('file-changed-alert.title'),
                  content: ctx.i18n.t('file-changed-alert.content'),
                  okText: ctx.i18n.t('file-changed-alert.reload'),
                }).then((ok) => {
                  if (ok) {
                    ctx.store.state.currentContent = currentFile.content || '' // reset content
                    ctx.doc.switchDoc(currentFile, true)
                  }
                })
              }
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
