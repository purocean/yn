import request from 'request'
import fs from 'fs'
import path from 'path'
import pako from 'pako'
import { PlantUmlPipe } from 'plantuml-pipe'
import commandExists from 'command-exists'
import config from '../config'
import { ASSETS_DIR, BIN_DIR } from '../constant'
import { getAction } from '../action'

function plantumlBase64 (base64: string) {
  // eslint-disable-next-line quote-props
  const map: any = { 'A': '0', 'B': '1', 'C': '2', 'D': '3', 'E': '4', 'F': '5', 'G': '6', 'H': '7', 'I': '8', 'J': '9', 'K': 'A', 'L': 'B', 'M': 'C', 'N': 'D', 'O': 'E', 'P': 'F', 'Q': 'G', 'R': 'H', 'S': 'I', 'T': 'J', 'U': 'K', 'V': 'L', 'W': 'M', 'X': 'N', 'Y': 'O', 'Z': 'P', 'a': 'Q', 'b': 'R', 'c': 'S', 'd': 'T', 'e': 'U', 'f': 'V', 'g': 'W', 'h': 'X', 'i': 'Y', 'j': 'Z', 'k': 'a', 'l': 'b', 'm': 'c', 'n': 'd', 'o': 'e', 'p': 'f', 'q': 'g', 'r': 'h', 's': 'i', 't': 'j', 'u': 'k', 'v': 'l', 'w': 'm', 'x': 'n', 'y': 'o', 'z': 'p', '0': 'q', '1': 'r', '2': 's', '3': 't', '4': 'u', '5': 'v', '6': 'w', '7': 'x', '8': 'y', '9': 'z', '+': '-', '/': '_', '=': '' }
  return base64.split('').map(x => map[x] || '').join('')
}

export default async function (data: string): Promise<{ content: any, type: string }> {
  const code = pako.inflateRaw(Buffer.from(data, 'base64'))

  const api: string = config.get('plantuml-api', 'local')

  if (api.startsWith('local')) {
    try {
      await commandExists('java')
    } catch {
      throw fs.createReadStream(path.join(ASSETS_DIR, 'no-java-runtime.png'))
    }

    const format = api.split('-')[1] || 'png'
    const type = format === 'png' ? 'image/png' : 'image/svg+xml'
    const jarPath = path.join(BIN_DIR, 'plantuml.jar')

    const puml = new PlantUmlPipe({
      split: format === 'svg',
      outputFormat: format as 'png' | 'svg',
      plantUmlArgs: ['-charset', 'UTF-8'],
      jarPath,
    })

    puml.in.write(code)
    puml.in.end()

    return { content: puml.out, type }
  } else {
    const url = api.replace('{data}', plantumlBase64(data))
    const agent = await getAction('get-proxy-agent')(url)
    return new Promise((resolve, reject) => {
      request({ agent, url, encoding: null }, function (err: any, res: any) {
        if (err) {
          reject(err)
        } else {
          resolve({ content: res.body, type: res.headers['content-type'] })
        }
      })
    })
  }
}
