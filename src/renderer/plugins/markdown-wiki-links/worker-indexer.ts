import { RULE_NAME, wikiLinks } from './lib'
import type { IndexerWorkerCtx } from '@fe/others/indexer-worker'

const ctx: IndexerWorkerCtx = self.ctx

ctx.markdown.use(md => {
  md.inline.ruler.after('link', RULE_NAME, wikiLinks)
})

ctx.registerHook('WORKER_INDEXER_BEFORE_START_WATCH', async () => {
  const enableWikiLinks = await ctx.bridgeClient.call.ctx.setting.getSetting('render.md-wiki-links', true as any)

  if (enableWikiLinks) {
    ctx.markdown.enable([RULE_NAME], true)
  } else {
    ctx.markdown.disable([RULE_NAME], true)
  }
})
