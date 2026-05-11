<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bell, Globe, Settings, UserRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/useAuthStore'
import { personaOptions } from '@/components/ai/input-sheet/aiInputFlowConstants'
import { setLocale } from '@/i18n'
import { isAuthExpiredError } from '@/utils/authFlow'

const LABEL_TO_LOCALE = {
  '한국어': 'ko',
  'English': 'en',
  '日本語': 'ja',
  '中文': 'zh',
}

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const ALARM_KEY = 'bts:settings:alarm'
const languageOptions = ['한국어', 'English', '日本語', '中文']

const language = ref('한국어')
const alarmEnabled = ref(localStorage.getItem(ALARM_KEY) !== 'off')

const modalType = ref('')
const selectedPersona = ref('balanced')
const personaSaving = ref(false)
const personaMessage = ref('')

const menuItems = computed(() => [
  { id: 'lang', icon: Globe, label: t('profile.menu.lang'), value: language.value },
  { id: 'alarm', icon: Bell, label: t('profile.menu.alarm'), value: alarmEnabled.value ? t('profile.alarmOn') : t('profile.alarmOff') },
  { id: 'pref', icon: Settings, label: t('profile.menu.pref'), value: t('profile.prefEditable') },
])

const currentPersonaLabel = computed(() => {
  const id = authStore.user?.localPreference || 'balanced'
  const persona = personaOptions.find((p) => p.id === id)
  return persona ? t(persona.labelKey) : t('ai.persona.balanced')
})

onMounted(async () => {
  try {
    await authStore.loadMe()
    language.value = authStore.user?.preferredLanguage || '한국어'
    selectedPersona.value = authStore.user?.localPreference || 'balanced'
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
    }
  }
})

function openModal(type) {
  modalType.value = type
  personaMessage.value = ''
  if (type === 'pref') {
    selectedPersona.value = authStore.user?.localPreference || 'balanced'
  }
}

function closeModal() {
  modalType.value = ''
  personaMessage.value = ''
}

async function saveLanguage(next) {
  if (!authStore.isAuthenticated) return
  if (!languageOptions.includes(next)) return
  try {
    await authStore.saveProfile({ preferredLanguage: next })
    language.value = next
    setLocale(LABEL_TO_LOCALE[next] ?? 'ko')
    closeModal()
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
  }
}

function saveAlarm(next) {
  alarmEnabled.value = next
  localStorage.setItem(ALARM_KEY, next ? 'on' : 'off')
  closeModal()
}

async function savePersona() {
  if (!authStore.isAuthenticated || personaSaving.value) return
  personaSaving.value = true
  personaMessage.value = ''
  try {
    await authStore.saveProfile({ localPreference: selectedPersona.value })
    personaMessage.value = t('profile.personaSaved')
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
    personaMessage.value = e?.message || t('profile.personaSaveFailed')
  } finally {
    personaSaving.value = false
  }
}

function logout() {
  authStore.clearSession()
  router.replace('/')
}
</script>

