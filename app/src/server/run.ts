import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { execFileSync } from 'child_process'
import * as wsl from './wsl'
import config from './config'

const isWsl = wsl.isWsl

const runCode = (language: string, code: string) => {
  try {
    const languageMap = {
      bash: { cmd: 'bash', args: ['-c'] },
      php: { cmd: 'php', args: ['-r'] },
      python: { cmd: 'python3', args: ['-c'] },
      py: { cmd: 'python3', args: ['-c'] },
      js: { cmd: 'node', args: ['-e'] },
    } as {[key: string]: {cmd: string, args: string[]}}

    if (language === 'bat') {
      const fileName = 'yn-run-cmd.bat'
      code = code.split('\n').slice(1).join('\n') // 去掉第一行的注释
      if (isWsl) {
        const tmpFile = path.join(wsl.toWslPath(wsl.getWinTempPath()), fileName)
        fs.writeFileSync(tmpFile, code)
        return execFileSync('cmd.exe', ['/c', `${wsl.toWinPath(tmpFile).replace(/\\/g, '/')}`]).toString()
      } else {
        const tmpFile = path.join(os.tmpdir(), fileName)
        fs.writeFileSync(tmpFile, code)
        return execFileSync('cmd', ['/c', tmpFile]).toString()
      }
    }

    const runParams = languageMap[language]
    if (!runParams) {
      return `不支持 ${language} 语言`
    }

    const useWsl = os.platform() === 'win32' && config.get('runCodeUseWsl', false)
    if (useWsl) {
      return execFileSync('wsl.exe', ['--', runParams.cmd].concat(runParams.args).concat([code])).toString()
    }

    return execFileSync(runParams.cmd, runParams.args.concat([code])).toString()
  } catch (e) {
    return e.message
  }
}

export default {
  runCode
}
