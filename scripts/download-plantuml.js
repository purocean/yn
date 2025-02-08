const fs = require('fs')
const path = require('path')
const request = require('request')

const filename = 'plantuml.jar'
const downloadUrl = 'https://github.com/plantuml/plantuml/releases/download/v1.2025.0/plantuml.jar'

console.info('Download plantuml', downloadUrl, filename)

const dir = path.join(__dirname, '../bin')
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir)
}

const filePath = path.join(dir, filename)
if (fs.existsSync(filePath)) {
  console.warn('Pandoc exists. Skip download.', filePath)
} else {
  console.info('Download plantuml', downloadUrl, filename, filePath)
  request(downloadUrl).pipe(fs.createWriteStream(filePath, { mode: 0o755 }))
}
