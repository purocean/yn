import { dialog, app } from 'electron'
import { autoUpdater, CancellationToken } from 'electron-updater'
import logger from 'electron-log'
import ProgressBar from 'electron-progressbar'
import opn from 'opn'
import store from './storage'
import { GITHUB_URL } from './constant'

logger.transports.file.level = 'info'
autoUpdater.logger = logger

let progressBar: any = null

// 否是从微软应用商店安装，简单的判断路径中是否包含 WindowsApps
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
      buttons: ['下载更新', '查看更新内容', '取消', '不再提醒'],
      title: 'Yank Note 发现新版本',
      message: `当前版本 ${app.getVersion()}\n最新版本：${info.version}`
    })

    if (response === 0) {
      progressBar = new ProgressBar({
        title: 'Yank Note 下载更新',
        text: `${info.version}`,
        detail: '正在下载新版本 ',
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
            title: 'Yank Note 出现一点错误',
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
      progressBar && (progressBar.detail = '下载失败： ' + e)
    } catch (error) {
      console.error(error)
    }
  })

  autoUpdater.on('download-progress', e => {
    if (progressBar) {
      progressBar.value = e.percent
      progressBar.detail = '下载中…… ' + e.percent.toFixed(2) + '%'
    }
  })

  autoUpdater.on('update-downloaded', () => {
    progressBar && progressBar.close()

    dialog.showMessageBox({
      cancelId: 999,
      type: 'question',
      title: 'Yank Note 下载完成',
      buttons: ['立即安装', '推迟'],
      defaultId: 0,
      message: '新版本下载完成，是否要立即安装？'
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
      title: 'Yank Note 无新版本',
      message: '当前已经是最新版本',
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
    // 立即升级，退出程序
    setTimeout(() => {
      app.exit(0)
    }, process.platform === 'darwin' ? 3500 : 0)
  })

  setTimeout(() => {
    autoCheckForUpdates()
  }, 1000)
})
