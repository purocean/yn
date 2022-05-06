import * as path from 'path'
import * as fs from 'fs-extra'
import request from 'request'
import { unzip } from 'zlib'
import tar from 'tar-stream'
import { USER_EXTENSION_DIR } from './constant'
import { getAction } from './action'
import { Readable } from 'stream'
import config from './config'

const RE_EXTENSION_ID = /[A-Za-z0-9-_]+/

const configKey = 'extensions'
function getExtensionPath (id: string) {
  if (!RE_EXTENSION_ID.test(id)) {
    throw new Error('Invalid extension id')
  }

  return path.join(USER_EXTENSION_DIR, id)
}

function changeExtensionConfig (id: string, val: { enabled: boolean }) {
  const extensions = config.get(configKey, {}) || {}
  extensions[id] = { ...extensions[id], ...val }
  config.set(configKey, extensions)
}

export async function list () {
  const list = (await fs.readdir(USER_EXTENSION_DIR, { withFileTypes: true }))
    .filter(x => (x.isDirectory() || x.isSymbolicLink()) && RE_EXTENSION_ID.test(x.name))

  const extensionsSettings = config.get(configKey, {})

  Object.keys(extensionsSettings).forEach(key => {
    if (!list.some(x => x.name === key)) {
      delete extensionsSettings[key]
    }
  })

  config.set(configKey, extensionsSettings)

  return list.map(x => {
    const ext = extensionsSettings[x.name]
    return { id: x.name, enabled: (ext && ext.enabled) }
  })
}

export async function install (id: string, url: string) {
  console.log('[extension] install', id, url)
  const extensionPath = getExtensionPath(id)
  if (await fs.pathExists(extensionPath)) {
    console.log('[extension] already installed. upgrade:', id)
  }

  const agent = await getAction('get-proxy-agent')(url)

  return new Promise((resolve, reject) => {
    request({ url, agent, encoding: null }, (err, _, body) => {
      if (err) {
        reject(err)
        return
      }

      unzip(body, (err, data) => {
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

        Readable.from(data).pipe(extract)
      })
    })
  })
}

export async function uninstall (id: string) {
  const extensionPath = getExtensionPath(id)
  if (await fs.pathExists(extensionPath)) {
    await fs.remove(extensionPath)
  }
}

export async function enable (id: string) {
  changeExtensionConfig(id, { enabled: true })
}

export async function disable (id: string) {
  changeExtensionConfig(id, { enabled: false })
}
