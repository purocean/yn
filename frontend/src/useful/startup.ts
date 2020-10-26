import { useStore } from 'vuex'
import { useBus } from './bus'
import RunPlugin from '@/plugins/RunPlugin'
import { copyText } from './copy-text'

export default function startup () {
  const bus = useBus()
  const store = useStore()

  RunPlugin.clearCache()

  bus.on('editor-ready', () => {
    const { currentFile } = store.state

    if (!currentFile) {
      // 当前没打开文件，直接打开 README
      store.dispatch('showHelp', 'README.md')
    }
  })

  bus.on('copy-text', copyText)
}
