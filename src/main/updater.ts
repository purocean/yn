import { dialog, app, shell } from 'electron'
import { autoUpdater, CancellationToken, Provider } from 'electron-updater'
import logger from 'electron-log'
import ProgressBar from 'electron-progressbar'
import store from './storage'
import { GITHUB_URL } from './constant'
import { $t } from './i18n'
import { registerAction } from './action'
import config from './config'

type Source = 'github.com' | 'ghproxy.com' | 'mirror.ghproxy.com'

logger.transports.file.level = 'info'
autoUpdater.logger = logger

let progressBar: any = null

const isAppx = app.getAppPath().indexOf('\\WindowsApps\\') > -1
const disabled = isAppx || process.mas

const httpRequest = (Provider.prototype as any).httpRequest
;(Provider.prototype as any).httpRequest = function (url: URL, headers: Record<string, string>, ...args: any[]) {
  const source: Source = config.get('updater.source', 'github.com')

  if (source !== 'github.com') {
    headers['user-agent'] = 'curl/7.77.0'
    console.log('updater httpRequest', url.href)

    if (url.pathname.endsWith('.atom')) {
      url.host = 'github.com'
      url.pathname = url.pathname.replace('/https://github.com', '')
    }
  }

  return httpRequest.call(this, url, headers, ...args)
}

const setFeedURL = autoUpdater.setFeedURL
autoUpdater.setFeedURL = async function (options: any) {
  setFeedURL.call(this, options)
  const source: Source = config.get('updater.source', 'github.com')
  const provider = await (this as any).clientPromise
  Object.defineProperty(provider, 'baseUrl', {
    get () {
      return new URL(`https://${source}/`)
    }
  })
  Object.defineProperty(provider, 'basePath', {
    get () {
      const basePath = `/${this.options.owner}/${this.options.repo}/releases`

      if (source.includes('ghproxy')) {
        return `/https://github.com${basePath}`
      }

      return basePath
    },
  })
}

const init = (call: () => void) => {
  if (disabled) {
    return
  }

  autoUpdater.setFeedURL({ provider: 'github', owner: 'purocean', repo: 'yn' })
  autoUpdater.autoDownload = false

  autoUpdater.on('update-available', async info => {
    const { response } = await dialog.showMessageBox({
      cancelId: 999,
      type: 'question',
      title: $t('app.updater.found-dialog.title'),
      message: $t('app.updater.found-dialog.desc', app.getVersion(), info.version),
      buttons: [
        $t('app.updater.found-dialog.buttons.download'),
        $t('app.updater.found-dialog.buttons.view-changes'),
        $t('app.updater.found-dialog.buttons.cancel'),
        $t('app.updater.found-dialog.buttons.ignore')
      ],
    })

    if (response === 0) {
      progressBar = new ProgressBar({
        title: $t('app.updater.progress-bar.title'),
        text: `${info.version}`,
        detail: $t('app.updater.progress-bar.detail', ''),
        indeterminate: false,
        closeOnComplete: false,
        browserWindow: {
          closable: true,
          webPreferences: {
            nodeIntegration: true
          }
        }
      })

      const cancellationToken = new CancellationToken()
      autoUpdater.downloadUpdate(cancellationToken).catch(e => {
        progressBar && progressBar.close()
        if (e.message !== 'Cancelled') {
          dialog.showMessageBox({
            type: 'info',
            title: $t('app.updater.failed-dialog.title'),
            message: e.message,
          })
        }
      })

      progressBar.on('aborted', () => {
        console.log('cancel download')
        cancellationToken.cancel()
      })
    } else if (response === 1) {
      shell.openExternal(GITHUB_URL + '/releases')
    } else if (response === 3) {
      store.set('dontCheckUpdates', true)
    }
  })

  autoUpdater.on('error', e => {
    try {
      progressBar && (progressBar.detail = $t('app.updater.progress-bar.failed', e.toString()))
    } catch (error) {
      console.error(error)
    }
  })

  autoUpdater.on('download-progress', e => {
    if (progressBar) {
      progressBar.value = e.percent
      progressBar.detail = $t('app.updater.progress-bar.detail', e.percent.toFixed(2) + '%')
    }
  })

  autoUpdater.on('update-downloaded', () => {
    progressBar && progressBar.close()

    dialog.showMessageBox({
      cancelId: 999,
      type: 'question',
      title: $t('app.updater.install-dialog.title'),
      message: $t('app.updater.install-dialog.desc'),
      buttons: [
        $t('app.updater.install-dialog.buttons.install'),
        $t('app.updater.install-dialog.buttons.delay')
      ],
      defaultId: 0,
    }).then(result => {
      if (result.response === 0) {
        setTimeout(() => {
          autoUpdater.quitAndInstall()
          call()
        }, 500)
      }
    })
  })
}

export function checkForUpdates () {
  if (disabled) {
    return
  }

  store.set('dontCheckUpdates', false)
  autoUpdater.once('update-not-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: $t('app.updater.no-newer-dialog.title'),
      message: $t('app.updater.no-newer-dialog.desc'),
    })
  })

  autoUpdater.checkForUpdates()
}

export function autoCheckForUpdates () {
  if (disabled) {
    return
  }

  if (!store.get('dontCheckUpdates')) {
    autoUpdater.checkForUpdates()
  }
}

export function changeSource () {
  autoUpdater.checkForUpdates()
}

app.whenReady().then(() => {
  init(() => {
    setTimeout(() => {
      app.exit(0)
    }, process.platform === 'darwin' ? 3500 : 0)
  })

  setTimeout(() => {
    autoCheckForUpdates()
  }, 1000)
})

registerAction('updater.change-source', changeSource)
