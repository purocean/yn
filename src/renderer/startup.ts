import { Fragment, h } from 'vue'
import { init } from '@fe/core/plugin'
import { getActionHandler } from '@fe/core/action'
import { registerHook, triggerHook } from '@fe/core/hook'
import store from '@fe/support/store'
import { isElectron, isWindows } from '@fe/support/env'
import { useToast } from './support/ui/toast'
import { useModal } from '@fe/support/ui/modal'
import type { BuildInSettings, Doc, FrontMatterAttrs, PathItem } from '@fe/types'
import { reloadMainWindow } from '@fe/services/base'
import { createDoc, isMarkdownFile, isMarked, markDoc, switchDoc, toUri, unmarkDoc } from '@fe/services/document'
import { DEFAULT_MARKDOWN_EDITOR_NAME, whenEditorReady } from '@fe/services/editor'
import { getLanguage, setLanguage, t } from '@fe/services/i18n'
import { fetchSettings } from '@fe/services/setting'
import { getPurchased } from '@fe/others/premium'
import * as extension from '@fe/others/extension'
import { setTheme } from '@fe/services/theme'
import { toggleOutline } from '@fe/services/workbench'
import * as view from '@fe/services/view'
import * as tree from '@fe/services/tree'
import * as editor from '@fe/services/editor'
import * as indexer from '@fe/services/indexer'
import * as repo from '@fe/services/repo'
import plugins from '@fe/plugins'
import ctx from '@fe/context'
import ga from '@fe/support/ga'
import * as jsonrpc from '@fe/support/jsonrpc'
import { getLogger, sleep } from '@fe/utils'
import { removeOldDatabases } from './others/db'

const logger = getLogger('startup')

init(plugins, ctx)

export default function startup () {
  triggerHook('STARTUP')
}

function changeLanguage ({ settings }: { settings: Partial<BuildInSettings> }) {
  if (settings.language && settings.language !== getLanguage()) {
    setLanguage(settings.language)
  }
}

function syncDomPremiumFlag () {
  document.documentElement.setAttribute('premium', String(getPurchased()))
}

function switchDefaultPreviewer () {
  const attributes: FrontMatterAttrs | undefined = view.getRenderEnv()?.attributes
  if (attributes?.defaultPreviewer && typeof attributes.defaultPreviewer === 'string') {
    view.switchPreviewer(attributes.defaultPreviewer)
  } else {
    view.switchPreviewer('default')
  }
}

async function reWatchFsOnWindows ({ doc }: { doc: PathItem & { type?: Doc['type'] }}) {
  // fix parent folder rename / delete on Windows https://github.com/paulmillr/chokidar/issues/664
  if (isWindows && doc.type === 'dir') {
    indexer.stopWatch()
    await sleep(50)
    setTimeout(() => {
      indexer.triggerWatchCurrentRepo()
    }, 500)
  }
}

let autoRefreshedAt = 0
const refreshTree = async () => {
  await tree.refreshTree()
  autoRefreshedAt = Date.now()
}

registerHook('STARTUP', syncDomPremiumFlag)
registerHook('PREMIUM_STATUS_CHANGED', syncDomPremiumFlag)
registerHook('I18N_CHANGE_LANGUAGE', view.refresh)
registerHook('SETTING_FETCHED', changeLanguage)
registerHook('SETTING_BEFORE_WRITE', changeLanguage)
registerHook('DOC_CREATED', refreshTree)
registerHook('DOC_DELETED', refreshTree)
registerHook('DOC_MOVED', refreshTree)
registerHook('DOC_SWITCH_FAILED', refreshTree)
registerHook('DOC_BEFORE_DELETE', reWatchFsOnWindows)
registerHook('DOC_BEFORE_MOVE', reWatchFsOnWindows)

registerHook('INDEXER_FS_CHANGE', async () => {
  if (Date.now() - autoRefreshedAt > 3000) {
    await refreshTree()
    autoRefreshedAt = 0
  }
})

registerHook('DOC_SWITCH_FAILED', async (payload?: { doc?: Doc | null, message: string }) => {
  if (payload && payload.doc && payload.message?.includes('NOENT')) {
    unmarkDoc(payload.doc)

    // wait toast show then hide
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    useToast().hide()

    useModal().confirm({
      title: t('document.switch-noent-dialog.title'),
      content: t('document.switch-noent-dialog.content', payload.doc.path),
    }).then(async v => {
      getActionHandler('file-tabs.close-tabs')([toUri(payload.doc)])
      v && await createDoc(payload.doc!)
    })
  }
})

