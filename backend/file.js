const fs = require('fs')
const xfs = require('fs-extra')
const path = require('path')
const opn = require('opn')
const isWsl = require('is-wsl')
const wsl = require('./wsl')
const repository = require('./repository')

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

    if (repo === 'trash') {
        p = path.join(__dirname, '/../trash/', p)
    } else {
        const basePath = repository.getPath(repo)
        if (!basePath) {
            throw new Error(`仓库 ${repo} 不存在`)
        }

        p = path.join(basePath, p)
    }

    return p
}

const travels = (location, repo, basePath = null) => {
    if (!basePath) {
        basePath = resolvePath('', repo)
    }

    if (!fs.statSync(location).isDirectory()) {
        return []
    }

    const list = fs.readdirSync(location).filter(x => !x.startsWith('.'))

    const dirs = list.filter(x => fs.statSync(path.join(location, x)).isDirectory())
    const files = list.filter(x => !fs.statSync(path.join(location, x)).isDirectory())

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

exports.read = p => {
    return fs.readFileSync(resolvePath(p))
}

exports.write = (p, content) => {
    p = resolvePath(p)

    mkdirPSync(path.dirname(p))

    fs.writeFileSync(p, content)
}

exports.rm = p => {
    if (resolvePath(p) !== resolvePath('')) {
        const newPath = resolvePath(p, 'trash') + '.' + (new Date).getTime()

        mkdirPSync(path.dirname(newPath))

        try {
            fs.renameSync(resolvePath(p), newPath)
        } catch (error) {
            xfs.moveSync(resolvePath(p), newPath)
        }
    }
}

exports.mv = (oldPath, newPath) => {
    oldPath = resolvePath(oldPath)
    newPath = resolvePath(newPath)

    if (oldPath !== newPath) {
        mkdirPSync(path.dirname(newPath))

        try {
            fs.renameSync(oldPath, newPath)
        } catch (error) {
            xfs.moveSync(oldPath, newPath)
        }
    }
}

exports.exists = p => {
    return fs.existsSync(resolvePath(p))
}

exports.upload = (file, path) => {
    exports.write(path, fs.readFileSync(file.path))
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

exports.open = p => {
    let path = resolvePath(p)

    if (isWsl) {
        path = wsl.toWinPath(path)
    }

    opn(path)
}

exports.search = str => {
    str = str.trim()
    if (!str) {
        return []
    }

    const files = []
    const basePath = resolvePath('')

    const match = (p, str) => {
        return p.endsWith('.md') && !p.endsWith('.c.md') && new RegExp(str, 'i').test(fs.readFileSync(p, 'utf-8'))
    }

    const travelFiles = location => {
        if (!fs.statSync(location).isDirectory()) {
            return
        }

        const list = fs.readdirSync(location).filter(x => !x.startsWith('.'))

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

    travelFiles(resolvePath(''))

    return files
}
