<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getApiLangCode } from '@/i18n'
import { MessageCircle, Sparkles } from 'lucide-vue-next'
import { useMapStore } from '@/stores/useMapStore'
import MapView from '@/components/map/MapView.vue'
import { requestAiChat, toChatHistoryPayload } from '@/services/aiChatService'
import { renderMarkdownHtml } from '@/utils/renderMarkdown'
import {
  flattenStructuredSlots,
  buildMapMarkersFromStructured,
  SEOUL_CENTER,
} from '@/utils/structuredItinerary'
import { normalizeStructured } from '@/utils/structuredNormalize'
import { structuredToItineraryDays } from '@/utils/structuredToItinerary'
import { fetchNearestLockers } from '@/services/attractionService'
import AiChatPlanStrip from './AiChatPlanStrip.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const { t, locale } = useI18n()

const props = defineProps({
  summaryText: { type: String, default: '' },
  initialStructured: { type: Object, default: null },
  initialThread: { type: Array, default: () => [] },
  canSubmitGenerate: { type: Boolean, default: false },
  preserveMapOnExit: { type: Boolean, default: false },
  localRatio: { type: Number, default: 50 },
  initialSelectedDayIndex: { type: Number, default: 0 },
  /** 상세 단계(7번)에서 고른 저장 관광지 ID — AI 요청에 그대로 실음 */
  savedAttractionIds: { type: Array, default: () => [] },
  /** 상세 단계에서 고른 저장 공식 코스 ID */
  savedCourseIds: { type: Array, default: () => [] },
  /** ISO YYYY-MM-DD — AI 일정 일수 고정용(선택) */
  tripStartDate: { type: String, default: '' },
  tripEndDate: { type: String, default: '' },
})

const emit = defineEmits([
  'back',
  'generate',
  'structured-change',
  'thread-snapshot',
  'bootstrap-complete',
  'before-navigate-detail',
  'selected-day-index-change',
])

const mapStore = useMapStore()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const thread = ref([])
const chatInput = ref('')
const isChatLoading = ref(false)
const chatError = ref('')
const mapSyncing = ref(false)
const mapExpanded = ref(false)
const selectedDayIndex = ref(0)
const allDayMarkers = ref([])
const allDayPolyline = ref([])
const allDayLockerHintMarkers = ref([])
const threadRef = ref(null)
const bootstrapping = ref(false)
const suppressMarkerNavigate = ref(false)

let mapSnapshot = null

