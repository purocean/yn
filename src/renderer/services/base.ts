import { slugify } from 'transliteration'
import type { Doc } from '@fe/types'
import * as api from '@fe/support/api'
import { getSettings } from './setting'
import { FLAG_DEMO } from '@fe/support/args'
import { binMd5, fileToBase64URL, getLogger } from '@fe/utils'
import { basename, resolve, extname, dirname, relative } from '@fe/utils/path'
import { dayjs } from '@fe/context/lib'

const logger = getLogger('service-base')

export async function upload (file: File, belongDoc: Pick<Doc, 'repo' | 'path'>, name?: string) {
  if (FLAG_DEMO) {
    return Promise.resolve(URL.createObjectURL(file))
  }

  const fileBase64Url = await fileToBase64URL(file)

  const filename = name || binMd5(fileBase64Url).substr(0, 8) + extname(file.name)
  const dirName = slugify(basename(belongDoc.path))
  const parentPath = dirname(belongDoc.path)
  const assetsDir = getSettings()['assets-dir']
    .replace('{docSlug}', dirName.startsWith('.') ? 'upload' : dirName)
    .replace('{date}', dayjs().format('YYYY-MM-DD'))

  const path: string = resolve(parentPath, assetsDir, filename)

  logger.debug('upload', belongDoc, file, path)

  await api.upload(belongDoc.repo, fileBase64Url, path)

  if (!assetsDir.startsWith('/')) {
    return './' + relative(parentPath, path)
  }

  return path
}
