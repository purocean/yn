import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import { registerHook } from '@fe/core/hook'
import { getCurrentLanguage } from '@fe/services/i18n'

export * as lodash from 'lodash-es'
export * as vue from 'vue'
export { default as yaml } from 'yaml'
export { default as semver } from 'semver'
export { default as dayjs } from 'dayjs'
export { default as cryptojs } from 'crypto-js'
export { default as turndown } from 'turndown'
export { default as juice } from 'juice'
export { default as sortablejs } from 'sortablejs'
export { default as filenamify } from 'filenamify/browser'
export { default as mime } from 'mime'
export { default as markdownit } from 'markdown-it'
export { default as domtoimage } from 'dom-to-image'
export { default as pako } from 'pako'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

function setDayjsLang () {
  dayjs.locale(getCurrentLanguage() === 'zh-CN' ? 'zh-cn' : 'en')
}

setDayjsLang()
registerHook('I18N_CHANGE_LANGUAGE', setDayjsLang)
