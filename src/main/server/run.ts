import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import * as cp from 'child_process'
import config from '../config'
import { mergeStreams } from '../helper'

const isWin = os.platform() === 'win32'

function execFile (file: string, args: string[], options?: cp.ExecFileOptions) {
  return new Promise<string | NodeJS.ReadableStream>((resolve) => {
    const process = cp.execFile(file, args, { timeout: 300 * 1000, ...options })

    process.on('error', error => {
      resolve(error.message)
    })

    process.on('spawn', () => {
      const output = [process.stdout, process.stderr].filter(Boolean) as NodeJS.ReadableStream[]
      resolve(mergeStreams(output))
    })
  })
}

function execCmd (cmd: string, options?: cp.ExecOptions) {
  const process = cp.exec(cmd, { timeout: 300 * 1000, ...options })
  const output = [process.stdout, process.stderr].filter(Boolean) as NodeJS.ReadableStream[]
  return mergeStreams(output)
}

const runCode = async (cmd: { cmd: string, args: string[] } | string, code: string): Promise<string | NodeJS.ReadableStream> => {
  try {
    const env = { ...process.env }
    const useWsl = isWin && config.get('runCodeUseWsl', false)

    if (typeof cmd === 'string') {
      const useTplFile = cmd.includes('$tmpFile')
      if (useTplFile) {
        const extMatch = cmd.match(/\$tmpFile(\.[a-zA-Z0-9]+)/)
        const ext = extMatch ? extMatch[1] : ''
        const tmpFileWithoutExt = path.join(os.tmpdir(), `${Math.random().toString(36).substring(2, 5)}`)
        const tmpFile = tmpFileWithoutExt + ext
        await fs.writeFile(tmpFile, code)
        try {
          return execCmd(cmd.replaceAll('$tmpFile', tmpFileWithoutExt), { env })
        } catch (error) {
          await fs.remove(tmpFile)
          throw error
        }
      } else {
        return execCmd(cmd, { env })
      }
    } else {
      if (useWsl) {
        return execFile('wsl.exe', ['--', cmd.cmd].concat(cmd.args).concat([code]))
      }

      if (!isWin) {
        const extPath = '/usr/local/bin'
        if (env.PATH && env.PATH.indexOf(extPath) < 0) {
          env.PATH = `${extPath}:${env.PATH}`
        }
      }

      return execFile(
        cmd.cmd,
        cmd.args.concat([code]),
        { env }
      )
    }
  } catch (e: any) {
    return e.message
  }
}

export default {
  runCode
}
