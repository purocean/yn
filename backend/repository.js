const path = require('path')
const config = require('./config')

exports.list = () => {
    return config.get('repositories', {})
}

exports.getPath = name => {
    let p = config.get('repositories', {})[name]

    if (!p) {
        return null
    }

    if (path.isAbsolute(p)) {
        return p
    }

    return path.join(__dirname, '../', p)
}
