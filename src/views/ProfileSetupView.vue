<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { personaOptions } from '@/components/ai/input-sheet/aiInputFlowConstants'

const authStore = useAuthStore()
const router = useRouter()
const nickname = ref((authStore.user?.nickname || '').trim())
const selectedPersona = ref(authStore.user?.localPreference || 'balanced')
const selectedLanguage = ref(authStore.user?.preferredLanguage || '한국어')
const saving = ref(false)
const error = ref('')
const languageOptions = ['한국어', 'English', '日本語', '中文']

const canSubmit = computed(() =>
  nickname.value.trim().length >= 2 &&
  nickname.value.trim().length <= 20 &&
  !!selectedPersona.value &&
  languageOptions.includes(selectedLanguage.value),
)

async function submit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await authStore.saveProfile({
      nickname: nickname.value.trim(),
      localPreference: selectedPersona.value,
      preferredLanguage: selectedLanguage.value,
    })
    router.replace('/discover')
  } catch (e) {
    error.value = e?.message || '닉네임 저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="setup">
    <div class="setup__card">
      <h1>닉네임 설정</h1>
      <p>처음 로그인했어요. 닉네임과 여행 페르소나를 설정해 주세요.</p>

      <label class="setup__field">
        <span>닉네임 (2~20자)</span>
        <input
          v-model="nickname"
          type="text"
          maxlength="20"
          placeholder="예: 서울탐험가"
          @keyup.enter="submit"
        />
      </label>

      <div class="setup__language">
        <span class="setup__persona-title">표시 언어 선택</span>
        <div class="setup__language-options">
          <button
            v-for="lang in languageOptions"
            :key="lang"
            type="button"
            class="setup__language-btn"
            :class="{ 'setup__language-btn--active': selectedLanguage === lang }"
            @click="selectedLanguage = lang"
          >
            {{ lang }}
          </button>
        </div>
      </div>

      <div class="setup__persona">
        <span class="setup__persona-title">여행 페르소나 선택</span>
        <div class="setup__persona-list">
          <button
            v-for="item in personaOptions"
            :key="item.id"
            type="button"
            class="setup__persona-card"
            :class="{ 'setup__persona-card--active': selectedPersona === item.id }"
            @click="selectedPersona = item.id"
          >
            <strong>{{ item.label }}</strong>
            <p>{{ item.description }}</p>
          </button>
        </div>
      </div>

      <p v-if="error" class="setup__error">{{ error }}</p>

      <button
        class="setup__submit"
        :disabled="!canSubmit || saving"
        type="button"
        @click="submit"
      >
        {{ saving ? '저장 중…' : '시작하기' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.setup {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f5f4f0;
}

.setup__card {
  width: min(100%, 420px);
  background: #fff;
  border: 1px solid #f0ece5;
  border-radius: 16px;
  padding: 20px;
}

.setup__card h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #222;
}

.setup__card p {
  margin: 8px 0 0;
  color: #666;
  font-size: 13px;
}

.setup__field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 18px;
}

.setup__field span {
  font-size: 12px;
  font-weight: 700;
  color: #666;
}

.setup__field input {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 13px;
  font-size: 14px;
  outline: none;
}

.setup__field input:focus {
  border-color: #fe9c00;
}

.setup__error {
  margin-top: 10px;
  font-size: 12px;
  color: #dc2626;
  font-weight: 700;
}

.setup__submit {
  width: 100%;
  margin-top: 16px;
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  background: #fe9c00;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.setup__submit:disabled {
  background: #d4d4d8;
  cursor: not-allowed;
}

.setup__persona {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setup__language {
  margin-top: 14px;
}

.setup__language-options {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.setup__language-btn {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fafaf8;
  padding: 10px 11px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  cursor: pointer;
}

.setup__language-btn--active {
  border-color: #fe9c00;
  background: #fff8ec;
  color: #c97000;
}

.setup__persona-title {
  font-size: 12px;
  font-weight: 700;
  color: #666;
}

.setup__persona-list {
  display: grid;
  gap: 8px;
}

.setup__persona-card {
  text-align: left;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fafaf8;
  padding: 10px 11px;
  cursor: pointer;
}

.setup__persona-card--active {
  border-color: #fe9c00;
  background: #fff8ec;
}

.setup__persona-card strong {
  display: block;
  font-size: 13px;
  color: #1f2937;
}

.setup__persona-card p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}
</style>
