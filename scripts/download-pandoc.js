const os = require('os')
const fs = require('fs')
const path = require('path')
const request = require('request')

const forceArm64 = process.argv.includes('--force-arm64')

const filename = os.platform() + '-' + 'pandoc-2.14.2' + (os.platform() === 'win32' ? '.exe' : '')
const downloadUrl = 'https://github.com/purocean/yn/releases/download/v1.1/' + (forceArm64 ? (filename + '-arm64') : filename)

console.info('Download pandoc', downloadUrl, filename)

const dir = path.join(__dirname, '../bin')
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir)
}

const filePath = path.join(dir, filename)
if (fs.existsSync(filePath)) {
  if (forceArm64) {
    fs.unlinkSync(filePath)
  } else {
    console.warn('Pandoc exists. Skip download.', filePath)
  }
} else {
  console.info('Download pandoc', downloadUrl, filename, filePath)
  request(downloadUrl).pipe(fs.createWriteStream(filePath, { mode: 0o755 }))
}
