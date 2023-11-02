import * as os from 'os'
import * as fs from 'fs-extra'
import * as path from 'path'
import { spawn } from 'child_process'
import { BIN_DIR, PANDOC_REFERENCE_FILE, RESOURCES_DIR, USER_DIR } from '../constant'

const binPath = path.join(BIN_DIR, os.platform() + '-pandoc-2.14.2' + (os.platform() === 'win32' ? '.exe' : ''))
const docxTplPath = path.join(USER_DIR, PANDOC_REFERENCE_FILE)
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
      const ps = spawn(binPath, args, {
        env: {
          ...process.env,
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8'
        }
      })

      let errorMsg = ''
      ps.stderr.on('data', (val) => {
        errorMsg += val
      })

      ps.stderr.on('data', (val) => {
        errorMsg += val
      })

      ps.on('close', async (code) => {
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

      ps.on('error', error => {
        reject(error)
      })

      ps.stdin.write(source)
      ps.stdin.end()
    })
  } catch (e: any) {
    return e.message
  }
}

export default convert
