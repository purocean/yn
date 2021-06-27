import Mitt from 'mitt'

export const bus = Mitt()
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