<template>
  <div class="profile">
    <header class="profile__header">
      <div class="profile__avatar">
        <UserRound :size="30" :stroke-width="2.1" />
      </div>
      <div>
        <h1>{{ $t('profile.title') }}</h1>
        <p>{{ $t('profile.account') }}</p>
      </div>
    </header>

    <section class="profile__card">
      <p class="profile__name">{{ authStore.user?.nickname || 'Explorer' }}</p>
      <p class="profile__email">{{ authStore.user?.email || $t('profile.loginRequired') }}</p>
      <p class="profile__persona-now">{{ $t('profile.currentPersonaPrefix') }} {{ currentPersonaLabel }}</p>
    </section>

    <section class="profile__menu">
      <button
        v-for="item in menuItems"
        :key="item.id"
        class="profile__menu-item"
        type="button"
        @click="openModal(item.id)"
      >
        <span class="profile__menu-left">
          <component :is="item.icon" :size="16" :stroke-width="2.2" />
          <span>{{ item.label }}</span>
        </span>
        <span class="profile__menu-value">{{ item.value }}</span>
      </button>
    </section>

    <button class="profile__logout" type="button" @click="logout">
      {{ $t('profile.logout') }}
    </button>

    <div v-if="modalType" class="profile-modal-overlay" @click.self="closeModal">
      <div class="profile-modal">
        <h2 v-if="modalType === 'lang'">{{ $t('profile.modal.langTitle') }}</h2>
        <h2 v-else-if="modalType === 'alarm'">{{ $t('profile.modal.alarmTitle') }}</h2>
        <h2 v-else>{{ $t('profile.modal.prefTitle') }}</h2>

        <template v-if="modalType === 'lang'">
          <p>{{ $t('profile.modal.langDesc') }}</p>
          <div class="profile-modal__options">
            <button
              v-for="lang in languageOptions"
              :key="lang"
              type="button"
              :class="{ 'is-active': language === lang }"
              @click="saveLanguage(lang)"
            >
              {{ lang }}
            </button>
          </div>
        </template>

        <template v-else-if="modalType === 'alarm'">
          <p>{{ $t('profile.modal.alarmDesc') }}</p>
          <div class="profile-modal__options">
            <button type="button" :class="{ 'is-active': alarmEnabled }" @click="saveAlarm(true)">{{ $t('profile.alarmOn') }}</button>
            <button type="button" :class="{ 'is-active': !alarmEnabled }" @click="saveAlarm(false)">{{ $t('profile.alarmOff') }}</button>
          </div>
        </template>

        <template v-else>
          <p>{{ $t('profile.modal.prefDesc') }}</p>
          <div class="profile__persona-list">
            <button
              v-for="item in personaOptions"
              :key="item.id"
              type="button"
              class="profile__persona-card"
              :class="{ 'profile__persona-card--active': selectedPersona === item.id }"
              @click="selectedPersona = item.id"
            >
              <strong>{{ $t(item.labelKey) }}</strong>
              <span>{{ $t(item.descriptionKey) }}</span>
            </button>
          </div>
          <button class="profile__persona-save" :disabled="personaSaving" type="button" @click="savePersona">
            {{ personaSaving ? $t('profile.savingPersona') : $t('profile.savePersona') }}
          </button>
          <p v-if="personaMessage" class="profile__persona-msg">{{ personaMessage }}</p>
        </template>

        <button class="profile-modal__close" type="button" @click="closeModal">{{ $t('profile.closeModal') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile {
  min-height: 100dvh;
  background: #f5f4f0;
  padding: 18px 16px 92px;
}

.profile__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile__avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(160deg, #ffba4d 0%, #fe9c00 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile__header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #1f1f1f;
}

.profile__header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #7d7d7d;
}

.profile__card {
  margin-top: 14px;
  background: #fff;
  border: 1px solid #f0ece5;
  border-radius: 14px;
  padding: 14px;
}

.profile__name {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #222;
}

.profile__email {
  margin: 6px 0 0;
  font-size: 12px;
  color: #7d7d7d;
}

.profile__persona-now {
  margin: 8px 0 0;
  font-size: 12px;
  color: #c97000;
  font-weight: 700;
}

.profile__menu {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.profile__menu-item {
  width: 100%;
  border: 1px solid #f0ece5;
  border-radius: 12px;
  background: #fff;
  padding: 11px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.profile__menu-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-size: 13px;
  font-weight: 700;
}

.profile__menu-value {
  color: #8b8b8b;
  font-size: 12px;
  font-weight: 700;
}

.profile__logout {
  margin-top: 16px;
  width: 100%;
  border: 1px solid #ffd7d7;
  background: #fff5f5;
  color: #d14343;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.profile-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.48);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 300;
  padding: 14px;
}

.profile-modal {
  width: min(100%, 430px);
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  max-height: 84dvh;
  overflow-y: auto;
}

.profile-modal h2 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
}

.profile-modal p {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.profile-modal__options {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

.profile-modal__options button {
  border: 1px solid #e5e7eb;
  background: #fafaf8;
  border-radius: 10px;
  padding: 10px 11px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
}

.profile-modal__options button.is-active {
  border-color: #fe9c00;
  background: #fff8ec;
  color: #c97000;
}

.profile-modal__close {
  margin-top: 12px;
  width: 100%;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 10px 11px;
  font-size: 13px;
  font-weight: 800;
  color: #4b5563;
  cursor: pointer;
}

.profile__persona-list {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.profile__persona-card {
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px 11px;
  background: #fafaf8;
  cursor: pointer;
}

.profile__persona-card--active {
  border-color: #fe9c00;
  background: #fff8ec;
}

.profile__persona-card strong {
  display: block;
  font-size: 13px;
  color: #1f2937;
}

.profile__persona-card span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.profile__persona-save {
  margin-top: 10px;
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  background: #fe9c00;
  cursor: pointer;
}

.profile__persona-save:disabled {
  background: #d4d4d8;
  cursor: not-allowed;
}

.profile__persona-msg {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #4b5563;
}
</style>
