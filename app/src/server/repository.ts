import * as path from 'path'
import config from './config'
import { MAIN_REPO_DIR, TRASH_DIR } from './constant'
import { isWsl, toWslPath, toWinPath } from './wsl'

const configKey = 'repositories'

// windows 上不管是不是 wsl 环境都使用 windows 风格的路径配置
const defaultVal = { main: isWsl ? toWinPath(MAIN_REPO_DIR) : MAIN_REPO_DIR }

const list = () => {
  return config.get(configKey, defaultVal)
}

const getPath = (name: string) => {
  let p = config.get(configKey, defaultVal)[name] || ''
  p = p.trim()

  if (!p) {
    return null
  }

  if (isWsl) {
    return /^[a-zA-Z]:/.test(p) ? toWslPath(p) : path.join(MAIN_REPO_DIR, p)
  }

  return path.isAbsolute(p) ? p : path.join(MAIN_REPO_DIR, p)
}

const getTrashPath = (name: string) => {
  return path.join(TRASH_DIR, name)
}

export default {
  list,
  getPath,
  getTrashPath,
}
