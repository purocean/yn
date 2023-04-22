import { AppLicenseClient } from 'app-license'
import request from 'request'
import { API_BASE_URL, PREMIUM_PUBLIC_KEY } from '../../share/misc'

const SERVER_BASE_URL = API_BASE_URL + '/api/premium'

export function fetchApi (url: string, payload: any) {
  return new Promise((resolve, reject) => {
    request(
      {
        url: SERVER_BASE_URL + url,
        method: 'POST',
        json: true,
        body: payload,
      },
      (err, _res, body) => {
        if (err) {
          reject(err)
        } else {
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
