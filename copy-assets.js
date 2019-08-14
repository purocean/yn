const os = require('os')
const path = require('path')
const fs = require('fs-extra')

const assetsPath = path.join(__dirname, 'dist/assets')
try {
  fs.unlinkSync(assetsPath)
} catch {
}

fs.copySync(path.join(__dirname, 'src/assets'), assetsPath)
fs.copySync(path.join(__dirname, 'README.md'), path.join(__dirname, './help/README.md'))
