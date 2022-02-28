import * as crypto from 'crypto'
import jwt from 'jsonwebtoken'
import config from './config'

interface Payload {
  role: 'admin' | 'guest'
}

const HEAD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'

function getKey () {
  return config.get('server.jwt-secret', crypto.randomBytes(16).toString('hex'))
}

export function getToken (payload: Payload, expiresIn?: string | number) {
  return jwt.sign(payload, getKey(), { algorithm: 'HS256', expiresIn }).substring(HEAD.length + 1)
}

export function verify (token: string) {
  return jwt.verify(HEAD + '.' + token, getKey(), { complete: false }) as Payload
}
