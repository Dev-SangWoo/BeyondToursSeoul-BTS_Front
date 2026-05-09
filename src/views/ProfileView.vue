<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Bell, Globe, Settings, UserRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/useAuthStore'
import { SUPPORTED_LOCALES, setLocale, getCurrentLocale } from '@/i18n'
import { personaOptions } from '@/components/ai/input-sheet/aiInputFlowConstants'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

const showLangModal = ref(false)

const currentLangLabel = computed(
  () => SUPPORTED_LOCALES.find((l) => l.code === getCurrentLocale())?.label ?? '한국어',
)

const menuItems = computed(() => [
  { id: 'lang', icon: Globe, label: t('profile.menu.lang'), value: currentLangLabel.value, action: () => { showLangModal.value = true } },
  { id: 'alarm', icon: Bell, label: t('profile.menu.alarm'), value: t('profile.alarmOn'), action: null },
  { id: 'pref', icon: Settings, label: t('profile.menu.pref'), value: t('profile.prefEditable'), action: null },
])

onMounted(() => {
  authStore.loadMe().catch(() => null)
})

const selectedPersona = ref('balanced')
const personaSaving = ref(false)
const personaMessage = ref('')

const currentPersonaLabel = computed(() => {
  const id = authStore.user?.localPreference || 'balanced'
  return personaOptions.find((p) => p.id === id)?.label || '밸런스 탐험'
})

onMounted(() => {
  const pref = authStore.user?.localPreference
  selectedPersona.value = pref || 'balanced'
})

async function savePersona() {
  if (!authStore.isAuthenticated || personaSaving.value) return
  personaSaving.value = true
  personaMessage.value = ''
  try {
    await authStore.saveProfile({ localPreference: selectedPersona.value })
    personaMessage.value = '여행 페르소나를 저장했어요.'
  } catch (e) {
    personaMessage.value = e?.message || '페르소나 저장에 실패했습니다.'
  } finally {
    personaSaving.value = false
  }
}

function logout() {
  authStore.clearSession()
  router.replace('/')
}

function selectLang(code) {
  setLocale(code)
  showLangModal.value = false
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
    </section>

    <section class="profile__persona">
      <h2>여행 페르소나</h2>
      <p>언제든지 변경할 수 있어요.</p>
      <div class="profile__persona-list">
        <button
          v-for="item in personaOptions"
          :key="item.id"
          type="button"
          class="profile__persona-card"
          :class="{ 'profile__persona-card--active': selectedPersona === item.id }"
          @click="selectedPersona = item.id"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.description }}</span>
        </button>
      </div>
      <button class="profile__persona-save" :disabled="personaSaving" type="button" @click="savePersona">
        {{ personaSaving ? '저장 중…' : '페르소나 저장' }}
      </button>
      <p v-if="personaMessage" class="profile__persona-msg">{{ personaMessage }}</p>
    </section>

    <section class="profile__menu">
      <button
        v-for="item in menuItems"
        :key="item.id"
        class="profile__menu-item"
        type="button"
        @click="item.action && item.action()"
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

    <!-- Language Selection Modal -->
    <Transition name="lang-modal">
      <div v-if="showLangModal" class="lang-modal-overlay" @click.self="showLangModal = false">
        <div class="lang-modal">
          <p class="lang-modal__title">{{ $t('profile.langModal.title') }}</p>
          <button
            v-for="lang in SUPPORTED_LOCALES"
            :key="lang.code"
            class="lang-modal__option"
            :class="{ 'lang-modal__option--active': lang.code === getCurrentLocale() }"
            type="button"
            @click="selectLang(lang.code)"
          >
            {{ lang.label }}
          </button>
        </div>
      </div>
    </Transition>
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

.profile__persona {
  margin-top: 14px;
  background: #fff;
  border: 1px solid #f0ece5;
  border-radius: 14px;
  padding: 14px;
}

.profile__persona h2 {
  margin: 0;
  font-size: 15px;
  color: #222;
}

.profile__persona p {
  margin: 6px 0 0;
  font-size: 12px;
  color: #7d7d7d;
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

/* ── Language Modal ─────────────────────────────────────────────────────── */
.lang-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.lang-modal {
  width: 100%;
  max-width: 430px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px 20px max(24px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lang-modal__title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
  text-align: center;
}

.lang-modal__option {
  width: 100%;
  padding: 13px 16px;
  border: 1.5px solid #efefed;
  border-radius: 12px;
  background: #fafaf8;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.lang-modal__option--active {
  border-color: #fe9c00;
  background: #fff8ec;
  color: #c97000;
  font-weight: 800;
}

.lang-modal-enter-active,
.lang-modal-leave-active {
  transition: opacity 0.25s;
}
.lang-modal-enter-active .lang-modal,
.lang-modal-leave-active .lang-modal {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.lang-modal-enter-from,
.lang-modal-leave-to {
  opacity: 0;
}
.lang-modal-enter-from .lang-modal,
.lang-modal-leave-to .lang-modal {
  transform: translateY(100%);
}
</style>