const introAssistant = computed(() => t('ai.chat.introAssistant'))

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
    { id: 'a0', role: 'assistant', text: introAssistant.value },
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
  selectedDayIndex.value = Math.max(0, Number(props.initialSelectedDayIndex) || 0)
  seedThread()
  mapSnapshot = {
    markers: [...mapStore.markers],
    polyline: [...mapStore.polyline],
    center: { ...mapStore.mapCenter },
  }
  if (!lastStructured.value) {
    bootstrapping.value = true
    const summary = String(props.summaryText ?? '').trim()
    const ask = String(t('ai.detail.generateCourse') ?? '').trim()
    const bootstrapMsg = [summary, ask].filter(Boolean).join('\n\n')
    void nextTick().then(() =>
      sendChatWithText(bootstrapMsg || ask || t('ai.detail.generateCourse'), { bootstrap: true }),
    )
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
    const lockerHintMarkers = await buildLockerHintMarkers(structured)
    allDayLockerHintMarkers.value = lockerHintMarkers
    allDayMarkers.value = [...markers, ...lockerHintMarkers]
    allDayPolyline.value = polyline
    const day = selectedDayIndex.value
    const dayMarkers = [...markers, ...lockerHintMarkers].filter((m) => m.dayIndex === day)
    const dayChain = dayMarkers.filter((m) => m.lat != null && m.lng != null)
    const dayPolyline = []
    for (let i = 0; i < dayChain.length - 1; i += 1) {
      const start = dayChain[i]
      const end = dayChain[i + 1]
      dayPolyline.push({
        start: { lat: start.lat, lng: start.lng },
        end: { lat: end.lat, lng: end.lng },
        dashed: start.type === 'locker' || end.type === 'locker',
      })
    }
    mapStore.setMarkers(dayMarkers)
    mapStore.setPolyline(dayPolyline)
    if (!dayMarkers.length) {
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
  emit('selected-day-index-change', selectedDayIndex.value)
  if (!allDayMarkers.value.length) return
  const day = selectedDayIndex.value
  const dayMarkers = allDayMarkers.value.filter((m) => m.dayIndex === day)
  const dayChain = dayMarkers.filter((m) => m.lat != null && m.lng != null)
  const dayPolyline = []
  for (let i = 0; i < dayChain.length - 1; i += 1) {
    const start = dayChain[i]
    const end = dayChain[i + 1]
    dayPolyline.push({
      start: { lat: start.lat, lng: start.lng },
      end: { lat: end.lat, lng: end.lng },
      dashed: start.type === 'locker' || end.type === 'locker',
    })
  }
  mapStore.setMarkers(dayMarkers)
  mapStore.setPolyline(dayPolyline)
  if (!dayMarkers.length) mapStore.setCenter(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
})

function resolveAssistantText(structured) {
  const days = Array.isArray(structured?.days) ? structured.days : []
  if (!days.length) return t('ai.chat.noResponse')
  const dayCount = days.length
  const places = days
    .flatMap((d) => (Array.isArray(d?.slots) ? d.slots : []))
    .map((s) => s?.placeName)
    .filter(Boolean)
  const preview = [...new Set(places)].slice(0, 3).join(', ')
  return preview
    ? `${t('ai.chat.assistantPreview', { n: dayCount })}${t('ai.chat.assistantPreviewSuffix', { preview })}`
    : t('ai.chat.assistantPreview', { n: dayCount })
}

function pickFirstAnchor(items) {
  if (!Array.isArray(items) || !items.length) return null
  return items.find((it) => !it.isLocker && it.lat != null && it.lng != null) || null
}

function pickLastAnchor(items) {
  if (!Array.isArray(items) || !items.length) return null
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const it = items[i]
    if (!it?.isLocker && it.lat != null && it.lng != null) return it
  }
  return null
}

async function buildLockerHintMarkers(structured) {
  const days = structuredToItineraryDays(structured)
  if (!days.length) return []

  const out = []
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const items = Array.isArray(days[dayIndex]?.items) ? days[dayIndex].items : []
    const first = pickFirstAnchor(items)
    const last = pickLastAnchor(items)
    const anchors = []
    if (first) anchors.push({ kind: 'start', ref: first })
    if (last && last !== first) anchors.push({ kind: 'end', ref: last })
    for (let ai = 0; ai < anchors.length; ai += 1) {
      const anchor = anchors[ai]
      try {
        const list = await fetchNearestLockers(anchor.ref.lat, anchor.ref.lng, {
          limit: 1,
          lang: getApiLangCode(),
        })
        const locker = Array.isArray(list) ? list[0] : null
        const lat = Number(locker?.latitude)
        const lng = Number(locker?.longitude)
        if (!locker || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
        const lid = String(locker.id ?? '').trim()
        if (!lid) continue
        out.push({
          id: `ai-locker-hint-${dayIndex}-${anchor.kind}-${lid}`,
          lat,
          lng,
          label: String(locker.stationName || locker.lockerName || t('itinerary.labels.locker')),
          placeName: String(locker.stationName || locker.lockerName || t('itinerary.labels.locker')),
          slotLabel: t('itinerary.labels.locker'),
          order: 999,
          orderShort: 'L',
          type: 'locker',
          crowdLevel: 'low',
          dayIndex,
          placeTone: null,
          isLocker: true,
          sourceType: 'locker',
          sourceId: lid,
        })
      } catch {
        // nearest locker 실패 시 무시
      }
    }
  }
  return out
}

