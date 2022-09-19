import { v4 as uuid } from 'uuid'
import * as storage from '@fe/utils/storage'
import { FirebaseAnalyticsJS } from '@fe/others/google-analytics'

const measurementId = 'G-7M1Y4FTCKM'
const gaClientKey = '_ga-client-id'
const clientId = storage.get(gaClientKey, uuid())
storage.set(gaClientKey, clientId)

const ga = new FirebaseAnalyticsJS({ measurementId }, { clientId })

export default ga
