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
            rmRecursiveSync(path.join(location, childItemName));
        })
        fs.rmdirSync(location);
    } else {
        fs.unlinkSync(location);
    }
}

const resolvePath = p => {
    p = __dirname + '/../data/' + p.replace(/\.\./g, '')

    return path.resolve(p)
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
    p = resolvePath(p)

    rmRecursiveSync(p)
}
