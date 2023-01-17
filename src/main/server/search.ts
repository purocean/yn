import os from 'os'
import { CancellationTokenSource, ITextQuery, TextSearchEngineAdapter } from 'ripgrep-wrapper'
import { rgPath } from '@vscode/ripgrep'
import { BIN_DIR } from '../constant'
import { convertAppPath, createStreamResponse } from '../helper'

let rgDiskPath: string
if (os.platform() === 'darwin') {
  rgDiskPath = BIN_DIR + '/rg-darwin-' + os.arch()
} else {
  rgDiskPath = convertAppPath(rgPath)
}

export async function search (query: ITextQuery) {
  const cts = new CancellationTokenSource()
  const cancel = () => {
    cts.cancel()
  }

  const { close, enqueue, response } = createStreamResponse(() => cts.token.isCancellationRequested)

  const adapter = new TextSearchEngineAdapter(rgDiskPath, query)

  adapter.search(cts.token, (res) => {
    enqueue('result', res)
  }, message => {
    enqueue('message', message)
  }).then((success) => {
    enqueue('done', success)
    enqueue('null', null)
    close()
  }, (err) => {
    enqueue('error', err)
    enqueue('null', null)
    close()
  })

  response.once('close', cancel)
  response.once('error', cancel)

  return response
}
