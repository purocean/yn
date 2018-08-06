const path = require('path')
const config = require('./config')

const configKey = 'repositories'
const defaultVal = {"main": "./data"}

exports.list = () => {
    return config.get(configKey, defaultVal)
}

exports.getPath = name => {
    let p = config.get(configKey, defaultVal)[name]

    if (!p) {
        return null
    }

    if (path.isAbsolute(p)) {
        return p
    }

    return path.join(__dirname, '../', p)
}
