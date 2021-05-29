import { dialog, app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { CancellationToken } from 'builder-util-runtime'
const ProgressBar = require('electron-progressbar')
const Store = require('electron-store')
const opn = require('opn')
import logger from 'electron-log'

logger.transports.file.level = 'info'
autoUpdater.logger = logger

const store = new Store()

let progressBar: any = null
let cancellationToken: CancellationToken = null

// 否是从微软应用商店安装，简单的判断路径中是否包含 WindowsApps
const isAppx = app.getAppPath().indexOf('\\WindowsApps\\') > -1

const init = (call: () => void) => {
  if (isAppx) {
    return
  }

  autoUpdater.setFeedURL({ provider: 'github', owner: 'purocean', repo: 'yn'})
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
        browserWindow: {
          closable: true,
          webPreferences: {
            nodeIntegration: true
          }
        }
      })

      cancellationToken = new CancellationToken()
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
      opn('https://github.com/purocean/yn#%E6%9B%B4%E6%96%B0%E6%97%A5%E5%BF%97')
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
        setImmediate(() => {
          autoUpdater.quitAndInstall()
          call()
        })
      }
    })
  })
}

const checkForUpdates = () => {
  if (isAppx) {
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

const autoCheckForUpdates = () => {
  if (isAppx) {
    return
  }

  if (!store.get('dontCheckUpdates')) {
    autoUpdater.checkForUpdates()
  }
}

export {
  init,
  checkForUpdates,
  autoCheckForUpdates
}
