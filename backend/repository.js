const config = require('./config')

exports.list = () => {
    return config.get('repositories', {})
}
