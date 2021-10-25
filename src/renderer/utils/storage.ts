const get = function (key: string, defaultValue?: any) {
  try {
    return typeof window.localStorage[key] === 'undefined' ? defaultValue : JSON.parse(window.localStorage[key])
  } catch (error) {
    return defaultValue
  }
}

const set = function (key: string, value: any) {
  window.localStorage[key] = JSON.stringify(value)
}

const remove = function (key: string) {
  window.localStorage.removeItem(key)
}

const getAll = function () {
  return window.localStorage
}

const clear = function () {
  window.localStorage.clear()
}

export default {
  clear,
  remove,
  getAll,
  set,
  get
}
