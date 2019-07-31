const get = function (key, defaultValue) {
  try {
    return typeof window.localStorage[key] === 'undefined' ? defaultValue : JSON.parse(window.localStorage[key])
  } catch (error) {
    return defaultStatus
  }
}

const set = function (key, value) {
  window.localStorage[key] = JSON.stringify(value)
}

export default {
  set,
  get
}
