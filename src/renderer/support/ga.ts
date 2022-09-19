import { v4 as uuid } from 'uuid'
import * as storage from '@fe/utils/storage'
import { FirebaseAnalyticsJS } from '@fe/others/google-analytics'
import ctx from '@fe/context'

const measurementId = 'G-7M1Y4FTCKM'
const gaClientKey = '_ga-client-id'
const clientId = storage.get(gaClientKey, uuid())
storage.set(gaClientKey, clientId)

const ga = new FirebaseAnalyticsJS({ measurementId }, {
  clientId,
  screenRes: `${window.screen.width}x${window.screen.height}`,
  customArgs: {
    uafvl: navigator.userAgent,
    'ep.app_name': 'Yank Note',
    'ep.app_version': ctx.version,
    'ep.yn_theme': { toString: () => ctx.theme.getThemeName() } as string,
    'ep.yn_lang': { toString: () => ctx.i18n.getCurrentLanguage() } as string,
  },
})

export default ga
