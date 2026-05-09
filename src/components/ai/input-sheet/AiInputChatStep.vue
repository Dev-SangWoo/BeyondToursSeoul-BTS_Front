<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { MessageCircle, Sparkles } from 'lucide-vue-next'
import { useMapStore } from '@/stores/useMapStore'
import MapView from '@/components/map/MapView.vue'
import { requestAiChat, toChatHistoryPayload } from '@/services/aiChatService'
import { renderMarkdownHtml } from '@/utils/renderMarkdown'
import {
  flattenStructuredSlots,
  buildMapMarkersFromStructured,
  meanCenter,
  SEOUL_CENTER,
} from '@/utils/structuredItinerary'
import { normalizeStructured } from '@/utils/structuredNormalize'
import AiChatPlanStrip from './AiChatPlanStrip.vue'

const props = defineProps({
  summaryText: { type: String, default: '' },
  initialStructured: { type: Object, default: null },
  initialThread: { type: Array, default: () => [] },
  canSubmitGenerate: { type: Boolean, default: false },
  preserveMapOnExit: { type: Boolean, default: false },
  localRatio: { type: Number, default: 50 },
})

const emit = defineEmits([
  'back',
  'generate',
  'structured-change',
  'thread-snapshot',
  'bootstrap-complete',
  'before-navigate-detail',
])

const mapStore = useMapStore()

const thread = ref([])
const chatInput = ref('')
const isChatLoading = ref(false)
const chatError = ref('')
const mapSyncing = ref(false)
const mapExpanded = ref(false)
const selectedDayIndex = ref(0)
const allDayMarkers = ref([])
const allDayPolyline = ref([])
const threadRef = ref(null)
const bootstrapping = ref(false)

let mapSnapshot = null

const introAssistant =
  '위에 정리해 주신 일정·취향·추가 요청을 바탕으로 여행 계획을 같이 다듬어 볼게요. 코스 초안을 바로 불러오고 있어요. 수정이나 추가 요청은 아래 채팅으로 보내 주세요.'

/** 채팅 단계 진입 시 자동 전송 — 수동으로 같은 문구를 입력하지 않아도 첫 일정 응답을 받습니다. */
const INITIAL_COURSE_MESSAGE = '코스 생성'

function hasUsableStructured(structured) {
  if (!structured || typeof structured !== 'object') return false
  const days = Array.isArray(structured.days) ? structured.days : []
  if (days.some((d) => Array.isArray(d?.slots) && d.slots.length > 0)) return true
  const route = structured.summary?.route
  if (Array.isArray(route) && route.some((x) => String(x || '').trim())) return true
  const title = structured.summary?.title
  return typeof title === 'string' && title.trim().length > 0
}

const lastStructured = computed(() => {
  for (let i = thread.value.length - 1; i >= 0; i -= 1) {
    const m = thread.value[i]
    if (m.role === 'assistant' && m.structured != null && typeof m.structured === 'object') {
      const normalized = normalizeStructured(m.structured)
      if (hasUsableStructured(normalized)) return normalized
    }
  }
  return null
})

const currentDayMarkerCount = computed(() =>
  allDayMarkers.value.filter((m) => m.dayIndex === selectedDayIndex.value).length,
)

function seedThread() {
  if (Array.isArray(props.initialThread) && props.initialThread.length >= 2) {
    thread.value = props.initialThread.map((m) => ({ ...m }))
    return
  }
  const seeded = [
    { id: 'u0', role: 'user', text: props.summaryText || '(입력 요약)' },
    { id: 'a0', role: 'assistant', text: introAssistant },
  ]
  const normalized = normalizeStructured(props.initialStructured)
  if (hasUsableStructured(normalized)) {
    seeded.push({
      id: 'a-seeded',
      role: 'assistant',
      text: resolveAssistantText(normalized),
      markdown: false,
      structured: normalized,
    })
  }
  thread.value = seeded
}

onMounted(() => {
  seedThread()
  mapSnapshot = {
    markers: [...mapStore.markers],
    polyline: [...mapStore.polyline],
    center: { ...mapStore.mapCenter },
  }
  if (!lastStructured.value) {
    bootstrapping.value = true
    void nextTick().then(() => sendChatWithText(INITIAL_COURSE_MESSAGE, { bootstrap: true }))
  } else {
    emit('bootstrap-complete')
  }
})

