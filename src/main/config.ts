import * as fs from 'fs-extra'
import cloneDeep from 'lodash/cloneDeep'
import { CONFIG_FILE } from './constant'
import store from './storage'

const configFile = CONFIG_FILE

const writeJson = (data: any) => {
  if (!data) return

  data = cloneDeep(data)
  // save license to store
  if (data.license) {
    store.set('license', data.license)
  } else {
    store.delete('license')
  }

  delete data.license
  fs.ensureFileSync(configFile)
  fs.writeJsonSync(configFile, data, { spaces: 2 })
}

const readJson = () => {
  try {
    const result = fs.readJSONSync(configFile)

    // get license from store
    const license = store.get('license', '')
    result.license = license || result.license || ''

    return result
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
