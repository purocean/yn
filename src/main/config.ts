import * as fs from 'fs'
import { CONFIG_FILE } from './constant'

const configFile = CONFIG_FILE

const writeJson = (data: any) => {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 4), 'utf8')
}

const readJson = () => {
  if (fs.existsSync(configFile)) {
    const data = fs.readFileSync(configFile)
    return JSON.parse(data.toString())
  } else {
    return null
  }
}

const getAll = () => readJson() || {}

const setAll = (data: any) => {
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