onUnmounted(() => {
  if (!props.preserveMapOnExit && mapSnapshot) {
    mapStore.setMarkers(mapSnapshot.markers)
    mapStore.setPolyline(mapSnapshot.polyline)
    mapStore.setCenter(mapSnapshot.center.lat, mapSnapshot.center.lng)
  }
})

async function applyStructuredToMap(structured) {
  if (!structured) {
    allDayMarkers.value = []
    allDayPolyline.value = []
    mapStore.setMarkers([])
    mapStore.setPolyline([])
    mapStore.setCenter(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
    return
  }
  mapSyncing.value = true
  try {
    const flat = flattenStructuredSlots(structured)
    const { markers, polyline } = await buildMapMarkersFromStructured(flat)
    allDayMarkers.value = markers
    allDayPolyline.value = polyline
    const day = selectedDayIndex.value
    const dayMarkers = markers.filter((m) => m.dayIndex === day)
    const dayPolyline = dayMarkers
      .filter((m) => m.lat != null && m.lng != null)
      .map((m) => ({ lat: m.lat, lng: m.lng }))
    mapStore.setMarkers(dayMarkers)
    mapStore.setPolyline(dayPolyline)
    if (dayMarkers.length) {
      const c = meanCenter(dayMarkers)
      mapStore.setCenter(c.lat, c.lng)
    } else {
      mapStore.setCenter(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
    }
  } finally {
    mapSyncing.value = false
  }
}

watch(
  lastStructured,
  (s) => {
    emit('structured-change', s)
    applyStructuredToMap(s)
  },
  { immediate: true },
)

watch(
  () => thread.value.length,
  async () => {
    emit('thread-snapshot', thread.value.map((m) => ({ ...m })))
    await nextTick()
    const el = threadRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

watch(selectedDayIndex, () => {
  if (!allDayMarkers.value.length) return
  const day = selectedDayIndex.value
  const dayMarkers = allDayMarkers.value.filter((m) => m.dayIndex === day)
  const dayPolyline = dayMarkers
    .filter((m) => m.lat != null && m.lng != null)
    .map((m) => ({ lat: m.lat, lng: m.lng }))
  mapStore.setMarkers(dayMarkers)
  mapStore.setPolyline(dayPolyline)
  if (dayMarkers.length) {
    const c = meanCenter(dayMarkers)
    mapStore.setCenter(c.lat, c.lng)
  }
})

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

async function sendChatWithText(t, options = {}) {
  const { bootstrap = false } = options
  const trimmed = (t || '').trim()
  if (!trimmed || isChatLoading.value) return
  chatError.value = ''
  const history = toChatHistoryPayload(thread.value)
  thread.value.push({ id: `u-${Date.now()}`, role: 'user', text: trimmed })
  isChatLoading.value = true
  try {
    const data = await requestAiChat(trimmed, 'ko', history, props.localRatio)
    thread.value.push({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: data.answer || resolveAssistantText(data.structured),
      markdown: true,
      structured: data.structured,
      model: data.model,
    })
  } catch (e) {
    chatError.value = e.message || '요청 중 오류가 났어요.'
  } finally {
    isChatLoading.value = false
    if (bootstrap) {
      bootstrapping.value = false
      emit('bootstrap-complete')
    }
  }
}

async function sendChat() {
  const t = chatInput.value.trim()
  if (!t || isChatLoading.value) return
  chatInput.value = ''
  await sendChatWithText(t)
}

function toggleMapExpanded() {
  mapExpanded.value = !mapExpanded.value
}

function focusMarkerFromTimeline(payload) {
  const dayIndex = Math.max(0, (payload?.day ?? 1) - 1)
  const item = payload?.item
  if (!item) return
  const itemName = String(item.name || '').trim().toLowerCase()
  const itemTime = String(item.time || '').trim().toLowerCase()
  const target = allDayMarkers.value.find((m) =>
    m.dayIndex === dayIndex
    && (
      String(m.placeName || '').trim().toLowerCase() === itemName
      || (
        String(m.slotLabel || '').trim().toLowerCase() === itemTime
        && String(m.placeName || '').trim().toLowerCase().includes(itemName)
      )
    ),
  )
  if (!target) return
  mapStore.selectMarker(target.id)
  if (target.lat != null && target.lng != null) {
    mapStore.setCenter(target.lat, target.lng)
  }
}

</script>

<template>
  <div class="chat-step">
    <div v-if="bootstrapping" class="chat-step__bootloading">
      <div class="chat-step__bootloading-card">
        <span class="chat-step__bootloading-spinner" />
        <p class="chat-step__bootloading-title">AI가 코스를 생성하고 있어요</p>
        <p class="chat-step__bootloading-sub">여행 조건을 바탕으로 최적 코스를 계산 중입니다.</p>
      </div>
    </div>
    <header class="chat-step__bar">
      <div class="chat-step__bar-title">
        <MessageCircle :size="17" :stroke-width="2.3" class="chat-step__bar-icon" />
        <span>AI 여행 계획</span>
        <span v-if="mapSyncing" class="chat-step__sync">지도 반영 중…</span>
      </div>
      <p class="chat-step__bar-sub">
        일정을 수정하거나 추가 요청이 있으면 아래에서 AI에게 말해 보세요.
      </p>
    </header>

    <div class="chat-step__map" :class="{ 'chat-step__map-expanded': mapExpanded }">
      <div class="chat-step__map-tools">
        <span class="chat-step__map-chip">DAY {{ selectedDayIndex + 1 }} · {{ currentDayMarkerCount }}개</span>
        <button class="chat-step__map-toggle" type="button" @click="toggleMapExpanded">
          {{ mapExpanded ? '지도 축소' : '지도 확대' }}
        </button>
      </div>
      <MapView />
      <div v-if="mapSyncing" class="chat-step__map-overlay" aria-hidden="true" />
    </div>

    <section class="chat-step__plan-wrap">
      <AiChatPlanStrip
        :structured="lastStructured"
        :selected-day-index="selectedDayIndex"
        @update:selected-day-index="selectedDayIndex = $event"
        @focus-item="focusMarkerFromTimeline"
        @before-navigate-detail="emit('before-navigate-detail')"
      />
    </section>

    <div ref="threadRef" class="chat-step__thread">
      <article
        v-for="msg in thread"
        :key="msg.id"
        class="chat-step__bubble"
        :class="[
          msg.role === 'user' ? 'chat-step__bubble--user' : 'chat-step__bubble--assistant',
          msg.markdown ? 'chat-step__bubble--md' : '',
        ]"
      >
        <div
          v-if="msg.role === 'assistant' && msg.markdown"
          class="chat-step__md"
          v-html="renderMarkdownHtml(msg.text)"
        />
        <template v-else>{{ msg.text }}</template>
      </article>
      <p v-if="chatError" class="chat-step__error">{{ chatError }}</p>
    </div>

    <div class="chat-step__composer">
      <input
        v-model="chatInput"
        class="chat-step__input"
        type="text"
        placeholder="AI에게 질문하기"
        :disabled="isChatLoading"
        @keydown.enter.prevent="sendChat"
      />
      <button class="chat-step__send" type="button" :disabled="isChatLoading" @click="sendChat">
        {{ isChatLoading ? '…' : '전송' }}
      </button>
    </div>

    <div class="chat-step__actions">
      <button type="button" class="chat-step__ghost" @click="emit('back')">이전</button>
      <button
        type="button"
        class="chat-step__primary"
        :class="{ 'chat-step__primary--disabled': !canSubmitGenerate }"
        :disabled="!canSubmitGenerate"
        @click="emit('generate')"
      >
        <Sparkles :size="18" :stroke-width="2.4" />
        {{ lastStructured ? '이 코스로 확정' : '코스 생성' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-step {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.chat-step__bootloading {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-step__bootloading-card {
  width: min(86%, 280px);
  padding: 16px 14px;
  border-radius: 14px;
  border: 1px solid #f1e5d2;
  background: #fffaf2;
  display: grid;
  justify-items: center;
  gap: 6px;
}

.chat-step__bootloading-spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid #ffe1b0;
  border-top-color: #fe9c00;
  animation: chat-step-spin 0.9s linear infinite;
}

.chat-step__bootloading-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #c97000;
}

.chat-step__bootloading-sub {
  margin: 0;
  font-size: 11px;
  color: #8f8f8f;
}

@keyframes chat-step-spin {
  to {
    transform: rotate(360deg);
  }
}

.chat-step__bar {
  flex-shrink: 0;
  padding: 0 0 8px;
}

.chat-step__bar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
  color: #1a1a1a;
}

.chat-step__bar-icon {
  color: #fe9c00;
  flex-shrink: 0;
}

.chat-step__sync {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  color: #fe9c00;
}

.chat-step__bar-sub {
  margin: 6px 0 0;
  font-size: 11px;
  color: #999;
  line-height: 1.35;
}

.chat-step__map {
  position: relative;
  flex: 1 1 auto;
  min-height: clamp(160px, 30dvh, 240px);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #eceae4;
}

.chat-step__map-tools {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.chat-step__map-chip {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #ece5d7;
  color: #6d4b22;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
}

.chat-step__map-toggle {
  pointer-events: auto;
  border: 1px solid #e2e2e2;
  background: rgba(255, 255, 255, 0.96);
  color: #555;
  border-radius: 10px;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.chat-step__map :deep(.map-view) {
  height: 100%;
}

.chat-step__map-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.35);
  pointer-events: none;
  z-index: 5;
}

.chat-step__plan-wrap {
  flex-shrink: 0;
  min-height: 72px;
  max-height: 190px;
  overflow-y: auto;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0ede6;
}

.chat-step__plan-wrap :deep(.plan-strip) {
  overflow: visible;
}

.chat-step__thread {
  flex: 1 1 0;
  min-height: 0;
  margin-top: 8px;
  padding: 10px;
  border-radius: 14px;
  background: #f7f6f2;
  border: 1px solid #eceae4;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}

.chat-step__bubble {
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;
}

.chat-step__bubble--user {
  align-self: flex-end;
  max-width: 92%;
  background: #fe9c00;
  color: #fff;
  white-space: pre-wrap;
}

.chat-step__bubble--assistant {
  align-self: flex-start;
  max-width: 92%;
  background: #fff;
  color: #333;
  border: 1px solid #ebe9e4;
}

.chat-step__bubble--md.chat-step__bubble--assistant {
  white-space: normal;
}

.chat-step__md :deep(p) {
  margin: 0 0 0.45em;
}

.chat-step__md :deep(p:last-child) {
  margin-bottom: 0;
}

.chat-step__md :deep(ul),
.chat-step__md :deep(ol) {
  margin: 0.35em 0;
  padding-left: 1.15em;
}

.chat-step__md :deep(li) {
  margin: 0.15em 0;
}

.chat-step__md :deep(strong) {
  font-weight: 800;
}

.chat-step__md :deep(code) {
  font-size: 0.92em;
  background: #f3f2ec;
  padding: 0.1em 0.35em;
  border-radius: 4px;
}

.chat-step__error {
  margin: 0;
  font-size: 11px;
  color: #ef4444;
}

.chat-step__composer {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-top: 8px;
  background: #fff;
  padding-top: 6px;
}

.chat-step__input {
  flex: 1;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  background: #fff;
}

.chat-step__send {
  flex-shrink: 0;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: #333;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.chat-step__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-step__actions {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 10px;
  margin-top: 8px;
  flex-shrink: 0;
  background: #fff;
  padding-top: 2px;
}

.chat-step__map-expanded {
  min-height: min(50dvh, 430px);
}

.chat-step__ghost {
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #666;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  min-height: 48px;
  cursor: pointer;
}

.chat-step__primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 16px;
  min-height: 48px;
  background: #fe9c00;
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(254, 156, 0, 0.4);
}

.chat-step__primary--disabled,
.chat-step__primary:disabled {
  background: #e0e0e0;
  color: #aaa;
  box-shadow: none;
  cursor: not-allowed;
}
</style>
