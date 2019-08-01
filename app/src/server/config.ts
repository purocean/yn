import * as fs from 'fs'
import { CONFIG_FILE } from './constant'

const configFile = CONFIG_FILE

const writeJson = (data: any) => {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 4), 'utf8')
}

const readJson = () => {
  try {
    const data = fs.readFileSync(configFile)
    return JSON.parse(data.toString())
  } catch (error) {
    return null
  }
}

const set = (key: string, value: any) => {
  const config = readJson() || {}
  config[key] = value
  writeJson(config)
}

const get = (key: string, defaultVal: any = null) => {
  const config = readJson() || {}

  if (config[key] === undefined) {
    set(key, defaultVal) // 写入默认值到配置文件
    return defaultVal
  }

  return config[key]
}

export default {
  set,
  get
}
