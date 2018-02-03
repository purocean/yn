const fs = require('fs')
const path = require('path')

const mkdirPSync = location => {
    let normalizedPath = path.normalize(location)
    let parsedPathObj = path.parse(normalizedPath)
    let curDir = parsedPathObj.root
    let folders = parsedPathObj.dir.split(path.sep)
    folders.push(parsedPathObj.base)
    for(let part of folders) {
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

    return fs.readdirSync(location).filter(x => !x.startsWith('.')).map(x => {
        const p = path.join(location, x)
        const xpath = p.replace(resolvePath(''), '')
        if (fs.statSync(p).isDirectory()) {
            return {
                name: x,
                path: xpath,
                type: 'dir',
                children: travels(p)
            }
        } else {
            return {
                name: x,
                path: xpath,
                type: 'file'
            }
        }
    })
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

exports.tree = () => {
    return [{
        name: '/',
        type: 'dir',
        path: '/',
        children: travels(resolvePath(''))
    }]
}
