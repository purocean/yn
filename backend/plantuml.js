const plantuml = require('node-plantuml')
const config = require('./config')
const request = require('request')

exports.generate = data => {
    const api = config.get('plantuml-api', 'local')

    if (api === 'local') {
        const gen = plantuml.generate(data, {format: 'png'});
        return gen.out
    } else {
        return request(api.replace('{data}', encodeURIComponent(data)))
    }
}
