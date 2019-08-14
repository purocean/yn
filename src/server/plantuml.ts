import config from './config'
import * as request from 'request'
const plantuml = require('node-plantuml')

const generate = (data: any) => {
  const api = config.get('plantuml-api', 'local')

  if (api === 'local') {
    const gen = plantuml.generate(data, {format: 'png'});
    return gen.out
  } else {
    return request(api.replace('{data}', encodeURIComponent(data)))
  }
}

export default {
  generate
}