registerHook('DOC_MOVED', async ({ oldDoc, newDoc }) => {
  if (isMarked(oldDoc)) {
    await unmarkDoc(oldDoc)
    await markDoc(newDoc)
    await refreshTree()
  }
})

registerHook('SETTING_FETCHED', () => {
  if (!getPurchased(true)) {
    whenEditorReady().then(() => {
      setTheme('light')
    })
  }

  setTimeout(() => {
    // reset current repo to change repo setting
    repo.setCurrentRepo(store.state.currentRepo?.name)
  }, 0)
})

registerHook('SETTING_CHANGED', ({ schema, changedKeys }) => {
  if (changedKeys.some(key => key.startsWith('render.'))) {
    view.render()
  }

  if (changedKeys.some(key => schema.properties[key]?.needReloadWindowWhenChanged)) {
    useModal().confirm({
      title: t('change-setting-reload-main-widow-dialog.title'),
      content: t('change-setting-reload-main-widow-dialog.desc'),
    }).then(v => {
      if (v) {
        reloadMainWindow()
      }
    })
  }

  if (changedKeys.includes('tree.exclude')) {
    refreshTree()
    setTimeout(() => {
      indexer.triggerWatchCurrentRepo()
    }, 500)
  }
})

registerHook('EXTENSION_READY', () => {
  view.render()
})

registerHook('VIEW_PREVIEWER_CHANGE', ({ type }) => {
  if (type !== 'switch') {
    setTimeout(() => switchDefaultPreviewer(), 500)
  }
})

registerHook('VIEW_FILE_CHANGE', () => {
  registerHook('VIEW_RENDER', switchDefaultPreviewer, true)
})

registerHook('VIEW_BEFORE_REFRESH', async () => {
  if (store.state.currentFile) {
    logger.debug('force reload document')
    const { type, name, path, repo } = store.state.currentFile
    await switchDoc({ type, name, path, repo }, { force: true })
  }
})

registerHook('DOC_PRE_ENSURE_CURRENT_FILE_SAVED', async () => {
  // check custom editor is dirty
  if (store.state.currentFile && !editor.isDefault() && (await editor.isDirty())) {
    const confirm = await useModal().confirm({
      title: t('save-check-dialog.title'),
      content: t('save-check-dialog.desc'),
      action: h(Fragment, [
        h('button', {
          onClick: () => useModal().ok()
        }, t('discard')),
        h('button', {
          onClick: () => useModal().cancel()
        }, t('cancel')),
      ])
    })

    if (confirm) {
      logger.warn('discard save')
    } else {
      throw new Error('Current Editor is dirty')
    }
  }
})

editor.registerCustomEditor({
  name: DEFAULT_MARKDOWN_EDITOR_NAME,
  displayName: t('editor.default-editor'),
  component: null,
  when ({ doc }) {
    return !!(doc && isMarkdownFile(doc))
  }
})

store.watch(() => store.state.currentRepo, (val) => {
  toggleOutline(false)
  document.documentElement.setAttribute('repo-name', val?.name || '')
  setTimeout(() => {
    indexer.triggerWatchCurrentRepo()
  }, 1000)
}, { immediate: true })

store.watch(() => store.state.currentFile, (val) => {
  const setAttrs = (document: Document) => {
    document.documentElement.setAttribute('current-file-repo', val?.repo || '')
    document.documentElement.setAttribute('current-file-name', val?.name || '')
    document.documentElement.setAttribute('current-file-path', val?.path || '')
    document.documentElement.setAttribute('electron', String(isElectron))
  }

  view.getRenderIframe().then(iframe => {
    setAttrs(document)
    setAttrs(iframe.contentDocument!)
  })
}, { immediate: true })

store.watch(() => [
  store.state.wordWrap,
  store.state.typewriterMode,
  store.state.showSide,
  store.state.showView,
  store.state.showEditor,
  store.state.editorPreviewExclusive,
  store.state.showXterm,
  store.state.showOutline,
  store.state.autoPreview,
  store.state.syncScroll,
  store.state.currentRepo,
  store.state.editor,
  store.state.previewer,
], () => {
  ctx.workbench.ControlCenter.refresh()
  ctx.statusBar.refreshMenu()
})

fetchSettings()

whenEditorReady().then(() => {
  setTimeout(extension.init, 0)
})

// json-rpc

jsonrpc.init({ ctx }, whenEditorReady())

setTimeout(() => {
  removeOldDatabases()
}, 20000)

// google analytics

registerHook('DOC_SWITCHED', () => {
  setTimeout(() => {
    ga.logEvent('yn_doc_switched')
  }, 0)
})

ga.logEvent('page_view', {
  page_title: '--STARTUP--',
  page_location: window.location.href,
  page_path: window.location.pathname,
})
