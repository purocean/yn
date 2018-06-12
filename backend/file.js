const fs = require('fs')
const path = require('path')

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

const resolvePath = (p, dir = 'data') => {
    p = __dirname + '/../' + dir + '/' + p.replace(/\.\./g, '')

    return path.resolve(p)
}

const travels = location => {
    if (!fs.statSync(location).isDirectory()) {
        return []
    }

    const list = fs.readdirSync(location).filter(x => !x.startsWith('.'))

    const dirs = list.filter(x => fs.statSync(path.join(location, x)).isDirectory())
    const files = list.filter(x => !fs.statSync(path.join(location, x)).isDirectory())

    return dirs.map(x => {
        const p = path.join(location, x)
        const xpath = p.replace(resolvePath(''), '')

        return {
            name: x,
            path: xpath,
            type: 'dir',
            children: travels(p)
        }
    }).concat(files.map(x => {
        const p = path.join(location, x)
        const xpath = p.replace(resolvePath(''), '')

        return {
            name: x,
            path: xpath,
            type: 'file'
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

        fs.renameSync(resolvePath(p), newPath)
    }
}

exports.mv = (oldPath, newPath) => {
    oldPath = resolvePath(oldPath)
    newPath = resolvePath(newPath)

    if (oldPath !== newPath) {
        mkdirPSync(path.dirname(newPath))

        fs.renameSync(oldPath, newPath)
    }
}

exports.upload = (file, path) => {
    exports.write(path, fs.readFileSync(file.path))
}

exports.tree = () => {
    return [{
        name: '/',
        type: 'dir',
        path: '/',
        children: travels(resolvePath(''))
    }]
}

exports.search = str => {
    const files = []
    const basePath = resolvePath('')

    const match = (p, str) => {
        return p.endsWith('.md') && new RegExp(str, 'i').test(fs.readFileSync(p, 'utf-8'))
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
                    files.push(p.replace(basePath, ''))
                }
            }
        })
    }

    travelFiles(resolvePath(''))

    return files
}
