import type { RequestOptions } from 'http'
import { dialog, app, shell } from 'electron'
import { autoUpdater, CancellationToken, UpdateInfo } from 'electron-updater'
import { resolveFiles } from 'electron-updater/out/providers/Provider'
import { GitHubProvider } from 'electron-updater/out/providers/GitHubProvider'
import logger from 'electron-log'
import ProgressBar from 'electron-progressbar'
import { HOMEPAGE_URL } from '../share/misc'
import store from './storage'
import { GITHUB_URL } from './constant'
import { $t } from './i18n'
import { registerAction } from './action'
import config from './config'

type Source = 'auto' | 'github' | 'yank-note'

logger.transports.file.level = 'info'
autoUpdater.logger = logger

let progressBar: any = null

const isAppx = app.getAppPath().indexOf('\\WindowsApps\\') > -1
const disabled = isAppx || (process as any).mas

class UpdateProvider extends GitHubProvider {
  constructor (options: any, updater: any, runtimeOptions: any) {
    super(options, updater, runtimeOptions)

    const request = this.executor.request.bind(this.executor)
    this.executor.request = (options: RequestOptions, ...args: any[]) => {
      if (!this.isGithub()) {
        const _url = new URL(HOMEPAGE_URL)
        if (options.path === '/purocean/yn/releases.atom') {
          options.hostname = _url.hostname
          options.path = '/api/update-info/releases.atom'
        } else if (options.path === '/purocean/yn/releases/latest') {
          options.hostname = _url.hostname
          options.path = '/api/update-info/latest'
        } else if (options.path?.startsWith('/purocean/yn/releases/download')) {
          options.hostname = _url.hostname
          options.path = options.path.replace(/\/purocean\/yn\/releases\/download\/v[^/]+\//, '/download/')
        }

        console.log('request', options.protocol + '//' + options.hostname + options.path)
      }

      return request(options, ...args)
    }
  }

  private getSource (): Exclude<Source, 'auto'> {
    let source: Source = config.get('updater.source', 'auto')

    if (source !== 'github' && source !== 'yank-note') {
      source = 'auto'
    }

    if (source === 'auto') {
      if (app.getLocale().toLowerCase().includes('zh')) {
        source = 'yank-note'
      } else {
        source = 'github'
      }
    }

    return source
  }

  private isGithub () {
    return this.getSource() === 'github'
  }

  resolveFiles (updateInfo: UpdateInfo): ReturnType<GitHubProvider['resolveFiles']> {
    if (this.isGithub()) {
      return super.resolveFiles(updateInfo as any)
    }

    const baseUrl = new URL(HOMEPAGE_URL)

    // still replace space to - due to backward compatibility
    return resolveFiles(updateInfo, baseUrl, p => '/download/' + p.replace(/ /g, '-'))
  }
}

const init = (call?: () => void) => {
  if (disabled) {
    return
  }

  autoUpdater.setFeedURL({ provider: 'custom', owner: 'purocean', repo: 'yn', updateProvider: UpdateProvider as any })
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
        $t('app.updater.found-dialog.buttons.download-and-view-changes'),
        $t('app.updater.found-dialog.buttons.cancel'),
        $t('app.updater.found-dialog.buttons.ignore')
      ],
    })

    if (response === 0 || response === 2) {
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
    }

    if (response === 1 || response === 2) {
      shell.openExternal(GITHUB_URL + '/releases')
    }

    if (response === 4) {
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
          call?.()
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
    }, process.platform === 'darwin' ? 8000 : 0)
  })

  setTimeout(() => {
    autoCheckForUpdates()
  }, 1000)
})

registerAction('updater.change-source', changeSource)
