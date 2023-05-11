import { LicenseToken } from 'app-license'
import { PREMIUM_PUBLIC_KEY } from '@share/misc'
import { getActionHandler } from '@fe/core/action'
import * as api from '@fe/support/api'
import { getSetting, setSetting } from '@fe/services/setting'
import { refresh } from '@fe/services/view'
import { FLAG_DEMO, FLAG_MAS, MODE } from '@fe/support/args'
import ga from '@fe/support/ga'
import { getLogger, md5 } from '@fe/utils'
import { registerHook } from '@fe/core/hook'
import { useToast } from '@fe/support/ui/toast'
import type { PremiumTab } from '@fe/types'
import { getCurrentLanguage } from '@fe/services/i18n'

const tokenPrefix = 'ynkv2:'
const logger = getLogger('premium')

let licenseToken: LicenseToken | null | undefined
let upgradeTryCount = 0

type Payload = {
  fetchToken: { licenseId: string }
  removeDevice: { licenseId: string, device: string }
  addDevice: { licenseId: string }
  fetchDevices: { licenseId: string }
  upgradeLicense: { oldLicense: string, locale: string }
}

export async function requestApi<T extends keyof Payload> (method: T, payload: Payload[T]) {
  const { data } = await api.fetchHttp('/api/premium', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, payload }),
  })

  return data
}

async function fetchToken (licenseId: string) {
  const token = await requestApi('fetchToken', { licenseId })
  return new LicenseToken(token, { publicOrPrivateKey: PREMIUM_PUBLIC_KEY })
}

function syncCacheLicenseToken (token: LicenseToken | null) {
  logger.debug('syncCacheLicenseToken', !!token)
  const oldToken = licenseToken
  licenseToken = token

  if (oldToken?.status !== token?.status) {
    refresh()
  }

  return licenseToken
}

export function tokenAvailableDays (token: LicenseToken) {
  return Math.floor((token.expires.getTime() - Date.now()) / 1000 / 60 / 60 / 24)
}

export function tokenIsExpiredSoon (token: LicenseToken) {
  if (FLAG_MAS) {
    return false
  }

  const days = tokenAvailableDays(token)

  return days <= 3 && days >= 0
}

export function tokenIsStaleSoon (token: LicenseToken) {
  if (token.status === 'stale') {
    return false
  }

  if (!token.fetchedAt.getTime()) {
    return true
  }

  // if fetched at 25 days ago, it's stale soon
  // if (token.fetchedAt.getTime() < Date.now() - 1000 * 60 * 60 * 24 * 25) {
  //   return true
  // }

  return false
}

async function upgradeV1License (oldLicense: string) {
  logger.debug('upgradeV1License', oldLicense)
  if (licenseToken) {
    return
  }

  if (upgradeTryCount >= 1) {
    return
  }

  upgradeTryCount++

  try {
    const licenseId = await requestApi('upgradeLicense', { oldLicense, locale: getCurrentLanguage() })
    await activateLicense(licenseId)
    useToast().show('info', 'License upgraded successfully')
    showPremium('activation')
  } catch (error) {
    useToast().show('warning', `License upgrade failed, please contact support [${error}]`, 6000)
  }
}

export function getPurchased (force = false) {
  logger.debug('getPurchased', force)
  if (FLAG_DEMO || MODE === 'share-preview') {
    return true
  }

  let token = licenseToken
  if (typeof token === 'undefined' || force) {
    token = getLicenseToken()
  }

  return !!(token?.isAvailable)
}

export function showPremium (tab?: PremiumTab) {
  logger.debug('showPremium', tab)
  upgradeTryCount = 0
  getActionHandler('premium.show')(tab)
  ga.logEvent('yn_premium_show', { purchased: getPurchased() })
}

export function getLicenseToken () {
  logger.debug('getLicenseToken')
  try {
    const tokenStr = getSetting('license')
    if (!tokenStr) {
      return syncCacheLicenseToken(null)
    }

    if (!tokenStr.startsWith(tokenPrefix)) {
      upgradeV1License(tokenStr)
      return syncCacheLicenseToken(null)
    }

    const token = new LicenseToken(
      tokenStr.slice(tokenPrefix.length),
      { publicOrPrivateKey: PREMIUM_PUBLIC_KEY }
    )

    ga.setUserProperties({
      expires: token.expires.toLocaleDateString(),
      hash: md5(token.licenseId),
    })

    return syncCacheLicenseToken(token)
  } catch (error) {
    logger.error('getLicenseToken', error)
  }

  return syncCacheLicenseToken(null)
}

async function cleanLicense () {
  logger.debug('cleanLicense')
  // do not clean old license
  if (!getSetting('license', '').startsWith(tokenPrefix)) {
    return
  }

  await setSetting('license', '')
}

async function setLicense (licenseId: string) {
  logger.debug('setLicense', licenseId)
  try {
    if (!licenseId) {
      return
    }

    try {
      const token = await fetchToken(licenseId)

      if (!token.isAvailable) {
        throw new Error(`Error, license status [${token.status}]`)
      }

      await setSetting('license', tokenPrefix + token.toString())
    } catch (error: any) {
      if (error.message === 'DEVICE_NOT_FOUND' || error.message === 'INVALID_LICENSE') {
        await cleanLicense()
      }

      throw error
    }
  } catch (error: any) {
    logger.error('setLicense', error)
    throw error
  } finally {
    getPurchased(true)
  }
}

export async function refreshLicense (opts?: { throwError?: boolean }) {
  logger.debug('refreshLicense', opts)
  try {
    const token = getLicenseToken()
    if (token) {
      await setLicense(token.licenseId)
    }
  } catch (error) {
    if (opts?.throwError) {
      throw error
    } else {
      logger.error('refreshLicense', error)
    }
  }
}

export async function activateLicense (licenseId: string) {
  logger.debug('activateLicense', licenseId)
  await requestApi('addDevice', { licenseId })
  await setLicense(licenseId)
}

function checkLicenseStatus () {
  logger.debug('checkLicenseStatus')
  const token = getLicenseToken()
  if (token) {
    if (token.status === 'stale') {
      useToast().show('warning', 'License unrecognized, please refresh')
      showPremium('activation')
    } else if (token.status === 'expired') {
      useToast().show('warning', 'License expired, please renew')
      showPremium('activation')
    } else if (tokenIsStaleSoon(token)) {
      useToast().show('warning', 'License unrecognized, please refresh')
      showPremium('activation')
    } else if (tokenIsExpiredSoon(token)) {
      useToast().show('warning', 'License expires soon, please renew')
      showPremium('activation')
    }
  }
}

async function refreshAndCheckLicenseStatus () {
  if (FLAG_DEMO || MODE === 'share-preview') {
    return
  }

  logger.debug('refreshAndCheckLicenseStatus')
  try {
    await refreshLicense()
  } finally {
    checkLicenseStatus()
  }
}

registerHook('STARTUP', refreshAndCheckLicenseStatus)
setInterval(refreshAndCheckLicenseStatus, 1000 * 60 * 60 * 6) // 6 hours
