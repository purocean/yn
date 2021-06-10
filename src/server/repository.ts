import * as path from 'path'
import config from './config'
import { TRASH_DIR } from '../constant'
import { isWsl, toWslPath } from '../wsl'

const configKey = 'repositories'

const defaultVal = {}

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
    p = /^[a-zA-Z]:/.test(p) ? toWslPath(p) : p
  }

  return path.isAbsolute(p) ? p : path.resolve(p)
}

const getTrashPath = (name: string) => {
  return path.join(TRASH_DIR, name)
}

export default {
  list,
  getPath,
  getTrashPath,
}
