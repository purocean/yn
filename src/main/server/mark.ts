import config from '../config'

export interface MarkedFile {
  repo: string;
  path: string;
}

const configKey = 'mark'
const defaultVal: MarkedFile[] = []

const list = () => {
  return (config.get(configKey, defaultVal) as MarkedFile[]).map(file => {
    if (!file.path.startsWith('/')) {
      file.path = '/' + file.path
    }

    return file
  })
}

const remove = (file: MarkedFile) => {
  config.set(configKey, list().filter(x => !(x.path === file.path && x.repo === file.repo)))
}

const add = (file: MarkedFile) => {
  remove(file)

  config.set(configKey, [file].concat(list()))
}

export default {
  list,
  add,
  remove,
}
