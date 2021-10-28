import { slugify } from 'transliteration'
import type { Doc } from '@fe/types'
import * as api from '@fe/support/api'
import { getSettings } from './setting'
import { FLAG_DEMO } from '@fe/support/args'
import { binMd5, fileToBase64URL, getLogger } from '@fe/utils'
import { basename, resolve, extname, dirname, relative } from '@fe/utils/path'
import { dayjs } from '@fe/context/lib'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'

const logger = getLogger('service-base')

/**
 * 上传一个文件
 * @param file 要上传的文件
 * @param belongDoc 所属文档
 * @param name 文件名
 * @returns 文件储存路径（限于仓库）
 */
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

/**
 * 输入一个密码
 * @param title 标题
 * @param hint 提示
 * @param throwError 是否抛出错误
 * @returns 密码
 */
export async function inputPassword (title: string, hint: string, throwError = false) {
  const password = await useModal().input({ title, type: 'password', hint })
  if (!password) {
    if (throwError) {
      throw new Error('未输入密码')
    } else {
      useToast().show('warning', '未输入密码')
    }
  }

  return password
}
