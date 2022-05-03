import { getCurrentInstance, onBeforeUnmount, ref, triggerRef } from 'vue'
import { Language, MsgPath, mergeLanguage as _mergeLanguage, translate } from '@share/i18n'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import * as storage from '@fe/utils/storage'
import { LanguageName } from '@fe/types'

const STORAGE_KEY = 'app.language'
let lang: LanguageName & string = storage.get<LanguageName>(STORAGE_KEY, 'system')

/**
 * Get current used language.
 */
export function getCurrentLanguage (): Language {
  return lang === 'system' ? (navigator.language as Language) : lang
}

/**
 * Translate
 * @param path
 * @param args
 * @returns
 */
export function t (path: MsgPath, ...args: string[]) {
  return translate(getCurrentLanguage(), path, ...args)
}

/**
 * Get language
 * @returns
 */
export function getLanguage () {
  return lang
}

/**
 * Set language
 * @param language
 */
export function setLanguage (language: LanguageName) {
  lang = language
  storage.set(STORAGE_KEY, language)
  triggerHook('I18N_CHANGE_LANGUAGE', { lang, currentLang: getCurrentLanguage() })
}

/**
 * Merge natural language strings
 * @param lang
 * @param nls
 */
export function mergeLanguage (lang: Language, nls: Record<string, any>) {
  _mergeLanguage(lang, nls)
}

/**
 * For vue setup, auto refresh when language change.
 * @returns
 */
export function useI18n () {
  const $t = ref(t.bind(null))
  const vm = getCurrentInstance()?.proxy

  if (!vm) {
    throw new Error('VM Error')
  }

  Object.defineProperty((vm as any), '$t', {
    get () {
      return $t.value
    },
  })

  const update = () => {
    triggerRef($t)
  }

  registerHook('I18N_CHANGE_LANGUAGE', update)
  onBeforeUnmount(() => {
    removeHook('I18N_CHANGE_LANGUAGE', update)
  })

  return { t, $t, setLanguage, getLanguage }
}

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $t: typeof t;
  }
}
