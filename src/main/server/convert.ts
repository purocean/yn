import * as os from 'os'
import * as fs from 'fs-extra'
import * as path from 'path'
import { spawn } from 'child_process'
import { BIN_DIR, RESOURCES_DIR } from '../constant'

const binPath = path.join(BIN_DIR, os.platform() + '-pandoc-2.7.3' + (os.platform() === 'win32' ? '.exe' : ''))
const docxTplPath = path.join(RESOURCES_DIR, './tpl.docx')
const filterPath = path.join(RESOURCES_DIR, './pandoc-filter.lua')

const convert = async (source: string, fromType: string, toType: string, resourcePath: string) => {
  try {
    const path = os.tmpdir() + `/yn_convert_${new Date().getTime()}.${toType}`

    return new Promise((resolve, reject) => {
      const args = [
        '--self-contained',
        '--lua-filter', filterPath,
        '--resource-path', resourcePath,
        '-f', fromType,
        '-o', path,
        '--reference-doc', docxTplPath
      ]
      console.log(binPath, args)
      const process = spawn(binPath, args)

      let errorMsg = ''
      process.stderr.on('data', (val) => {
        errorMsg += val
      })

      process.stderr.on('data', (val) => {
        errorMsg += val
      })

      process.on('close', async (code) => {
        if (code) {
          reject(new Error(errorMsg))
          return
        }

        try {
          const data = await fs.readFile(path)
          await fs.unlink(path)
          resolve(data)
        } catch (error) {
          reject(error)
        }
      })

      process.on('error', error => {
        reject(error)
      })

      process.stdin.write(source)
      process.stdin.end()
    })
  } catch (e: any) {
    return e.message
  }
}

export default convert
