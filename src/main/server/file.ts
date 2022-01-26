import { shell } from 'electron'
import orderBy from 'lodash/orderBy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import * as yargs from 'yargs'
import AdmZip from 'adm-zip'
import dayjs from 'dayjs'
import { HISTORY_DIR } from '../constant'
import config from '../config'
import repository from './repository'

const readonly = !!(yargs.argv.readonly)
const ignorePath = /node_modules/

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

function withRepo<T> (repo = 'main', callback: (repoPath: string, ...targetPath: string[]) => Promise<T>, ...target: string[]): Promise<T> {
  const repoPath = repository.getPath(repo)
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
  const limit = Math.min(10000, config.get('doc-history.number-limit', 200))
  if (limit < 1) {
    return
  }

  const historyFilePath = getHistoryFilePath(filePath)

  let zip: AdmZip

  if ((await fs.pathExists(historyFilePath))) {
    zip = readHistoryZip(historyFilePath)
  } else {
    zip = new AdmZip()
  }

  const ext = filePath.endsWith('.c.md') ? '.c.md' : '.md'

  zip.addFile(dayjs().format('YYYY-MM-DD HH-mm-ss') + ext, content)

  orderBy(zip.getEntries(), x => x.entryName, 'desc').slice(limit).forEach(entry => {
    if (!entry.comment) {
      zip.deleteFile(entry)
    }
  })

  writeHistoryZip(zip, historyFilePath)
}

async function moveHistory (oldPath: string, newPath: string) {
  if (!oldPath.endsWith('.md')) {
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

    if (filePath.endsWith('.md')) {
      setTimeout(() => writeHistory(filePath, content), 0)
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
): Promise<void> {
  if (!(await fs.stat(location)).isDirectory()) {
    return
  }

  const list = await fs.readdir(location)

  const dirs: TreeItem[] = []
  const files: TreeItem[] = []

  await Promise.all(list.map(async x => {
    if (x.startsWith('.') || ignorePath.test(x)) {
      return
    }

    const p = path.join(location, x)
    const stat = await fs.stat(p)

    if (stat.isFile()) {
      const xpath = getRelativePath(basePath, p)

      files.push({
        name: x,
        path: xpath,
        type: 'file',
        repo: repo,
        birthtime: stat.birthtimeMs,
        mtime: stat.mtimeMs,
        level: data.level + 1,
      })
    } else if (stat.isDirectory()) {
      const dir: TreeItem = {
        name: x,
        path: getRelativePath(basePath, p),
        type: 'dir',
        repo: repo,
        children: [],
        level: data.level + 1,
      }

      dirs.push(dir)
      await travels(p, repo, basePath, dir)
    }
  }))

  const sort = (items: TreeItem[]) => orderBy(items, x => {
    const number = parseFloat(x.name)
    if (!isNaN(number) && isFinite(number)) {
      return number.toString().padStart(20) + x.name
    }

    return x.name
  })

  data.children = sort(dirs)
    .concat(sort(files))
}

export async function tree (repo: string): Promise<TreeItem[]> {
  const data: TreeItem[] = [{
    name: '/',
    type: 'dir',
    path: '/',
    repo: repo,
    children: [],
    level: 1,
  }]

  await withRepo(repo, async repoPath => travels(repoPath, repo, repoPath, data[0]))

  return data
}

export async function search (repo: string, str: string) {
  str = str.trim()
  if (!str) {
    return []
  }

  const files: TreeItem[] = []

  const match = async (p: string, str: string) => {
    return p.endsWith('.md') &&
      !p.endsWith('.c.md') &&
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
      if (x.name.startsWith('.') || ignorePath.test(x.name)) {
        return
      }

      const p = path.join(location, x.name)

      if (x.isDirectory()) {
        await travelFiles(p, basePath, level + 1)
      } else if (x.isFile()) {
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
      return []
    }

    const zip = readHistoryZip(historyFilePath)
    return orderBy(zip.getEntries(), x => x.entryName, 'desc').map(x => ({
      name: x.entryName,
      comment: x.comment
    }))
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
