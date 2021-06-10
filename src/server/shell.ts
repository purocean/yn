import * as os from 'os'
import config from './config'
import { toWslPath } from '../wsl'

const configKey = 'shell'

const CD_COMMAND_PREFIX = '--yank-note-run-command-cd--'
const defaultShell = os.platform() === 'win32' ? 'cmd.exe' : (process.env.SHELL || 'bash')

const getShell = () => {
  const shell = config.get(configKey, defaultShell)

  // 使用全路径，不然 appx 运行报找不到文件
  // TODO 这里可以使用更好的路径查找方式
  if (os.platform() === 'win32') {
    if (shell.toLocaleLowerCase() === 'cmd.exe' || shell.toLocaleLowerCase() === 'wsl.exe') {
      return `C:\\Windows\\System32\\${shell}`
    }
  }

  return shell
}

const transformCdCommand = (command: string) => {
  const path = command.replace(CD_COMMAND_PREFIX, '').trim()

  if (os.platform() !== 'win32') {
    return `cd '${path.replace(/\'/g, '\\\'')}'`
  }

  // 使用 wsl 做 shell，需要先转换路径
  if (getShell().indexOf('wsl.exe') > -1) {
    return `cd '${toWslPath(path).replace(/\'/g, '\\\'')}'`
  }

  // windows 下的切换目录
  return `cd /d "${path}"`
}

export default {
  CD_COMMAND_PREFIX,
  getShell,
  transformCdCommand,
}
