import { convertResourceState } from './lib'
import type { IndexerWorkerCtx } from '@fe/others/indexer-worker'
import type StateCore from 'markdown-it/lib/rules_core/state_core'

const ctx: IndexerWorkerCtx = self.ctx

ctx.markdown.use(md => {
  md.core.ruler.push('convert-relative-path', (state: StateCore) => {
    const currentFile = state.env?.file
    return convertResourceState(currentFile, state)
  })

  // skip link validate
  md.validateLink = () => true
})
