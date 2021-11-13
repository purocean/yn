import { dialog, app } from 'electron'
import { autoUpdater, CancellationToken } from 'electron-updater'
import logger from 'electron-log'
import ProgressBar from 'electron-progressbar'
import opn from 'opn'
import store from './storage'
import { GITHUB_URL } from './constant'
import { $t } from './i18n'

logger.transports.file.level = 'info'
autoUpdater.logger = logger

let progressBar: any = null

const isAppx = app.getAppPath().indexOf('\\WindowsApps\\') > -1
const disabled = isAppx || process.mas

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
        detail: $t('app.updater.progress-bar.detail'),
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
      opn(GITHUB_URL + '/releases')
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
