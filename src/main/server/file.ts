import { app, shell } from 'electron'
import chokidar from 'chokidar'
import orderBy from 'lodash/orderBy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import * as yargs from 'yargs'
import AdmZip from 'adm-zip'
import dayjs from 'dayjs'
import { DEFAULT_EXCLUDE_REGEX, DOC_HISTORY_MAX_CONTENT_LENGTH, ENCRYPTED_MARKDOWN_FILE_EXT, isEncryptedMarkdownFile, isMarkdownFile, MARKDOWN_FILE_EXT, ROOT_REPO_NAME_PREFIX } from '../../share/misc'
import { createStreamResponse } from '../helper'
import { HISTORY_DIR } from '../constant'
import config from '../config'
import repository from './repository'

const readonly = !!(yargs.argv.readonly)

interface XFile {
  name: string;
  path: string;
  type: 'dir' | 'file';
  repo: string;
}

interface TreeItem extends XFile {
  mtime?: number;
  birthtime?: number;
  children?: XFile[];
  level: number;
}

type Order = { by: 'mtime' | 'birthtime' | 'name' | 'serial', order: 'asc' | 'desc' }

function getExcludeRegex () {
  try {
    const regex = config.get('tree.exclude', DEFAULT_EXCLUDE_REGEX) || '^$'
    return new RegExp(regex)
  } catch (error) {
    return new RegExp(DEFAULT_EXCLUDE_REGEX)
  }
}

function withRepo<T> (repo = 'main', callback: (repoPath: string, ...targetPath: string[]) => Promise<T>, ...target: string[]): Promise<T> {
  const repoPath = repo.startsWith(ROOT_REPO_NAME_PREFIX)
    ? repo.substring(ROOT_REPO_NAME_PREFIX.length)
    : repository.getPath(repo)

  if (!repoPath) {
    throw new Error(`repo ${repo} not exists.`)
  }

  return callback(repoPath, ...target.map(x => {
    const targetPath = path.join(repoPath, x)

    if (!targetPath.startsWith(repoPath)) {
      throw new Error('Path error.')
    }

    return targetPath
  }))
}

function getHistoryFilePath (filePath: string) {
  const historyFileName = path.basename(filePath) + '.' + crypto.createHash('md5').update(filePath).digest('hex') + '.zip'
  return path.join(HISTORY_DIR, historyFileName)
}

function readHistoryZip (zipFilePath: string) {
  const compressedZip = new AdmZip(zipFilePath)
  const entry = compressedZip.getEntry('versions.zip')

  if (!entry) {
    throw new Error('history zip file error')
  }

  return new AdmZip(entry.getData())
}

function writeHistoryZip (zip: AdmZip, zipFilePath: string) {
  // store only
  zip.getEntries().forEach(entry => {
    entry.header.method = 0
  })

  // compress entire file
  const compressedZip = new AdmZip()
  compressedZip.addFile('versions.zip', zip.toBuffer())
  compressedZip.writeZip(zipFilePath)
}

async function writeHistory (filePath: string, content: any) {
  let limit = Math.min(10000, config.get('doc-history.number-limit', 500))
  if (limit < 1) {
    return
  }

  const historyFilePath = getHistoryFilePath(filePath)

  let zip: AdmZip
  let tooLarge = false

  if ((await fs.pathExists(historyFilePath))) {
    const stats = await fs.stat(historyFilePath)
    if (stats.size > 1024 * 1024 * 5) { // 5M
      console.log('history file too large, limit max versions.', historyFilePath, stats.size)
      tooLarge = true
    }

    zip = readHistoryZip(historyFilePath)
  } else {
    zip = new AdmZip()
  }

  const ext = isEncryptedMarkdownFile(filePath) ? ENCRYPTED_MARKDOWN_FILE_EXT : MARKDOWN_FILE_EXT

  zip.addFile(dayjs().format('YYYY-MM-DD HH-mm-ss') + ext, content)

  const entries = zip.getEntries()
  if (tooLarge) {
    limit = Math.min(limit, Math.floor(entries.length / 3 * 2))
  }

  orderBy(entries, x => x.entryName, 'desc').slice(limit).forEach(entry => {
    if (!entry.comment) {
      zip.deleteFile(entry)
    }
  })

  writeHistoryZip(zip, historyFilePath)
}

async function moveHistory (oldPath: string, newPath: string) {
  if (!isMarkdownFile(oldPath)) {
    return
  }

  const oldHistoryPath = getHistoryFilePath(oldPath)
  const newHistoryPath = getHistoryFilePath(newPath)

  if (!(await fs.pathExists(oldHistoryPath))) {
    return
  }

  if (await fs.pathExists(newHistoryPath)) {
    await fs.unlink(newHistoryPath)
  }

  await fs.move(oldHistoryPath, newHistoryPath)
}

