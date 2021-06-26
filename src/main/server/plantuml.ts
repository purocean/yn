import request from 'request'
import fs from 'fs'
import path from 'path'
import { PlantUmlPipe } from 'plantuml-pipe'
import commandExists from 'command-exists'
import { addDefaultsToOptions } from 'plantuml-pipe/dist/plantuml_pipe_options'
import config from '../config'
import { convertAppPath } from '../helper'
import { ASSETS_DIR } from '../constant'

export default async function (data: any) {
  try {
    await commandExists('java')
  } catch {
    throw fs.createReadStream(path.join(ASSETS_DIR, 'no-java-runtime.png'))
  }

  const api = config.get('plantuml-api', 'local')

  if (api === 'local') {
    const puml = new PlantUmlPipe({
      outputFormat: 'png',
      plantUmlArgs: ['-charset', 'UTF-8'],
      jarPath: convertAppPath(addDefaultsToOptions({}).jarPath)
    })

    puml.in.write(data)
    puml.in.end()

    return puml.out
  } else {
    return request(api.replace('{data}', encodeURIComponent(data)))
  }
}
