const fs = require('fs')
const path = require('path')

const configFile = path.join(__dirname, '../', 'config.json')

const writeJson = (data, call = () => {}) => {
    fs.writeFile(configFile, JSON.stringify(data), 'utf8', call);
}

const readJson = () => {
    try {
        const data = fs.readFileSync(configFile)
        return JSON.parse(data.toString())
    } catch (error) {
        return null
    }
}

exports.set = (key, value) => {
    const config = readJson()
    config[key] = value
    writeJson(config)
}

exports.get = (key, defaultVal = null) => {
    const config = readJson()

    return config[key] === undefined ? defaultVal : config[key]
}
