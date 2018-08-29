const fs = require('fs')
const path = require('path')

const configFile = path.join(__dirname, '../', 'config.json')

const writeJson = data => {
    fs.writeFileSync(configFile, JSON.stringify(data, null, 4), 'utf8');
}

const readJson = () => {
    try {
        const data = fs.readFileSync(configFile)
        return JSON.parse(data.toString())
    } catch (error) {
        return null
    }
}

const set = (key, value) => {
    const config = readJson() || {}
    config[key] = value
    writeJson(config)
}

exports.set = set

exports.get = (key, defaultVal = null) => {
    const config = readJson() || {}

    if (config[key] === undefined) {
        set(key, defaultVal) // 写入默认值到配置文件

        return defaultVal
    }

    return config[key]
}
