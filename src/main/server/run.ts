import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import * as cp from 'child_process'
import * as wsl from '../wsl'
import config from '../config'

const isWsl = wsl.isWsl
const isWin = os.platform() === 'win32'

async function execFile (file: string, args: string[], options?: cp.ExecFileOptions) {
  return new Promise<string>((resolve) => {
    let result = ''
    // default 300 seconds timeout.
    const process = cp.execFile(file, args, { timeout: 300 * 1000, ...options })
    process.stdout?.on('data', data => { result += data })
    process.stderr?.on('data', data => { result += data })
    process.on('close', () => {
      resolve(result)
    })
  })
}

const runCode = async (language: string, code: string): Promise<string> => {
  try {
    const languageMap = {
      sh: { cmd: 'sh', args: ['-c'] },
      shell: { cmd: 'sh', args: ['-c'] },
      bash: { cmd: 'bash', args: ['-c'] },
      php: { cmd: 'php', args: ['-r'] },
      python: { cmd: 'python3', args: ['-c'] },
      py: { cmd: 'python3', args: ['-c'] },
      js: { cmd: 'node', args: ['-e'] },
      node: { cmd: 'node', args: ['-e'] },
    } as {[key: string]: {cmd: string; args: string[]}}

    if (language === 'bat' && isWin) {
      const fileName = 'yn-run-cmd.bat'
      code = code.split('\n').slice(1).join('\n') // remove first comment.
      if (isWsl) {
        const tmpFile = path.join(wsl.toWslPath(wsl.getWinTempPath()), fileName)
        await fs.writeFile(tmpFile, code)
        return execFile('cmd.exe', ['/c', `${wsl.toWinPath(tmpFile).replace(/\\/g, '/')}`])
      } else {
        const tmpFile = path.join(os.tmpdir(), fileName)
        await fs.writeFile(tmpFile, code)
        return execFile('cmd', ['/c', tmpFile])
      }
    }

    const runParams = languageMap[language]
    if (!runParams) {
      return `Not support ${language}.`
    }

    const useWsl = isWin && config.get('runCodeUseWsl', false)
    if (useWsl) {
      return execFile('wsl.exe', ['--', runParams.cmd].concat(runParams.args).concat([code]))
    }

    const env = { ...process.env }
    const extPath = '/usr/local/bin'
    if (!isWin && env.PATH && env.PATH.indexOf(extPath) < 0) {
      env.PATH = `${extPath}:${env.PATH}`
    }

    return execFile(
      runParams.cmd,
      runParams.args.concat([code]),
      { env }
    )
  } catch (e: any) {
    return e.message
  }
}

export default {
  runCode
}
