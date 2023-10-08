import { AppLicenseClient, decodeDevice } from 'app-license'
import request from 'request'
import { API_BASE_URL, PREMIUM_PUBLIC_KEY } from '../../share/misc'
import { getAction } from '../action'

const SERVER_BASE_URL = API_BASE_URL + '/api/premium'

export async function fetchApi (url: string, payload: any) {
  const agent = await getAction('get-proxy-agent')(url)
  return new Promise((resolve, reject) => {
    request(
      {
        agent,
        url: SERVER_BASE_URL + url,
        method: 'POST',
        json: true,
        body: payload,
      },
      (err, _res, body) => {
        if (err) {
          reject(err)
        } else {
          if (!body || !body.status) {
            reject(new Error('Invalid response'))
            return
          }

          const { data, message, status } = body
          if (status !== 'ok') {
            reject(new Error(message))
          } else {
            resolve(data)
          }
        }
      }
    )
  })
}

const client = new AppLicenseClient({
  publicKey: PREMIUM_PUBLIC_KEY,
  async fetchAdapter (method: string, payload: any): Promise<any> {
    return fetchApi(`/${method}`, payload)
  },
})

export async function fetchToken (payload: {licenseId: string}): Promise<string> {
  const data = await client.fetchToken(payload.licenseId)
  return data.toString()
}

export function removeDevice (payload: {licenseId: string, device: string}) {
  return client.removeDevice(payload.licenseId, payload.device)
}

export function addDevice (payload: {licenseId: string}) {
  return client.addDevice(payload.licenseId)
}

export function fetchDevices (payload: {licenseId: string}) {
  return client.fetchDevices(payload.licenseId)
}

export function upgradeLicense (payload: {oldLicense: string, locale: string}) {
  return fetchApi('/upgrade-license', payload)
}

export async function checkDevice (payload: { device: string }) {
  const device = decodeDevice(await genDeviceString())
  const _device = decodeDevice(payload.device)
  if (device.id !== _device.id || device.platform !== _device.platform) {
    throw new Error('INVALID_LICENSE')
  }
}

export function genDeviceString () {
  return client.genDeviceString()
}
