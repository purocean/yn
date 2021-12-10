import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import * as NaturalOrderby from 'natural-orderby'
import * as yargs from 'yargs'
import mark, { MarkedFile } from './mark'
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
  marked?: boolean;
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

    return crypto.createHash('md5').update(content).digest('hex')
  }, p)
}

export async function rm (repo: string, p: string) {
  if (readonly) throw new Error('Readonly')

  await withRepo(repo, async (repoPath, targetPath) => {
    if (targetPath !== repoPath) {
      const newPath = path.join(repository.getTrashPath(repo), p.replace(/\.\./g, '')) + '.' + (new Date()).getTime()
      await fs.move(targetPath, newPath)
    }
  }, p)
}

export async function mv (repo: string, oldPath: string, newPath: string) {
  if (readonly) throw new Error('Readonly')

  await withRepo(repo, async (_, oldP, newP) => {
    if (oldPath !== newP) {
      await fs.move(oldP, newP)
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
  markedFiles: MarkedFile[],
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
        marked: (markedFiles || []).findIndex(f => f.path === xpath && f.repo === repo) > -1,
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
      await travels(p, repo, basePath, markedFiles, dir)
    }
  }))

  const sortOptions = [(v: TreeItem) => v && v.name.charCodeAt(0) > 255 ? 1 : 0, (v: TreeItem) => v.name]

  data.children = NaturalOrderby.orderBy(dirs, sortOptions)
    .concat(NaturalOrderby.orderBy(files, sortOptions))
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

  const markedFiles = mark.list()

  await withRepo(repo, async repoPath => travels(repoPath, repo, repoPath, markedFiles, data[0]))

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
