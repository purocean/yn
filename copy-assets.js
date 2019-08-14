const os = require('os')
const path = require('path')
const fs = require('fs-extra')

const assetsPath = path.join(__dirname, 'dist/assets')
try {
  fs.unlinkSync(assetsPath)
} catch {
}

fs.copySync(path.join(__dirname, 'src/assets'), assetsPath)

// 复制 markdown，处理相对路径
const md = fs.readFileSync('README.md').toString('UTF-8').replace(/\]\(\.\/help\//ig, '](./')
fs.writeFileSync(path.join(__dirname, './help/README.md'), md)
