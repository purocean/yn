import * as path from 'path'
import * as fs from 'fs-extra'
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

  p = path.isAbsolute(p) ? p : path.resolve(p)

  if (!fs.pathExistsSync(p)) {
    return null
  }

  return p
}

export default {
  list,
  getPath,
}
