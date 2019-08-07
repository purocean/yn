const os = require('os')
const path = require('path')
const fs = require('fs-extra')

const platform = os.platform()

try {
  fs.unlinkSync(path.join(__dirname, 'dist/assets'))
} catch (error) {
}

fs.copySync(path.join(__dirname, 'src/assets'), path.join(__dirname, 'dist/assets'))

if (platform === 'win32') {
  fs.copySync(path.join(__dirname, 'bin/pandoc/2.7.3/win32/pandoc.exe'), path.join(__dirname, 'dist/pandoc.exe'))
} else {
  fs.copySync(path.join(__dirname, `bin/pandoc/2.7.3/${platform}/pandoc`), path.join(__dirname, 'dist/pandoc'))
}
