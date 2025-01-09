import { getCurrentInstance, onBeforeUnmount, ref, triggerRef } from 'vue'
import { Flat, Language, MsgPath, mergeLanguage as _mergeLanguage, translate, getText } from '@share/i18n'
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
 * Dynamic translate
 * @param path
 * @param args
 * @returns
 */
export function $$t (path: MsgPath, ...args: string[]): string {
  return Object.freeze({
    toString: () => t(path, ...args),
    toJson: () => JSON.stringify(t(path, ...args))
  }) as any
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

/**
 * create i18n
 * @param data - language data
 * @param defaultLanguage - default language
 * @returns { t, $t, $$t }, t is translate function, $t is ref of t, $$t is dynamic translate function
 */
export function createI18n <T extends Record<string, any>> (data: { [lang in Language]?: T }, defaultLanguage: Language = 'en') {
  type _MsgPath = keyof Flat<T>

  const _t = (path: _MsgPath, ...args: string[]) => {
    const language = data[getCurrentLanguage()] || data[defaultLanguage]
    if (language) {
      return getText(language, path as any, ...args)
    } else {
      return path
    }
  }

  const $t = ref(_t.bind(null))

  const update = () => {
    triggerRef($t)
  }

  if (($t as any)?.dep?.sc !== 0) {
    throw new Error('we depend on vue inner implementation, please check the vue version.')
  }

  // now we use a dep to track the language change.
  Object.defineProperty(($t as any).dep, 'sc', {
    get () {
      return this._sc || 0
    },
    set (v) {
      if (!this._ready && v > 0) {
        // when some vue component use $t, we register the hook.
        registerHook('I18N_CHANGE_LANGUAGE', update)
        this._ready = true
      } else if (this._ready && v === 0) {
        // when no vue component use $t, we remove the hook.
        removeHook('I18N_CHANGE_LANGUAGE', update)
        this._ready = false
      }

      this._sc = v
    }
  })

  function $$t (path: _MsgPath, ...args: string[]): string {
    return Object.freeze({
      toString: () => _t(path, ...args),
      toJson: () => JSON.stringify(_t(path, ...args))
    }) as any
  }

  return Object.defineProperties({}, {
    t: { value: _t },
    $t: { value: $t },
    $$t: { value: $$t },
  })
}

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $t: typeof t;
  }
}
