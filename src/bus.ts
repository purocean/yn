export const bus = require('mitt')()
export const call = (event: string, ...args: any[]) => {
  let result: any

  bus.emit(event, {
    args,
    callback: (res: any) => {
      result = res
    }
  })

  return result
}