async function sendChatWithText(messageText, options = {}) {
  const { bootstrap = false } = options
  const trimmed = (messageText || '').trim()
  if (!trimmed || isChatLoading.value) return
  chatError.value = ''
  const history = toChatHistoryPayload(thread.value)
  if (!bootstrap) {
    thread.value.push({ id: `u-${Date.now()}`, role: 'user', text: trimmed })
  }
  isChatLoading.value = true
  try {
    const lang = String(locale.value || 'ko').trim().slice(0, 5) || 'ko'
    const data = await requestAiChat(trimmed, lang, history, props.localRatio, {
      accessToken: authStore.accessToken || null,
      savedAttractionIds: Array.isArray(props.savedAttractionIds) ? [...props.savedAttractionIds] : [],
      savedCourseIds: Array.isArray(props.savedCourseIds) ? [...props.savedCourseIds] : [],
      tripStart: props.tripStartDate || null,
      tripEnd: props.tripEndDate || null,
    })
    thread.value.push({
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: data.answer || resolveAssistantText(data.structured) || t('ai.chat.noResponse'),
      markdown: true,
      structured: data.structured,
      model: data.model,
    })
  } catch (e) {
    chatError.value = e.message || t('ai.chat.requestError')
  } finally {
    isChatLoading.value = false
    if (bootstrap) {
      bootstrapping.value = false
      emit('bootstrap-complete')
    }
  }
}

async function sendChat() {
  const textMsg = chatInput.value.trim()
  if (!textMsg || isChatLoading.value) return
  chatInput.value = ''
  await sendChatWithText(textMsg)
}

function toggleMapExpanded() {
  mapExpanded.value = !mapExpanded.value
}

function focusMarkerFromTimeline(payload) {
  suppressMarkerNavigate.value = true
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
  setTimeout(() => {
    suppressMarkerNavigate.value = false
  }, 0)
}

function routeForMarker(marker) {
  const st = String(marker?.sourceType || '').toLowerCase()
  const sid = String(marker?.sourceId || '').trim()
  if (!sid) return null
  if (st.includes('locker')) return { name: 'locker-detail', params: { id: sid } }
  if (st.includes('event')) return { name: 'event-detail', params: { id: sid } }
  if (st.includes('attraction')) return { name: 'attraction-detail', params: { id: sid } }
  return null
}

watch(
  () => mapStore.selectedMarkerId,
  async (id) => {
    if (!id || suppressMarkerNavigate.value) return
    const marker = allDayMarkers.value.find((m) => m.id === id)
    const target = routeForMarker(marker)
    if (!target) return
    const returnTo =
      typeof route.query?.returnTo === 'string' && route.query.returnTo.trim()
        ? route.query.returnTo.trim()
        : '/discover'
    emit('before-navigate-detail')
    await router.push({
      ...target,
      query: {
        returnTo,
      },
    })
  },
)

</script>

<template>
  <div class="chat-step">
    <div v-if="bootstrapping" class="chat-step__bootloading">
      <div class="chat-step__bootloading-card">
        <span class="chat-step__bootloading-spinner" />
        <p class="chat-step__bootloading-title">{{ $t('ai.chat.bootloadingTitle') }}</p>
        <p class="chat-step__bootloading-sub">{{ $t('ai.chat.bootloadingSub') }}</p>
      </div>
    </div>
    <header class="chat-step__bar">
      <div class="chat-step__bar-title">
        <MessageCircle :size="17" :stroke-width="2.3" class="chat-step__bar-icon" />
        <span>{{ $t('ai.chat.title') }}</span>
        <span v-if="mapSyncing" class="chat-step__sync">{{ $t('ai.chat.mapSyncing') }}</span>
      </div>
      <p class="chat-step__bar-sub">
        {{ $t('ai.chat.barSub') }}
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
        :placeholder="$t('ai.chat.inputPlaceholder')"
        :disabled="isChatLoading"
        @keydown.enter.prevent="sendChat"
      />
      <button class="chat-step__send" type="button" :disabled="isChatLoading" @click="sendChat">
        {{ isChatLoading ? $t('ai.chat.sending') : $t('ai.chat.send') }}
      </button>
    </div>

    <div class="chat-step__actions">
      <button type="button" class="chat-step__ghost" @click="emit('back')">{{ $t('ai.chat.back') }}</button>
      <button
        type="button"
        class="chat-step__primary"
        :class="{ 'chat-step__primary--disabled': !canSubmitGenerate }"
        :disabled="!canSubmitGenerate"
        @click="emit('generate', lastStructured)"
      >
        <Sparkles :size="18" :stroke-width="2.4" />
        {{ lastStructured ? $t('ai.chat.generateCourseConfirm') : $t('ai.chat.generateCourse') }}
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
