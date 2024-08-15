import type { IndexerWorkerCtx } from '@fe/others/indexer-worker'
import { processFrontMatter, useMarkdownItRule } from './lib'

const ctx: IndexerWorkerCtx = self.ctx

ctx.markdown.use(md => {
  const parse = md.parse
  md.parse = (src: string, env: any) => {
    processFrontMatter(src, env)
    return parse.call(md, src, env)
  }

  useMarkdownItRule(md)
})