export function read (repo: string, p: string): Promise<Buffer> {
  return withRepo(repo, (_, targetPath) => fs.readFile(targetPath), p)
}

export function stat (repo: string, p: string) {
  return withRepo(repo, async (_, targetPath) => {
    const stat = await fs.stat(targetPath)

    return {
      birthtime: stat.birthtimeMs,
      mtime: stat.mtimeMs,
      size: stat.size,
    }
  }, p)
}

export function write (repo: string, p: string, content: any): Promise<string> {
  if (readonly) throw new Error('Readonly')

  return withRepo(repo, async (_, filePath) => {
    // create dir.
    if (filePath.endsWith(path.sep)) {
      await fs.ensureDir(filePath)
      return ''
    }

    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, content)

    if (isMarkdownFile(filePath) && typeof content === 'string') {
      if (content.length > DOC_HISTORY_MAX_CONTENT_LENGTH) {
        console.log('skip write history for large file', filePath, content.length)
      } else {
        setTimeout(() => writeHistory(filePath, content), 0)
      }
    }

    return crypto.createHash('md5').update(content).digest('hex')
  }, p)
}

export async function rm (repo: string, p: string) {
  if (readonly) throw new Error('Readonly')

  await withRepo(repo, async (repoPath, targetPath) => {
    if (targetPath !== repoPath) {
      await shell.trashItem(targetPath)
    }
  }, p)
}

export async function mv (repo: string, oldPath: string, newPath: string) {
  if (readonly) throw new Error('Readonly')

  await withRepo(repo, async (_, oldP, newP) => {
    if (oldPath !== newP) {
      await fs.move(oldP, newP)
      setTimeout(async () => {
        await moveHistory(oldP, newP)
      }, 0)
    }
  }, oldPath, newPath)
}

export async function cp (repo: string, oldPath: string, newPath: string) {
  if (readonly) throw new Error('Readonly')

  await withRepo(repo, async (_, oldP, newP) => {
    await fs.copy(oldP, newP)
  }, oldPath, newPath)
}

export function exists (repo: string, p: string) {
  return withRepo(repo, async (_, targetPath) => fs.existsSync(targetPath), p)
}

export async function hash (repo: string, p: string) {
  const content = await read(repo, p)
  return crypto.createHash('md5').update(content).digest('hex')
}

export async function checkHash (repo: string, p: string, oldHash: string) {
  return oldHash === await hash(repo, p)
}

export async function upload (repo: string, buffer: Buffer, path: string) {
  if (readonly) throw new Error('Readonly')
  await write(repo, path, buffer)
}

function getRelativePath (from: string, to: string) {
  return '/' + path.relative(from, to).replace(/\\/g, '/')
}

async function travels (
  location: string,
  repo: string,
  basePath: string,
  data: TreeItem,
  excludeRegex: RegExp,
  order: Order,
): Promise<void> {
  const list = await fs.readdir(location)

  const dirs: TreeItem[] = []
  const files: TreeItem[] = []

  await Promise.all(list.map(async name => {
    const p = path.join(location, name)
    const stat = await fs.stat(p)

    if (stat.isFile()) {
      if (excludeRegex.test(name)) {
        return
      }

      files.push({
        name: name,
        path: getRelativePath(basePath, p),
        type: 'file',
        repo: repo,
        birthtime: stat.birthtimeMs,
        mtime: stat.mtimeMs,
        level: data.level + 1,
      })
    } else if (stat.isDirectory()) {
      if (excludeRegex.test(name + '/')) {
        return
      }

      const dir: TreeItem = {
        name: name,
        path: getRelativePath(basePath, p),
        type: 'dir',
        repo: repo,
        children: [],
        birthtime: stat.birthtimeMs,
        mtime: stat.mtimeMs,
        level: data.level + 1,
      }

      dirs.push(dir)
      await travels(p, repo, basePath, dir, excludeRegex, order)
    }
  }))

  const sort = (items: TreeItem[], order: Order) => orderBy(items, x => {
    if (order.by === 'serial') {
      const number = parseFloat(x.name)
      if (!isNaN(number) && isFinite(number)) {
        return number.toFixed(12).padStart(20) + x.name
      } else {
        return x.name
      }
    }

    return x[order.by] || x.name
  }, order.order)

  data.children = sort(dirs, order)
    .concat(sort(files, order))
}

