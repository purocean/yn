import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { execFileSync } from 'child_process'
import * as wsl from './wsl'

const isWsl = wsl.isWsl

const runCode = (language: string, code: string) => {
    try {
        switch (language) {
            case 'bat':
                const fileName = 'yn-run-cmd.bat'
                code = code.split('\n').slice(1).join('\n') // 去掉第一行的注释
                if (isWsl) {
                    const tmpFile = path.join(wsl.toWslPath(wsl.getWinTempPath()), fileName)
                    fs.writeFileSync(tmpFile, code)
                    return execFileSync('cmd.exe', ['/c', `${wsl.toWinPath(tmpFile).replace('\\', '/')}`]).toString()
                } else {
                    const tmpFile = path.join(os.tmpdir(), fileName)
                    fs.writeFileSync(tmpFile, code)
                    return execFileSync('cmd', ['/c', tmpFile]).toString()
                }
            case 'bash':
                return execFileSync('bash', ['-c', code]).toString()
            case 'php':
                return execFileSync('php', ['-r', code]).toString()
            case 'python':
                return execFileSync('python3', ['-c', code]).toString()
            case 'py':
                return execFileSync('python3', ['-c', code]).toString()
            case 'js':
                return execFileSync('node', ['-e', code]).toString()
            default:
                return `不支持 ${language} 语言`
        }
    } catch (e) {
        return e.message
    }
}

export default {
  runCode
}
