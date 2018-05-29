const execFileSync = require("child_process").execFileSync;

const runCode = (language, code) => {
    try {
        switch (language) {
            case 'php':
                return execFileSync('php', ['-r', code]).toString()
            case 'python':
                return execFileSync('python', ['-c', code]).toString()
            case 'py':
                return execFileSync('python', ['-c', code]).toString()
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
