const fs = require('fs')
const xfs = require('fs-extra')
const path = require('path')
const opn = require('opn')
const isWsl = require('is-wsl')
const crypto = require('crypto')
const NaturalOrderby = require('natural-orderby')
const wsl = require('./wsl')
const repository = require('./repository')

const ignorePath = /node_modules/

const mkdirPSync = location => {
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

const rmRecursiveSync = location => {
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

const resolvePath = (p, repo = 'main') => {
    p = p.replace(/\.\./g, '')

    const basePath = repository.getPath(repo)
    if (!basePath) {
        throw new Error(`仓库 ${repo} 不存在`)
    }

    return path.join(basePath, p)
}

const travels = (location, repo, basePath = null) => {
    if (!basePath) {
        basePath = resolvePath('', repo)
    }

    if (!fs.statSync(location).isDirectory()) {
        return []
    }

    const list = fs.readdirSync(location).filter(x => !x.startsWith('.') && !ignorePath.test(x))

    const dirs = NaturalOrderby.orderBy(list.filter(x => fs.statSync(path.join(location, x)).isDirectory()))
    const files = NaturalOrderby.orderBy(list.filter(x => !fs.statSync(path.join(location, x)).isDirectory()))

    return dirs.map(x => {
        const p = path.join(location, x)
        const xpath = p.replace(basePath, '')

        return {
            name: x,
            path: xpath,
            type: 'dir',
            repo: repo,
            children: travels(p, repo, basePath)
        }
    }).concat(files.map(x => {
        const p = path.join(location, x)
        const xpath = p.replace(basePath, '')

        return {
            name: x,
            path: xpath,
            type: 'file',
            repo: repo,
        }
    }))
}

exports.read = (repo, p) => {
    return fs.readFileSync(resolvePath(p, repo))
}

exports.write = (repo, p, content) => {
    p = resolvePath(p, repo)

    mkdirPSync(path.dirname(p))

    fs.writeFileSync(p, content)

    return crypto.createHash('md5').update(content).digest('hex')
}

exports.rm = (repo, p) => {
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

exports.mv = (repo, oldPath, newPath) => {
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

exports.exists = (repo, p) => {
    return fs.existsSync(resolvePath(p, repo))
}

exports.hash = (repo, p) => {
    const content = exports.read(repo, p)
    return crypto.createHash('md5').update(content).digest('hex')
}

exports.checkHash = (repo, p, oldHash) => {
    return oldHash === exports.hash(repo, p)
}

exports.upload = (repo, file, path) => {
    exports.write(repo, path, fs.readFileSync(file.path))
}

exports.tree = repo => {
    return [{
        name: '/',
        type: 'dir',
        path: '/',
        repo: repo,
        children: travels(resolvePath('', repo), repo)
    }]
}

exports.open = (repo, p) => {
    let path = resolvePath(p, repo)

    if (isWsl) {
        path = wsl.toWinPath(path)
    }

    opn(path)
}

exports.search = (repo, str) => {
    str = str.trim()
    if (!str) {
        return []
    }

    const files = []
    const basePath = resolvePath('', repo)

    const match = (p, str) => {
        return p.endsWith('.md') && !p.endsWith('.c.md') && new RegExp(str, 'i').test(fs.readFileSync(p, 'utf-8'))
    }

    const travelFiles = location => {
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
                        name: x,
                        path: p.replace(basePath, ''),
                        type: 'file',
                    })
                }
            }
        })
    }

    travelFiles(resolvePath('', repo))

    return files
}
