import * as fs from 'fs-extra'
import { CONFIG_FILE } from './constant'

const configFile = CONFIG_FILE

const writeJson = (data: any) => {
  fs.ensureFileSync(configFile)
  fs.writeJsonSync(configFile, data, { spaces: 4 })
}

const readJson = () => {
  try {
    return fs.readJSONSync(configFile)
  } catch (error) {
    console.error(error)
    return null
  }
}

let cache: any = null
let readAt = 0
const getAll = () => {
  if (Date.now() - readAt > 1000) {
    cache = null
  }

  if (!cache) {
    cache = readJson() || {}
    readAt = Date.now()
  }

  return cache
}

const setAll = (data: any) => {
  cache = null
  writeJson(data)
}

const set = (key: string, value: any) => {
  const config = getAll()
  config[key] = value
  setAll(config)
}

const get = (key: string, defaultVal: any = null) => {
  const config = getAll()

  if (config[key] === undefined) {
    set(key, defaultVal) // write default value to config file.
    return defaultVal
  }

  return config[key]
}

export default {
  set,
  get,
  getAll,
  setAll
}
