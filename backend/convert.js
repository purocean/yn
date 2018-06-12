const os = require('os')
const fs = require('fs')
const spawn = require("child_process").spawn

const convert = async (html, type) => {
    try {
        const path = os.tmpdir() + `/yn_convert_${new Date().getTime()}.${type}`

        return new Promise((resolve, reject) => {
            const process = spawn('pandoc', ['-f', 'html', '-o', path])

            process.on('close', (code) => {
                try {
                    const data = fs.readFileSync(path)
                    fs.unlinkSync(path)
                    resolve(data)
                } catch (error) {
                    reject(error)
                }
            })

            process.stdin.write(html)
            process.stdin.end()
        })
    } catch (e) {
        return e.message
    }
}

module.exports = convert
