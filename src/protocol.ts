import { protocol, session, ProtocolRequest, UploadData } from 'electron'
import { IncomingMessage, ServerResponse } from 'http'
import { Readable } from 'stream'
import { Transform } from 'stream'

export const SCHEME = 'yank-note'

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: {
    supportFetchAPI: true,
    standard: true,
    secure: true,
    allowServiceWorkers: true,
    bypassCSP: true,
    corsEnabled: true,
  }
}])

async function transformBody(data?: UploadData[]): Promise<Buffer | null> {
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
  const req = new IncomingMessage(null)

  req.method = request.method
  req.url = request.url.replace('yank-note', 'http')

  Object.keys(request.headers).forEach(key => {
    req.headers[key.toLowerCase()] = request.headers[key]
  })

  const body = await transformBody(request.uploadData)
  if (body) {
    req.headers['content-length'] = body.length.toString()
    req._read = Readable.from(body)._read
  }

  const out = new Transform({
    transform(chunk, encoding, cb) {
      this.push(chunk, encoding)
      cb()
    },
  })

  const res = new ServerResponse(req)
  res.write = out.write.bind(out)
  res.end = out.end.bind(out)

  return { req, res, out }
}
