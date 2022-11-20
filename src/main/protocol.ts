import { protocol, session, ProtocolRequest, UploadData } from 'electron'
import { IncomingMessage, ServerResponse } from 'http'
import { Readable, Transform } from 'stream'

import { APP_NAME } from './constant'

protocol.registerSchemesAsPrivileged([{
  scheme: APP_NAME,
  privileges: {
    supportFetchAPI: true,
    standard: true,
    secure: true,
    allowServiceWorkers: true,
    bypassCSP: true,
    corsEnabled: true,
  }
}])

async function transformBody (data?: UploadData[]): Promise<Buffer | null> {
  if (!data) {
    return null
  }

  let body = Buffer.from([])
  for (const payload of data) {
    if (payload.bytes) {
      body = Buffer.concat([body, payload.bytes])
    } else if (payload.blobUUID) {
      const file = await session.defaultSession.getBlobData(payload.blobUUID)
      body = Buffer.concat([body, file])
    }
  }

  return body
}

export async function transformProtocolRequest (request: ProtocolRequest) {
  const req = new IncomingMessage(null as any)

  req.method = request.method
  req.url = request.url.replace(APP_NAME, 'http')

  Object.keys(request.headers).forEach(key => {
    req.headers[key.toLowerCase()] = request.headers[key]
  })

  const body = await transformBody(request.uploadData)
  if (body) {
    req.headers['content-length'] = body.length.toString()
    req._read = Readable.from(body)._read
  }

  const out = new Transform({
    transform (chunk, encoding, cb) {
      this.push(chunk, encoding)
      cb()
    },
  })

  const res = new ServerResponse(req)
  res.write = out.write.bind(out)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  res.end = out.end.bind(out)

  return { req, res, out }
}