export async function tree (repo: string, order: Order): Promise<TreeItem[]> {
  const data: TreeItem[] = [{
    name: '/',
    type: 'dir',
    path: '/',
    repo: repo,
    children: [],
    level: 1,
  }]

  await withRepo(repo, async repoPath => travels(repoPath, repo, repoPath, data[0], getExcludeRegex(), order))

  return data
}

export async function search (repo: string, str: string) {
  str = str.trim()
  if (!str) {
    return []
  }

  const files: TreeItem[] = []
  const excludeRegex = getExcludeRegex()

  const match = async (p: string, str: string) => {
    return isMarkdownFile(p) &&
      !isEncryptedMarkdownFile(p) &&
      new RegExp(str, 'i')
        .test(await fs.readFile(p, 'utf-8'))
  }

  const travelFiles = async (location: string, basePath: string, level: number) => {
    // limit results
    if (files.length >= 70) {
      return
    }

    if (!(await fs.stat(location)).isDirectory()) {
      return
    }

    const list = await fs.readdir(location, { withFileTypes: true })

    await Promise.all(list.map(async x => {
      if (x.isDirectory()) {
        if (excludeRegex.test(x.name + '/')) {
          return
        }

        const p = path.join(location, x.name)
        await travelFiles(p, basePath, level + 1)
      } else if (x.isFile()) {
        if (excludeRegex.test(x.name)) {
          return
        }

        const p = path.join(location, x.name)
        if (await match(p, str)) {
          files.push({
            repo,
            name: x.name,
            path: getRelativePath(basePath, p),
            type: 'file',
            level: level,
          })
        }
      }
    }))
  }

  await withRepo(repo, repoPath => travelFiles(repoPath, repoPath, 1))

  return files
}

export function historyList (repo: string, path: string) {
  return withRepo(repo, async (_, filePath) => {
    const historyFilePath = getHistoryFilePath(filePath)

    if (!(await fs.pathExists(historyFilePath))) {
      return { list: [], size: 0 }
    }

    const stats = await fs.stat(historyFilePath)
    const zip = readHistoryZip(historyFilePath)
    const list = orderBy(zip.getEntries(), x => x.entryName, 'desc').map(x => ({
      name: x.entryName,
      comment: x.comment
    }))

    return { list, size: stats.size }
  }, path)
}

export function historyContent (repo: string, path: string, version: string) {
  return withRepo(repo, async (_, filePath) => {
    const historyFilePath = getHistoryFilePath(filePath)

    if (!(await fs.pathExists(historyFilePath))) {
      return ''
    }

    const zip = readHistoryZip(historyFilePath)
    const entry = zip.getEntry(version)
    if (!entry) {
      return ''
    }

    return await new Promise<string>((resolve, reject) => {
      entry.getDataAsync((data, err) => {
        if (err) {
          reject(err)
        } else {
          resolve(data.toString('utf-8'))
        }
      })
    })
  }, path)
}

export async function deleteHistoryVersion (repo: string, p: string, version: string) {
  if (readonly) throw new Error('Readonly')

  return withRepo(repo, async (_, filePath) => {
    const historyFilePath = getHistoryFilePath(filePath)

    const zip = readHistoryZip(historyFilePath)
    if (version === '--all--') {
      zip.getEntries().slice().forEach(entry => {
        if (!entry.comment) {
          zip.deleteFile(entry)
        }
      })
    } else {
      zip.deleteFile(version)
    }

    writeHistoryZip(zip, historyFilePath)
  }, p)
}

export async function commentHistoryVersion (repo: string, p: string, version: string, msg: string) {
  if (readonly) throw new Error('Readonly')

  return withRepo(repo, async (_, filePath) => {
    const historyFilePath = getHistoryFilePath(filePath)

    const zip = readHistoryZip(historyFilePath)
    const entry = zip.getEntry(version)

    if (!entry) {
      return
    }

    entry.comment = msg

    writeHistoryZip(zip, historyFilePath)
  }, p)
}

export async function watchFile (repo: string, p: string, options: chokidar.WatchOptions) {
  return withRepo(repo, async (_, filePath) => {
    const watcher = chokidar.watch(filePath, options)
    const { response, enqueue, close } = createStreamResponse()

    watcher.on('all', (eventName, path, stats) => {
      enqueue('result', { eventName, path, stats })
    })

    const _close = () => {
      close()
      watcher.close()
      app.off('quit', _close)
    }

    app.on('quit', _close)

    watcher.on('error', err => {
      console.error('watchFile', filePath, 'error', err)
      enqueue('error', err)
    })

    response.once('close', () => {
      console.log('watchFile', filePath, 'close')
      _close()
    })

    response.on('error', (err) => {
      console.warn('watchFile', filePath, 'error', err)
      _close()
    })

    return response
  }, p)
}
