const config = require('./config')

exports.list = () => {
    return Object.keys(config.get('repositories', []))
}
