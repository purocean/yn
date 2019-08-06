const os = require('os')
const fs = require('fs-extra')

const platform = os.platform()

fs.copySync('src/assets', 'dist/assets')
fs.copySync('static', 'dist/static')

if (platform === 'win32') {
  fs.copySync('bin/pandoc/2.7.3/win32/pandoc.exe', 'dist/pandoc.exe')
} else {
  fs.copySync(`bin/pandoc/2.7.3/${platform}/pandoc`, 'dist/pandoc')
}
