import { PassThrough } from 'stream'
export const convertAppPath = (path: string) => path.replace('app.asar', 'app.asar.unpacked')

export function mergeStreams (streams: NodeJS.ReadableStream[]) {
  let pass = new PassThrough()
  let waiting = streams.length
  for (const stream of streams) {
    pass = stream.pipe(pass, { end: false })
    stream.once('end', () => --waiting === 0 && pass.emit('end'))
  }
  return pass
}
