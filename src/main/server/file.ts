import { app, shell } from 'electron'
import ch from 'child_process'
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
import type { WatchOpts } from './watch-worker'

// make sure watch-worker.ts is compiled
import './watch-worker'

const readonly = !!(yargs.argv.readonly)

let _watchProcess: ch.ChildProcess | null = null
let watchGid = 0

function getWatchProcess () {
  if (!_watchProcess) {
    console.log('start watch-worker process')
    _watchProcess = ch.fork(
      path.join(__dirname, '/watch-worker.js'),
      {
        env: { ELECTRON_RUN_AS_NODE: '1' },
        // execArgv: ['--inspect']
      }
    )

    _watchProcess.on('exit', () => {
      _watchProcess = null
    })

    _watchProcess.on('error', () => {
      _watchProcess = null
    })
  }

  return _watchProcess
}

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

type MdFileHeader = {
  title?: string;
  created?: string;
  modified?: string;
  attachments?: string[];
  tags?: string[];
  headingNumber?: boolean;
  enableMacro?: boolean;
  customVar?: boolean;
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
  const isRootRepo = repo.startsWith(ROOT_REPO_NAME_PREFIX)

  const repoPath = isRootRepo
    ? repo.substring(ROOT_REPO_NAME_PREFIX.length)
    : repository.getPath(repo)

  if (!repoPath) {
    throw new Error(`repo ${repo} not exists.`)
  }

  return callback(repoPath, ...target.map(x => {
    // fix path
    if (!x.startsWith('/')) {
      x = '/' + x
    }

    const targetPath = isRootRepo
      ? x.replace(/^\//, repoPath) // replace first / to repoPath for case of `\\127.0.0.1/test/a.md`
      : path.join(repoPath, x)

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

export function createReadStream (repo: string, p: string, options?: Parameters<typeof fs.createReadStream>[1]): Promise<ReturnType<typeof fs.createReadStream>> {
  return withRepo(repo, async (_, targetPath) => fs.createReadStream(targetPath, options), p)
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

export function checkWriteable (repo: string, p: string) {
  return withRepo(repo, async (_, targetPath) => {
    if (readonly) {
      return false
    }

    try {
      await fs.access(targetPath, fs.constants.W_OK)
      return true
    } catch (error) {
      return false
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

export async function rm (repo: string, p: string, trash = true) {
  if (readonly) throw new Error('Readonly')

  await withRepo(repo, async (repoPath, targetPath) => {
    if (targetPath !== repoPath) {
      if (trash) {
        await shell.trashItem(targetPath)
      } else {
        await fs.remove(targetPath)
      }
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

export async function upload (repo: string, buffer: Buffer, filePath: string, ifExists: 'rename' | 'overwrite' | 'skip' | 'error' = 'error'): Promise<{ path: string, hash: string }> {
  if (readonly) throw new Error('Readonly')

  let newFilePath = filePath

  if (await exists(repo, filePath)) {
    if (ifExists === 'overwrite') {
      // do nothing
    } else if (ifExists === 'skip') {
      return { path: filePath, hash: await hash(repo, filePath) }
    } else if (ifExists === 'rename') {
      const dir = path.dirname(filePath)
      const ext = path.extname(filePath)
      const base = path.basename(filePath, ext)

      let i = 1
      while (await exists(repo, newFilePath)) {
        i++

        if (i > 10000) {
          throw new Error('Too many files with the same name')
        }

        const seq = i > 100 ? Math.floor(Math.random() * 1000000) : i
        newFilePath = path.join(dir, base + `-${seq}` + ext).replace(/\\/g, '/')
      }
    } else {
      throw new Error('File exists')
    }
  }

  return { path: newFilePath, hash: await write(repo, newFilePath, buffer) }
}

function getRelativePath (from: string, to: string) {
  return '/' + path.relative(from, to).replace(/\\/g, '/')
}

async function parseMdHeader (fileName:string, path:string, stat:fs.Stats):Promise<MdFileHeader|null> {
  if (!isMarkdownFile(fileName)) {
    return null
  }
  const readSize = Math.min(1024, stat.size)
  if (readSize < 25) {
    return null
  }

  let mdFileHeader:string
  try {
    const fd = fs.openSync(path, 'r')
    const buffer = Buffer.alloc(readSize)
    const bytesRead = fs.readSync(
      fd,
      buffer,
      0,
      readSize,
      0
    )
    fs.closeSync(fd)
    if (bytesRead < readSize) {
      return null
    }
    mdFileHeader = buffer.toString('utf8')
  } catch (e) {
    return null
  }

  const matches = mdFileHeader.match(/^---([\s\S]+?)---/)
  if (!matches || matches.length < 2) {
    return null
  }
  const parsedHeaders:any = {}
  const headerLines = matches[1].split('\n')
  for (let j = 0; j < headerLines.length; j++) {
    const matches2 = headerLines[j].trim().match(/^([a-zA-Z_$-][0-9a-zA-Z-_$]+)?:\s*([\s\S]*)?/)
    if (matches2 && matches2.length > 1) {
      if (/true/i.test(matches2[0])) {
        parsedHeaders[matches2[1]] = true
      } else if (/false/i.test(matches2[0])) {
        parsedHeaders[matches2[1]] = false
      } else {
        parsedHeaders[matches2[1]] = matches2[2] || ''
      }
    }
  }
  return parsedHeaders
}

async function travels (
  location: string,
  repo: string,
  basePath: string,
  data: TreeItem,
  excludeRegex: RegExp,
  includeRegex: RegExp | null,
  order: Order,
  noEmptyDir: boolean
): Promise<void> {
  const list = await fs.readdir(location)

  const dirs: TreeItem[] = []
  const files: TreeItem[] = []

  await Promise.all(list.map(async name => {
    const p = path.join(location, name)
    const stat = await fs.stat(p).catch(e => {
      console.error('travels', p, e)
      return null
    })

    if (!stat) {
      return
    }

    if (stat.isFile()) {
      if (excludeRegex.test(name)) {
        return
      }

      if (includeRegex && !includeRegex.test(name)) {
        return
      }

      const fileProp:TreeItem = {
        name,
        path: getRelativePath(basePath, p),
        type: 'file',
        repo,
        birthtime: stat.birthtimeMs,
        mtime: stat.mtimeMs,
        level: data.level + 1,
      }

      // 尝试从文件头部解析创建时间和修改时间
      const mdParsedHeader = await parseMdHeader(name, p, stat)
      if (mdParsedHeader) {
        if (Object.hasOwnProperty.call(mdParsedHeader, 'created')) {
          fileProp.birthtime = dayjs(mdParsedHeader.created).valueOf()
        }
        if (Object.hasOwnProperty.call(mdParsedHeader, 'modified')) {
          fileProp.mtime = dayjs(mdParsedHeader.modified).valueOf()
        }
      }

      files.push(fileProp)
    } else if (stat.isDirectory()) {
      const dirName = name + '/'
      if (excludeRegex.test(dirName)) {
        return
      }

      if (includeRegex && !includeRegex.test(dirName)) {
        return
      }

      const dir: TreeItem = {
        name,
        path: getRelativePath(basePath, p),
        type: 'dir',
        repo,
        children: [],
        birthtime: stat.birthtimeMs,
        mtime: stat.mtimeMs,
        level: data.level + 1,
      }

      await travels(p, repo, basePath, dir, excludeRegex, includeRegex, order, noEmptyDir)

      if (!(noEmptyDir && dir.children!.length === 0)) {
        dirs.push(dir)
      }
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

export async function tree (repo: string, order: Order, include?: string | RegExp, noEmptyDir?: boolean): Promise<TreeItem[]> {
  if (repo.startsWith(ROOT_REPO_NAME_PREFIX)) {
    return []
  }

  const data: TreeItem[] = [{
    name: '/',
    type: 'dir',
    path: '/',
    repo,
    children: [],
    level: 1,
  }]

  const includeRegex = include ? new RegExp(include) : null

  await withRepo(repo, async repoPath => travels(repoPath, repo, repoPath, data[0], getExcludeRegex(), includeRegex, order, !!noEmptyDir))

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
            level,
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

export async function watchFile (repo: string, p: string | string[], options: WatchOpts) {
  return withRepo(repo, async (_, ...args) => {
    const filePath = args.length === 1 ? args[0] : args

    const { response, enqueue, close } = createStreamResponse()

    type Message = { id: number, type: 'init' | 'stop' | 'enqueue', payload?: any }

    watchGid++

    const id = watchGid

    const wp = getWatchProcess()

    wp.send({ id, type: 'init', payload: { filePath, options } } satisfies Message)

    const onMessage = (message: Message) => {
      if (message.id !== id) {
        return
      }

      if (message.type === 'enqueue') {
        try {
          if (!response.closed) {
            enqueue(message.payload.type, message.payload.data)
          }
        } catch (error) {
          console.error('watchFile', filePath, 'enqueue error', error)
        }
      }
    }

    const onError = (err: any) => {
      console.error('watchFile', filePath, 'error', err)
      _stop()
    }

    const onExit = (code: any) => {
      close()
      console.log('watchFile', id, filePath, 'exit', code)
    }

    const _stop = () => {
      console.log('watchFile', id, filePath, 'stop')
      wp.send({ id, type: 'stop' } satisfies Message)
      app.off('quit', _stop)
      wp.off('message', onMessage)
      wp.off('error', onError)
      wp.off('exit', onExit)
    }

    wp.on('message', onMessage)
    wp.on('error', onError)
    wp.on('exit', onExit)
    app.on('quit', _stop)

    response.once('close', () => {
      console.log('watchFile', id, filePath, 'response close')
      _stop()
    })

    response.once('error', (err) => {
      console.warn('watchFile', id, filePath, 'error', err)
      _stop()
    })

    return response
  }, ...(Array.isArray(p) ? p : [p]))
}
