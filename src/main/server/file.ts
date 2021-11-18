import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import * as NaturalOrderby from 'natural-orderby'
import * as yargs from 'yargs'
import opn from 'opn'
import * as wsl from '../wsl'
import mark, { MarkedFile } from './mark'
import repository from './repository'

const readonly = !!(yargs.argv.readonly)
const isWsl = wsl.isWsl
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
}

const withRepo = (repo = 'main', callback: (repoPath: string, ...targetPath: string[]) => any, ...target: string[]) => {
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

const read = (repo: string, p: string) => withRepo(repo, (_, targetPath) => fs.readFileSync(targetPath), p)

const write = (repo: string, p: string, content: any) => {
  if (readonly) throw new Error('Readonly')

  return withRepo(repo, (_, filePath) => {
    // create dir.
    if (filePath.endsWith('/')) {
      fs.ensureDirSync(filePath)
      return ''
    }

    fs.ensureFileSync(filePath)
    fs.writeFileSync(filePath, content)

    return crypto.createHash('md5').update(content).digest('hex')
  }, p)
}

const rm = (repo: string, p: string) => {
  if (readonly) throw new Error('Readonly')

  withRepo(repo, (repoPath, targetPath) => {
    if (targetPath !== repoPath) {
      const newPath = path.join(repository.getTrashPath(repo), p.replace(/\.\./g, '')) + '.' + (new Date()).getTime()
      fs.moveSync(targetPath, newPath)
    }
  }, p)
}

const mv = (repo: string, oldPath: string, newPath: string) => {
  if (readonly) throw new Error('Readonly')

  withRepo(repo, (_, oldP, newP) => {
    if (oldPath !== newP) {
      fs.moveSync(oldP, newP)
    }
  }, oldPath, newPath)
}

const exists = (repo: string, p: string) => withRepo(repo, (_, targetPath) => fs.existsSync(targetPath), p)

const hash = (repo: string, p: string) => {
  const content = read(repo, p)
  return crypto.createHash('md5').update(content).digest('hex')
}

const checkHash = (repo: string, p: string, oldHash: string) => {
  return oldHash === hash(repo, p)
}

const upload = (repo: string, buffer: Buffer, path: string) => {
  if (readonly) throw new Error('Readonly')
  write(repo, path, buffer)
}

const getRelativePath = (from: string, to: string) =>
  '/' + path.relative(from, to).replace(/\\/g, '/')

const travels = (location: string, repo: string, basePath: string, markedFiles: MarkedFile[] | null = null): any => {
  if (!fs.statSync(location).isDirectory()) {
    return []
  }

  const list = fs.readdirSync(location).filter(x => !x.startsWith('.') && !ignorePath.test(x))

  const sortOptions = [(v: string) => v && v.charCodeAt(0) > 255 ? 1 : 0, (v: string) => v]

  const dirs = NaturalOrderby.orderBy(list.filter(x => fs.statSync(path.join(location, x)).isDirectory()), sortOptions)
  const files = NaturalOrderby.orderBy(list.filter(x => !fs.statSync(path.join(location, x)).isDirectory()), sortOptions)

  markedFiles = markedFiles || mark.list()

  return dirs.map(x => {
    const p = path.join(location, x)
    return {
      name: x,
      path: getRelativePath(basePath, p),
      type: 'dir',
      repo: repo,
      children: travels(p, repo, basePath, markedFiles)
    } as TreeItem
  }).concat(files.map(x => {
    const p = path.join(location, x)
    const xpath = getRelativePath(basePath, p)
    const stat = fs.statSync(p)

    return {
      name: x,
      path: xpath,
      type: 'file',
      repo: repo,
      marked: (markedFiles || []).findIndex(f => f.path === xpath && f.repo === repo) > -1,
      birthtime: stat.birthtimeMs,
      mtime: stat.mtimeMs
    } as TreeItem
  }))
}

const tree = (repo: string) => {
  return withRepo(repo, repoPath => [{
    name: '/',
    type: 'dir',
    path: '/',
    repo: repo,
    children: travels(repoPath, repo, repoPath)
  }])
}

const open = (repo: string, p: string) => {
  withRepo(repo, (_, targetPath) => {
    if (isWsl) {
      targetPath = wsl.toWinPath(targetPath)
    }

    opn(targetPath)
  }, p)
}

const search = (repo: string, str: string) => {
  str = str.trim()
  if (!str) {
    return []
  }

  const files = [] as any

  const match = (p: string, str: string) => {
    return p.endsWith('.md') && !p.endsWith('.c.md') && new RegExp(str, 'i').test(fs.readFileSync(p, 'utf-8'))
  }

  const travelFiles = (location: string, basePath: string) => {
    if (!fs.statSync(location).isDirectory()) {
      return
    }

    const list = fs.readdirSync(location).filter(x => !x.startsWith('.') && !ignorePath.test(x))

    list.forEach(x => {
      const p = path.join(location, x)

      if (fs.statSync(p).isDirectory()) {
        travelFiles(p, basePath)
      } else if (fs.statSync(p).isFile()) {
        if (match(p, str)) {
          files.push({
            repo,
            name: x,
            path: getRelativePath(basePath, p),
            type: 'file',
          })
        }
      }
    })
  }

  withRepo(repo, repoPath => {
    travelFiles(repoPath, repoPath)
  })

  return files
}

export default {
  read,
  write,
  rm,
  mv,
  exists,
  hash,
  checkHash,
  upload,
  tree,
  open,
  search,
}
