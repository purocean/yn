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
    let handler: Awaited<ReturnType<typeof ctx.api.watchFs>> | null = null

    function stopWatch () {
      logger.debug('stopWatch', !!handler)
      if (handler) {
        handler.abort()
        handler = null
      }
    }

    async function startWatch (doc: Doc) {
      if (doc.repo === ctx.args.HELP_REPO_NAME) {
        stopWatch()
        return
      }

      const { repo, path } = doc
      logger.debug('startWatch', repo, path)
      const watchHandler = await ctx.api.watchFs(
        repo,
        path,
        { awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 50 }, alwaysStat: true },
        payload => {
          logger.debug('startWatch onResult', payload)
          if (payload.eventName === 'ready') {
            return
          }

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
            if (remoteFileUpdated && ctx.editor.isDefault()) {
              if (currentFileSaved.value) {
                ctx.doc.switchDoc(currentFile, { force: true })
              } else {
                ctx.api.readFile(currentFile).then(({ hash }) => {
                  if (ctx.store.state.currentFile === currentFile && hash !== currentFile.contentHash) {
                    ctx.ui.useModal().confirm({
                      title: ctx.i18n.t('file-changed-alert.title'),
                      content: ctx.i18n.t('file-changed-alert.content'),
                      okText: ctx.i18n.t('file-changed-alert.reload'),
                    }).then((ok) => {
                      if (ok && ctx.store.state.currentFile === currentFile) {
                        ctx.store.state.currentContent = currentFile.content || '' // reset content
                        ctx.doc.switchDoc(currentFile, { force: true })
                      }
                    })
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

          // ignore system error
          if ((error as any)?.syscall) {
            return
          }

          // retry watch then other error occurred
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
