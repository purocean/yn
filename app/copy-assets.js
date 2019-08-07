const os = require('os')
const path = require('path')
const fs = require('fs-extra')

const platform = os.platform()

const assetsPath = path.join(__dirname, 'dist/assets')
try {
  fs.unlinkSync(assetsPath)
} catch {
}

fs.copySync(path.join(__dirname, 'src/assets'), assetsPath)

if (platform === 'win32') {
  const pandocFilePath = path.join(__dirname, 'dist/pandoc.exe')
  if (!fs.existsSync(pandocFilePath)) {
    fs.copySync(path.join(__dirname, 'bin/win32-pandoc-2.7.3.exe'), pandocFilePath)
  }
} else {
  const pandocFilePath = path.join(__dirname, 'dist/pandoc')
  if (!fs.existsSync(pandocFilePath)) {
    fs.copySync(path.join(__dirname, `bin/${platform}-pandoc-2.7.3`), pandocFilePath)
  }
}
