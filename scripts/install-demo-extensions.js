// @ts-check

const request = require('request');
const fs = require('fs-extra');
const path = require('path')
const zlib = require('zlib')
const tar = require('tar-stream')
const stream = require('stream')

function installExtension (extension) {
  const extensionPath = path.join(
    __dirname,
    '../src/renderer/public/extensions',
    extension.name.replace(/\//g, '$')
  )

  fs.ensureDirSync(extensionPath)

  return new Promise((resolve, reject) => {
    const url = extension.dist.tarball;
    request({ url, encoding: null }, (err, _, body) => {
      if (err) {
        reject(err)
        return
      }

      zlib.unzip(body, (err, data) => {
        if (err) {
          reject(err)
          return
        }

        const extract = tar.extract()

        extract.on('entry', (header, stream, next) => {
          const filePath = path.join(extensionPath, header.name.replace(/^package/, ''))
          console.log('[extension] write file', filePath)

          fs.ensureFile(filePath).then(() => {
            const fileStream = fs.createWriteStream(filePath)
            stream.pipe(fileStream)
            stream.on('end', next)
          }).catch(reject)
        })

        extract.on('finish', () => {
          resolve(undefined)
        })

        extract.on('error', reject)

        stream.Readable.from(data).pipe(extract)
      })
    })
  })
}

async function install (extensions) {
  for (const extension of extensions) {
    if (extension.name.startsWith('@yank-note/extension-')) {
      console.log('[extension] install', extension.name)
      await installExtension(extension)
    } else {
      console.log('[extension] skip', extension.name)
    }
  }
}

const registryUrl = 'https://raw.githubusercontent.com/purocean/yank-note-registry/main/index.json'
console.log('Download registry')
request(registryUrl, (err, _, body) => {
  if (err) {
    console.error(err);
    return;
  }

  const registry = JSON.parse(body);

  const extensions = registry.filter(x =>
    x.origin === 'official' &&
    x.name !== '@yank-note/extension-milkdown'
  )
    .map(x => ({ id: x.name, enabled: true, isDev: false }))
  const extensionsFile = path.join(__dirname, '../src/renderer/public/extensions.json')
  console.log(`Writing extensions ${extensionsFile}`)
  fs.writeJSONSync(extensionsFile, extensions);

  console.log('Install extensions', extensions.length)
  install(registry)
})
