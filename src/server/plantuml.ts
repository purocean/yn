import * as request from 'request'
import { PlantUmlPipe } from 'plantuml-pipe'
import { addDefaultsToOptions } from 'plantuml-pipe/dist/plantuml_pipe_options'
import config from './config'
import { convertAppPath } from '../helper'

const generate = (data: any) => {
  const api = config.get('plantuml-api', 'local')

  if (api === 'local') {
    const puml = new PlantUmlPipe({
      outputFormat: 'png',
      plantUmlArgs: [ '-charset', 'UTF-8' ],
      jarPath: convertAppPath(addDefaultsToOptions({}).jarPath)
    })

    puml.in.write(data)
    puml.in.end()

    return puml.out
  } else {
    return request(api.replace('{data}', encodeURIComponent(data)))
  }
}

export default {
  generate
}
