import { createI18n } from 'vue-i18n'
import ko from './locales/ko'
import en from './locales/en'
import ja from './locales/ja'
import zh from './locales/zh'

const LOCALE_KEY = 'bts:locale:v1'

export const SUPPORTED_LOCALES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文(简体)' },
]

function getSavedLocale() {
  const saved = localStorage.getItem(LOCALE_KEY)
  return SUPPORTED_LOCALES.some((l) => l.code === saved) ? saved : 'ko'
}

export const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: 'ko',
  messages: { ko, en, ja, zh },
})

export function setLocale(localeCode) {
  if (!SUPPORTED_LOCALES.some((l) => l.code === localeCode)) return
  i18n.global.locale.value = localeCode
  localStorage.setItem(LOCALE_KEY, localeCode)
  document.documentElement.lang = localeCode
}

export function getCurrentLocale() {
  return i18n.global.locale.value
}
