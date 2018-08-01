const fs = require('fs')
const os = require('os');
const path = require('path')
const isWsl = require('is-wsl')
const execFileSync = require("child_process").execFileSync
const wsl = require('./wsl')

const runCode = (language, code) => {
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

module.exports = { runCode }
