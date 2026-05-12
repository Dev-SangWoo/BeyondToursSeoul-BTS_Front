<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { requestAiChat, toChatHistoryPayload } from '@/services/aiChatService'
import { renderMarkdownHtml } from '@/utils/renderMarkdown'
import { useAuthStore } from '@/stores/useAuthStore'

const { locale } = useI18n()
const authStore = useAuthStore()
const input = ref('')
const isLoading = ref(false)
const error = ref('')

function resolveAssistantText(structured) {
  const days = Array.isArray(structured?.days) ? structured.days : []
  if (!days.length) return '응답을 받지 못했습니다.'
  const dayCount = days.length
  const places = days
    .flatMap((d) => (Array.isArray(d?.slots) ? d.slots : []))
    .map((s) => s?.placeName)
    .filter(Boolean)
  const preview = [...new Set(places)].slice(0, 3).join(', ')
  return `${dayCount}일 여행 일정을 준비했어요.${preview ? ` (${preview} 등)` : ''}`
}
const messages = ref([
  {
    id: 'welcome',
    role: 'assistant',
    text: '코스 관련해서 궁금한 점을 물어보세요. 예: "야경 위주로 바꿔줘"',
  },
])

async function sendMessage() {
  const trimmed = input.value.trim()
  if (!trimmed || isLoading.value) return

  error.value = ''
  const history = toChatHistoryPayload(messages.value)
  messages.value.push({
    id: `u-${Date.now()}`,
    role: 'user',
    text: trimmed,
  })
  input.value = ''

  isLoading.value = true
  try {
    const lang = String(locale.value || 'ko').trim().slice(0, 5) || 'ko'
    const data = await requestAiChat(trimmed, lang, history, 50, {
      accessToken: authStore.accessToken || null,
    })
    messages.value.push({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: data.answer || resolveAssistantText(data.structured),
      markdown: true,
      structured: data.structured,
      model: data.model,
    })
  } catch (e) {
    error.value = e.message || '요청 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="ai-chat">
    <header class="ai-chat__header">
      <h3>AI 여행 도우미</h3>
      <p>코스 수정/추천 질문을 이어서 해보세요.</p>
    </header>

    <div class="ai-chat__messages">
      <article
        v-for="msg in messages"
        :key="msg.id"
        class="ai-chat__bubble"
        :class="[
          msg.role === 'user' ? 'ai-chat__bubble--user' : 'ai-chat__bubble--assistant',
          msg.markdown ? 'ai-chat__bubble--md' : '',
        ]"
      >
        <div
          v-if="msg.role === 'assistant' && msg.markdown"
          class="ai-chat__md"
          v-html="renderMarkdownHtml(msg.text)"
        />
        <template v-else>{{ msg.text }}</template>
      </article>
      <p v-if="error" class="ai-chat__error">{{ error }}</p>
    </div>

    <div class="ai-chat__composer">
      <input
        v-model="input"
        class="ai-chat__input"
        type="text"
        placeholder="예) 실내 위주 코스로 바꿔줘"
        @keydown.enter="sendMessage"
      />
      <button class="ai-chat__send" type="button" :disabled="isLoading" @click="sendMessage">
        {{ isLoading ? '전송중...' : '전송' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.ai-chat {
  margin-top: 12px;
  background: #fff;
  border: 1px solid #f0ece5;
  border-radius: 14px;
  padding: 12px;
}

.ai-chat__header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #222;
}

.ai-chat__header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #787878;
}

.ai-chat__messages {
  margin-top: 10px;
  display: grid;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.ai-chat__bubble {
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.ai-chat__bubble--assistant {
  background: #f7f6f2;
  color: #3f3f3f;
}

.ai-chat__bubble--md.ai-chat__bubble--assistant {
  white-space: normal;
}

.ai-chat__md :deep(p) {
  margin: 0 0 0.4em;
}

.ai-chat__md :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-chat__md :deep(ul),
.ai-chat__md :deep(ol) {
  margin: 0.3em 0;
  padding-left: 1.1em;
}

.ai-chat__md :deep(strong) {
  font-weight: 800;
}

.ai-chat__bubble--user {
  background: #fff4df;
  color: #8a5a11;
  justify-self: end;
}

.ai-chat__error {
  margin: 0;
  color: #d14a4a;
  font-size: 12px;
  font-weight: 700;
}

.ai-chat__composer {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.ai-chat__input {
  flex: 1;
  border: 1px solid #e6dfd3;
  border-radius: 10px;
  padding: 10px;
  font-size: 12px;
  color: #333;
}

.ai-chat__send {
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fe9c00;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.ai-chat__send:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>

