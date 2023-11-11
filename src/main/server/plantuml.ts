import request from 'request'
import * as crypto from 'crypto'
import fs from 'fs-extra'
import path from 'path'
import pako from 'pako'
import { PlantUmlPipe } from 'plantuml-pipe'
import commandExists from 'command-exists'
import config from '../config'
import { ASSETS_DIR, BIN_DIR, CACHE_DIR } from '../constant'
import { getAction } from '../action'

function plantumlBase64 (base64: string) {
  // eslint-disable-next-line quote-props
  const map: any = { 'A': '0', 'B': '1', 'C': '2', 'D': '3', 'E': '4', 'F': '5', 'G': '6', 'H': '7', 'I': '8', 'J': '9', 'K': 'A', 'L': 'B', 'M': 'C', 'N': 'D', 'O': 'E', 'P': 'F', 'Q': 'G', 'R': 'H', 'S': 'I', 'T': 'J', 'U': 'K', 'V': 'L', 'W': 'M', 'X': 'N', 'Y': 'O', 'Z': 'P', 'a': 'Q', 'b': 'R', 'c': 'S', 'd': 'T', 'e': 'U', 'f': 'V', 'g': 'W', 'h': 'X', 'i': 'Y', 'j': 'Z', 'k': 'a', 'l': 'b', 'm': 'c', 'n': 'd', 'o': 'e', 'p': 'f', 'q': 'g', 'r': 'h', 's': 'i', 't': 'j', 'u': 'k', 'v': 'l', 'w': 'm', 'x': 'n', 'y': 'o', 'z': 'p', '0': 'q', '1': 'r', '2': 's', '3': 't', '4': 'u', '5': 'v', '6': 'w', '7': 'x', '8': 'y', '9': 'z', '+': '-', '/': '_', '=': '' }
  return base64.split('').map(x => map[x] || '').join('')
}

function getCacheKey (api: string, type: string, data: string) {
  return crypto.createHash('sha256').update(api + type + data).digest('hex')
}

async function gcCache (cacheDir: string) {
  const files = await fs.readdir(cacheDir)
  if (files.length < 4000) {
    return
  }

  const stats = await Promise.all(files.map(file => fs.stat(path.join(cacheDir, file))))
  stats.sort((a, b) => a.atimeMs - b.atimeMs)

  for (let i = 0; i < stats.length / 2; i++) {
    await fs.remove(path.join(cacheDir, files[i]))
  }
}

async function getCacheData (key: string, gen: () => Promise<any>) {
  const cacheDir = path.join(CACHE_DIR, 'plantuml')
  await fs.ensureDir(cacheDir)

  gcCache(cacheDir)

  const cacheFile = path.join(cacheDir, key)
  if (await fs.pathExists(cacheFile)) {
    const stat = await fs.stat(cacheFile)
    if (stat.size) {
      return fs.createReadStream(cacheFile)
    }
  }

  const data = await gen()
  if (!data) {
    throw new Error('No data')
  }

  if (typeof data.pipe === 'function') {
    await new Promise((resolve, reject) => {
      data.on('end', resolve)
      data.on('error', reject)
      data.pipe(fs.createWriteStream(cacheFile))
    })
    return fs.createReadStream(cacheFile)
  } else {
    await fs.writeFile(cacheFile, data)
    return fs.createReadStream(cacheFile)
  }
}

export default async function (data: string): Promise<{ content: any, type: string }> {
  const api: string = config.get('plantuml-api', 'local')

  if (api.startsWith('local')) {
    try {
      await commandExists('java')
    } catch {
      throw fs.createReadStream(path.join(ASSETS_DIR, 'no-java-runtime.png'))
    }

    const format = api.split('-')[1] || 'png'
    const type = format === 'png' ? 'image/png' : 'image/svg+xml'

    const cacheKey = getCacheKey(api, type, data)
    const content = await getCacheData(cacheKey, async () => {
      const jarPath = path.join(BIN_DIR, 'plantuml.jar')

      const puml = new PlantUmlPipe({
        split: format === 'svg',
        outputFormat: format as 'png' | 'svg',
        plantUmlArgs: ['-charset', 'UTF-8'],
        jarPath,
      })

      puml.in.write(pako.inflateRaw(Buffer.from(data, 'base64')))
      puml.in.end()

      return puml.out
    })

    return { content, type }
  } else {
    const url = api.replace('{data}', plantumlBase64(data))
    const agent = await getAction('get-proxy-agent')(url)
    let type = ''

    const cacheKey = getCacheKey(api, type, data)
    const content = await getCacheData(cacheKey, async () => {
      return new Promise((resolve, reject) => {
        request({ agent, url, encoding: null }, function (err: any, res: any) {
          if (err) {
            reject(err)
          } else {
            type = res.headers['content-type']
            resolve(res.body)
          }
        })
      })
    })

    return { content, type }
  }
}
