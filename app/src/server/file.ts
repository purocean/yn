import * as fs from 'fs'
import * as xfs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import * as NaturalOrderby from 'natural-orderby'
import * as wsl from './wsl'
import repository from './repository'
const opn = require('opn')

const isWsl = wsl.isWsl
const ignorePath = /node_modules/

const mkdirPSync = (location: string) => {
  let normalizedPath = path.normalize(location)
  let parsedPathObj = path.parse(normalizedPath)
  let curDir = parsedPathObj.root
  let folders = parsedPathObj.dir.split(path.sep)
  folders.push(parsedPathObj.base)
  for(let part of folders) {
    if (part.indexOf(':') > -1) { // 修复 Windows 下面路径错误
      continue
    }

    curDir = path.join(curDir, part)
    if (!fs.existsSync(curDir)) {
      fs.mkdirSync(curDir)
    }
  }
}

const rmRecursiveSync = (location: string) => {
  if (fs.statSync(location).isDirectory()) {
    let _ = fs.readdirSync(location)
    _.forEach(childItemName => {
      rmRecursiveSync(path.join(location, childItemName))
    })
    fs.rmdirSync(location)
  } else {
    fs.unlinkSync(location)
  }
}

const resolvePath = (p: string, repo = 'main') => {
  p = p.replace(/\.\./g, '')

  const basePath = repository.getPath(repo)
  if (!basePath) {
    throw new Error(`仓库 ${repo} 不存在`)
  }

  return path.join(basePath, p)
}

const travels = (location: string, repo: string, basePath: string = null): any => {
  if (!basePath) {
    basePath = resolvePath('', repo)
  }

  if (!fs.statSync(location).isDirectory()) {
    return []
  }

  const list = fs.readdirSync(location).filter(x => !x.startsWith('.') && !ignorePath.test(x))

  const dirs = NaturalOrderby.orderBy(list.filter(x => fs.statSync(path.join(location, x)).isDirectory()), (v: any) => v.name)
  const files = NaturalOrderby.orderBy(list.filter(x => !fs.statSync(path.join(location, x)).isDirectory()), (v: any) => v.name)

  return dirs.map(x => {
    const p = path.join(location, x)
    const xpath = p.replace(basePath, '').replace(/\\/g, '/')

    return {
      name: x,
      path: xpath,
      type: 'dir',
      repo: repo,
      children: travels(p, repo, basePath)
    }
  }).concat(files.map(x => {
    const p = path.join(location, x)
    const xpath = p.replace(basePath, '').replace(/\\/g, '/')

    return {
      name: x,
      path: xpath,
      type: 'file',
      repo: repo,
    } as any
  }))
}

const read = (repo: string, p: string) => {
  return fs.readFileSync(resolvePath(p, repo))
}

const write = (repo: string, p: string, content: any) => {
  p = resolvePath(p, repo)

  mkdirPSync(path.dirname(p))

  fs.writeFileSync(p, content)

  return crypto.createHash('md5').update(content).digest('hex')
}

const rm = (repo: string, p: string) => {
  if (resolvePath(p) !== resolvePath('', repo)) {
    const newPath = path.join(repository.getTrashPath(repo), p.replace(/\.\./g, '')) + '.' + (new Date).getTime()

    mkdirPSync(path.dirname(newPath))

    try {
      fs.renameSync(resolvePath(p, repo), newPath)
    } catch (error) {
      xfs.moveSync(resolvePath(p, repo), newPath)
    }
  }
}

const mv = (repo: string, oldPath: string, newPath: string) => {
  oldPath = resolvePath(oldPath, repo)
  newPath = resolvePath(newPath, repo)

  if (oldPath !== newPath) {
    mkdirPSync(path.dirname(newPath))

    try {
      fs.renameSync(oldPath, newPath)
    } catch (error) {
      xfs.moveSync(oldPath, newPath)
    }
  }
}

const exists = (repo: string, p: string) => {
  return fs.existsSync(resolvePath(p, repo))
}

const hash = (repo: string, p: string) => {
  const content = read(repo, p)
  return crypto.createHash('md5').update(content).digest('hex')
}

const checkHash = (repo: string, p: string, oldHash: string) => {
  return oldHash === hash(repo, p)
}

const upload = (repo: string, file: any, path: string) => {
  write(repo, path, fs.readFileSync(file.path))
}

const tree = (repo: string) => {
  return [{
    name: '/',
    type: 'dir',
    path: '/',
    repo: repo,
    children: travels(resolvePath('', repo), repo)
  }]
}

const open = (repo: string, p: string) => {
  let path = resolvePath(p, repo)

  if (isWsl) {
    path = wsl.toWinPath(path)
  }

  opn(path)
}

const search = (repo: string, str: string) => {
  str = str.trim()
  if (!str) {
    return []
  }

  const files = [] as any
  const basePath = resolvePath('', repo)

  const match = (p: string, str: string) => {
    return p.endsWith('.md') && !p.endsWith('.c.md') && new RegExp(str, 'i').test(fs.readFileSync(p, 'utf-8'))
  }

  const travelFiles = (location: string) => {
    if (!fs.statSync(location).isDirectory()) {
      return
    }

    const list = fs.readdirSync(location).filter(x => !x.startsWith('.') && !ignorePath.test(x))

    list.forEach(x => {
      const p = path.join(location, x)

      if (fs.statSync(p).isDirectory()) {
        travelFiles(p)
      } else if (fs.statSync(p).isFile()) {
        if (match(p, str)) {
          files.push({
            repo,
            name: x,
            path: p.replace(basePath, '').replace(/\\/g, '/'),
            type: 'file',
          })
        }
      }
    })
  }

  travelFiles(resolvePath('', repo))

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
