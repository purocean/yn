import { init } from '@fe/core/plugin'
import { getActionHandler } from '@fe/core/action'
import { registerHook, triggerHook } from '@fe/core/hook'
import store from '@fe/support/store'
import { isElectron } from '@fe/support/env'
import { useToast } from './support/ui/toast'
import { useModal } from '@fe/support/ui/modal'
import * as storage from '@fe/utils/storage'
import { basename } from '@fe/utils/path'
import type { BuildInSettings, Doc, FrontMatterAttrs, Repo } from '@fe/types'
import { reloadMainWindow } from '@fe/services/base'
import { createDoc, isMarked, markDoc, switchDoc, toUri, unmarkDoc } from '@fe/services/document'
import { refreshTree } from '@fe/services/tree'
import { whenEditorReady } from '@fe/services/editor'
import { getLanguage, setLanguage, t } from '@fe/services/i18n'
import { fetchSettings } from '@fe/services/setting'
import { getPurchased } from '@fe/others/premium'
import * as extension from '@fe/others/extension'
import { setTheme } from '@fe/services/theme'
import { toggleOutline } from '@fe/services/workbench'
import * as view from '@fe/services/view'
import plugins from '@fe/plugins'
import ctx from '@fe/context'
import ga from '@fe/support/ga'

init(plugins, ctx)

function getLastOpenFile (repoName?: string): Doc | null {
  const currentFile = storage.get<Doc>('currentFile')
  const recentOpenTime = storage.get('recentOpenTime', {}) as {[key: string]: number}

  repoName ??= storage.get<Repo>('currentRepo')?.name

  if (!repoName) {
    return null
  }

  if (currentFile && currentFile.repo === repoName) {
    return currentFile
  }

  const item = Object.entries(recentOpenTime)
    .filter(x => x[0].startsWith(repoName + '|'))
    .sort((a, b) => b[1] - a[1])[0]

  if (!item) {
    return null
  }

  const path = item[0].split('|', 2)[1]
  if (!path) {
    return null
  }

  return { type: 'file', repo: repoName, name: basename(path), path }
}

export default function startup () {
  triggerHook('STARTUP')
}

const doc = getLastOpenFile()
switchDoc(doc)

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

registerHook('STARTUP', syncDomPremiumFlag)
registerHook('PREMIUM_STATUS_CHANGED', syncDomPremiumFlag)
registerHook('I18N_CHANGE_LANGUAGE', view.refresh)
registerHook('SETTING_FETCHED', changeLanguage)
registerHook('SETTING_BEFORE_WRITE', changeLanguage)
registerHook('DOC_CREATED', refreshTree)
registerHook('DOC_DELETED', refreshTree)
registerHook('DOC_MOVED', refreshTree)
registerHook('DOC_SWITCH_FAILED', refreshTree)
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

store.watch(() => store.state.currentRepo, (val) => {
  toggleOutline(false)
  document.documentElement.setAttribute('repo-name', val?.name || '')
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

fetchSettings()

whenEditorReady().then(() => {
  setTimeout(extension.init, 0)
})

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
