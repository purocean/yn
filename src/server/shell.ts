import config from './config'
import * as os from 'os'

const configKey = 'shell'

const defaultVal = os.platform() === 'win32' ? 'cmd.exe' : 'bash'

const getShell = () => {
  return config.get(configKey, defaultVal)
}

export default {
  getShell,
}
