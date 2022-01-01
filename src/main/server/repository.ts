import * as path from 'path'
import config from '../config'
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

export default {
  list,
  getPath,
}
