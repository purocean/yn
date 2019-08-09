const os = require('os')
const fs = require('fs')
const path = require('path')
const request = require('request')

const filename = os.platform() + '-' + 'pandoc-2.7.3' + (os.platform() === 'win32' ? '.exe' : '')
const downloadUrl = 'https://github.com/purocean/yn/releases/download/v1.1/' + filename

const dir = path.join(__dirname, './bin')
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir)
}

const filePath = path.join(dir, filename)
if (fs.existsSync(filePath)) {
  console.warn('Pandoc exists. Skip download.', filePath)
} else {
  console.info('Download pandoc', downloadUrl, filename, filePath)
  request(downloadUrl).pipe(fs.createWriteStream(filePath))
}
