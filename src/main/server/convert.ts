import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'
import { BIN_DIR, RESOURCES_DIR } from '../constant'

const binPath = path.join(BIN_DIR, os.platform() + '-pandoc-2.7.3' + (os.platform() === 'win32' ? '.exe' : ''))
const docxTplPath = path.join(RESOURCES_DIR, './tpl.docx')

const convert = async (source: string, fromType: string, toType: string) => {
  try {
    const path = os.tmpdir() + `/yn_convert_${new Date().getTime()}.${toType}`

    return new Promise((resolve, reject) => {
      const args = ['--self-contained', '-f', fromType, '-o', path, '--reference-doc', docxTplPath]
      console.log(binPath, args)
      const process = spawn(binPath, args)

      process.on('close', () => {
        try {
          const data = fs.readFileSync(path)
          fs.unlinkSync(path)
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
