import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'
import { getActionHandler } from '@fe/core/action'
import { decrypt } from '@fe/utils/crypto'
import { getSetting, setSetting } from '@fe/services/setting'
import { refresh } from '@fe/services/view'
import { FLAG_DEMO, MODE } from '@fe/support/args'
import ga from '@fe/support/ga'

interface License {
  name: string,
  email: string,
  hash: string,
  activateExpires: number,
  expires: number,
}

let purchased: boolean | null = null

function parseLicense (licenseStr: string) {
  const error = new Error('Invalid License')

  if (!licenseStr) {
    return null
  }

  try {
    licenseStr = [...licenseStr].reverse().join('')
    licenseStr = CryptoJS.enc.Hex.parse(licenseStr).toString(CryptoJS.enc.Utf8)

    if (licenseStr.length < 40) {
      return null
    }

    const { content } = decrypt(
      licenseStr.substring(32),
      licenseStr.substring(0, 32)
    )

    const leading = 'yank-note-license'
    if (content.startsWith(leading)) {
      return JSON.parse(content.replace(leading, '')) as License
    } else {
      throw error
    }
  } catch {
    throw error
  }
}

export function getPurchased (force = false) {
  if (!force && typeof purchased === 'boolean') {
    return purchased
  }

  if (FLAG_DEMO || MODE === 'share-preview') {
    return true
  }

  purchased = !!getLicenseInfo()

  return purchased
}

export function showPremium () {
  getActionHandler('premium.show')()
  ga.logEvent('yn_premium_show', { purchased: getPurchased() })
}

export function getLicenseInfo () {
  try {
    const licenseStr = getSetting('license')
    const info = parseLicense(licenseStr!)

    if (info) {
      ga.setUserProperties({
        expires: dayjs(info.expires).format('YYYY-MM-DD'),
        hash: info.hash,
      })
    }

    return info
  } catch (error) {
    console.error(error)
  }

  return null
}

export async function setLicense (licenseStr: string) {
  async function getTime () {
    const time = await fetch('http://worldclockapi.com/api/json/est/now').then(r => r.json())
    return dayjs(time.currentDateTime).valueOf()
  }

  const license = parseLicense(licenseStr)

  const now = await getTime()
  if (!license || now > license.activateExpires) {
    throw new Error('Invalid License')
  }

  await setSetting('license', licenseStr)
  refresh()
}
