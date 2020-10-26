const get = function (key: string, defaultValue?: any) {
  try {
    return typeof window.localStorage[key] === 'undefined' ? defaultValue : JSON.parse(window.localStorage[key])
  } catch (error) {
    return defaultStatus
  }
}

const set = function (key: string, value: any) {
  window.localStorage[key] = JSON.stringify(value)
}

export default {
  set,
  get
}
