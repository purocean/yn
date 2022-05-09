import { registerAction } from './action'
import config from './config'
import yaml from 'yaml'
import os from 'os'

const keyEnvs = 'envs'
const isWin = os.platform() === 'win32'
const OLD_ENVS = { ...process.env }

export function initEnvs () {
  process.env = OLD_ENVS
  const envsStr = config.get(keyEnvs, '')
  console.log('envs:', envsStr)

  let envs: Record<string, any>
  try {
    envs = yaml.parse(envsStr)
    if (!envs || typeof envs !== 'object') {
      return
    }
  } catch (error) {
    console.error('parse envs error:', error)
    return
  }

  const sep = isWin ? ';' : ':'

  Object.keys(envs).forEach(key => {
    if (key.toUpperCase() === 'PATH') {
      const path = Array.isArray(envs[key])
        ? envs[key]
        : (typeof envs[key] === 'string' ? envs[key].split(sep) : [])

      const paths = Array.from(new Set([
        ...path,
        ...((process.env[key] || '').split(sep)),
        ...(isWin ? [] : ['/usr/local/bin']),
      ]))

      process.env.PATH = paths.join(sep)
    } else {
      process.env[key] = envs[key]
    }
  })
}

registerAction('envs.reload', initEnvs)
