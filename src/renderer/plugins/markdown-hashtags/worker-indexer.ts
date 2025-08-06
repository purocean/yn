import { hashTags, RULE_NAME } from './lib'
import type { IndexerWorkerCtx } from '@fe/others/indexer-worker'

const ctx: IndexerWorkerCtx = self.ctx

ctx.markdown.use(md => {
  md.inline.ruler.push(RULE_NAME, hashTags)
})

ctx.registerHook('WORKER_INDEXER_BEFORE_START_WATCH', async () => {
  const enableHashTags = await ctx.bridgeClient.call.ctx.setting.getSetting('render.md-hash-tags', true as any)

  if (enableHashTags) {
    ctx.markdown.enable([RULE_NAME], true)
  } else {
    ctx.markdown.disable([RULE_NAME], true)
  }
})
