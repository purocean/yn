import { slugify } from 'transliteration'
import type { Doc } from '@fe/types'
import * as api from '@fe/support/api'
import { getSetting, getSettings } from './setting'
import { FLAG_DEMO } from '@fe/support/args'
import { binMd5, quote, fileToBase64URL, getLogger } from '@fe/utils'
import { basename, resolve, extname, dirname, relative } from '@fe/utils/path'
import { dayjs } from '@fe/context/lib'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import { isWindows } from '@fe/support/env'
import { t } from './i18n'

const logger = getLogger('service-base')

/**
 * Upload a file.
 * @param file
 * @param belongDoc belong document
 * @param name filename
 * @returns
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
 * Input password.
 * @param title
 * @param hint
 * @param throwError
 * @returns
 */
export async function inputPassword (title: string, hint: string, throwError = false) {
  const password = await useModal().input({ title, type: 'password', hint })
  if (!password) {
    const msg = t('no-password')
    if (throwError) {
      throw new Error(msg)
    } else {
      useToast().show('warning', msg)
    }
  }

  return password
}

/**
 * open an external uri
 * @param uri
 */
export async function openExternal (uri: string) {
  api.rpc(`require('electron').shell.openExternal(${quote(uri)})`)
}

/**
 * open a path
 * @param path
 */
export async function openPath (path: string) {
  api.rpc(`require('electron').shell.openPath(${quote(path)})`)
}

/**
 * show item in folder
 * @param path
 */
export async function showItemInFolder (path: string) {
  if (isWindows) {
    path = path.replaceAll('/', '\\')
  }

  api.rpc(`require('electron').shell.showItemInFolder(${quote(path)})`)
}

/**
 * get repo by name
 * @param name
 * @returns
 */
export function getRepo (name: string) {
  return (getSetting('repos') || []).find(x => x.name === name)
}

export async function readFromClipboard (callback: (type: string, getType: (type: string) => Promise<Blob>) => Promise<void>) {
  const result = await navigator.permissions.query({ name: 'clipboard-read' as any })

  if (result.state === 'denied') {
    useToast().show('warning', t('need-clipboard-permission'))
    return
  }

  const items: any = await (navigator.clipboard as any).read()
  for (const item of items) {
    for (const type of (item.types as string[])) {
      await callback(type, item.getType.bind(item))
    }
  }
}

export async function writeToClipboard (type: string, value: any) {
  const result = await navigator.permissions.query({ name: 'clipboard-write' as any })

  if (result.state === 'denied') {
    useToast().show('warning', t('need-clipboard-permission'))
    return
  }

  return (navigator.clipboard as any).write([new (window as any).ClipboardItem({
    [type]: new Blob([value], { type })
  })])
}
