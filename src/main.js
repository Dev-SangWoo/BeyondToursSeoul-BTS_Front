import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { i18n, setLocale } from './i18n'
import { useAuthStore } from '@/stores/useAuthStore'

const PREF_LANG_TO_LOCALE = {
  '한국어': 'ko',
  'English': 'en',
  '日本語': 'ja',
  '中文': 'zh',
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

const authStore = useAuthStore(pinia)
authStore.hydrate()

const prefLang = authStore.user?.preferredLanguage
if (prefLang && PREF_LANG_TO_LOCALE[prefLang]) {
  setLocale(PREF_LANG_TO_LOCALE[prefLang])
}

app.mount('#app')
