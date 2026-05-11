<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTripStore } from '@/stores/useTripStore'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import MapView from '@/components/map/MapView.vue'
import ItineraryTimeline from '@/components/itinerary/ItineraryTimeline.vue'
import { fetchSavedPlanDetail, saveStructuredPlan } from '@/services/savedPlansService'
import { isAuthExpiredError } from '@/utils/authFlow'
import { getApiLangCode } from '@/i18n'
import {
  flattenStructuredSlots,
  buildMapMarkersFromStructured,
  SEOUL_CENTER,
} from '@/utils/structuredItinerary'

const router = useRouter()
const route = useRoute()
const tripStore = useTripStore()
const mapStore = useMapStore()
const authStore = useAuthStore()

const sourceDays = computed(() => (tripStore.hasItinerary ? tripStore.itinerary : undefined))
const loadingPlan = ref(false)
const planLoadError = ref('')
const savingCourse = ref(false)

/** 채팅/AI structured 일정만 서버(user_saved_plans)에 저장 가능 */
const canSaveStructuredPlan = computed(() => !!tripStore.aiStructured)

const selectedDay = ref(1)
const allMarkers = ref([])
const allPolyline = ref([])

function parseDayQuery(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.max(1, Math.trunc(n))
}

function clampDay(day) {
  const max = Math.max(1, sourceDays.value?.length || 1)
  return Math.min(Math.max(1, Math.trunc(Number(day) || 1)), max)
}

const resultTitle = computed(() => {
  const meta = tripStore.savedPlanMeta
  if (meta?.title) return meta.title
  const t = tripStore.aiStructured?.summary?.title
  if (typeof t === 'string' && t.trim()) return t.trim()
  return tripStore.tripInput.duration || '추천 일정'
})

async function syncMarkersFromStructured() {
  const structured = tripStore.aiStructured
  if (!structured) {
    allMarkers.value = []
    allPolyline.value = []
    mapStore.setMarkers([])
    mapStore.setPolyline([])
    mapStore.setCenter(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
    return
  }
  const flat = flattenStructuredSlots(structured)
  const { markers, polyline } = await buildMapMarkersFromStructured(flat)
  allMarkers.value = markers
  allPolyline.value = polyline
  applyDayToMap(selectedDay.value)
}

function applyDayToMap(dayNum) {
  const dayIndex = dayNum - 1
  const dayMarkers = allMarkers.value.filter((m) => m.dayIndex === dayIndex)
  const chain = dayMarkers.filter((m) => m.lat != null && m.lng != null)
  const dayPolyline = []
  for (let i = 0; i < chain.length - 1; i += 1) {
    const start = chain[i]
    const end = chain[i + 1]
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
}

async function loadPlanFromRoute() {
  planLoadError.value = ''
  const raw = route.query.planId
  const pid = raw != null ? String(raw).trim() : ''
  if (!pid) {
    return
  }
  const pidNum = Number(pid)
  if (
    Number.isFinite(pidNum)
    && tripStore.savedPlanMeta?.planId === pidNum
    && tripStore.aiStructured
  ) {
    planLoadError.value = ''
    return
  }
  if (!authStore.accessToken) {
    planLoadError.value = '저장 일정을 보려면 로그인이 필요합니다.'
    return
  }
  loadingPlan.value = true
  try {
    const detail = await fetchSavedPlanDetail(pid, authStore.accessToken)
    if (!detail?.structured) {
      throw new Error('일정 데이터가 비어 있습니다.')
    }
    tripStore.setAiStructured(detail.structured, {
      planId: detail.id,
      title: detail.title,
    })
    const fromQuery = parseDayQuery(route.query.day)
    selectedDay.value = clampDay(fromQuery ?? 1)
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
    planLoadError.value = e.message || '일정을 불러오지 못했습니다.'
  } finally {
    loadingPlan.value = false
  }
}

watch(selectedDay, (day) => {
  if (allMarkers.value.length) applyDayToMap(day)
  const normalized = String(clampDay(day))
  if (String(route.query.day || '') === normalized) return
  const nextQuery = {
    ...route.query,
    day: normalized,
  }
  void router.replace({
    name: 'result',
    query: nextQuery,
  })
})

watch(
  () => route.query.day,
  (raw) => {
    const parsed = parseDayQuery(raw)
    if (parsed == null) return
    const next = clampDay(parsed)
    if (selectedDay.value !== next) selectedDay.value = next
  },
  { immediate: true },
)

watch(
  () => [route.query.planId, authStore.accessToken],
  async () => {
    await loadPlanFromRoute()
    await syncMarkersFromStructured()
  },
  { flush: 'post', immediate: true },
)

watch(
  () => tripStore.aiStructured,
  async () => {
    await syncMarkersFromStructured()
  },
  { deep: true },
)

watch(
  sourceDays,
  (days) => {
    if (!days?.length) return
    const next = clampDay(selectedDay.value)
    if (selectedDay.value !== next) selectedDay.value = next
  },
  { deep: true },
)

function goBack() {
  router.back()
}

async function saveCourse() {
  if (!tripStore.aiStructured) {
    window.alert?.(
      '저장할 일정 데이터가 없습니다. AI 채팅에서 일정이 만들어진 뒤 다시 시도해 주세요.',
    )
    return
  }
  if (!authStore.accessToken) {
    window.alert?.('로그인 후 이용해 주세요.')
    return
  }
  savingCourse.value = true
  try {
    const summary = await saveStructuredPlan(authStore.accessToken, {
      title: resultTitle.value,
      structured: tripStore.aiStructured,
    })
    const nextMeta = summary?.id != null
      ? { planId: summary.id, title: summary.title || resultTitle.value }
      : null
    if (nextMeta) {
      tripStore.setAiStructured(tripStore.aiStructured, nextMeta)
    }
    await router.replace({ name: 'result', query: { planId: String(summary.id) } })
    window.alert?.('일정을 저장했어요. 디스커버 「내가 만든 일정」·저장함에서 볼 수 있어요.')
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
    window.alert?.(e.message || '저장에 실패했습니다.')
  } finally {
    savingCourse.value = false
  }
}

function generateAnother() {
  router.push('/ai')
}
</script>

<template>
  <div class="result">
    <header class="result__header">
      <button class="result__back-btn" @click="goBack" aria-label="뒤로가기">‹</button>
      <h2 class="result__title">{{ resultTitle }}</h2>
      <button
        class="result__header-save"
        type="button"
        :disabled="!canSaveStructuredPlan || savingCourse || !!planLoadError"
        :title="canSaveStructuredPlan ? '계정에 일정 저장' : 'AI 채팅으로 만든 일정만 저장할 수 있어요'"
        @click="saveCourse"
      >
        {{ savingCourse ? '저장…' : tripStore.savedPlanMeta?.planId ? '다시 저장' : '코스 저장' }}
      </button>
    </header>

    <div v-if="planLoadError" class="result__banner result__banner--error" role="alert">
      {{ planLoadError }}
    </div>
    <div v-else-if="loadingPlan && route.query.planId" class="result__banner">
      저장 일정 불러오는 중…
    </div>

    <div class="result__map-section">
      <MapView />
    </div>

    <div class="result__itinerary-section">
      <ItineraryTimeline
        :source-days="sourceDays"
        :model-value="selectedDay"
        :locker-lang="getApiLangCode()"
        @update:model-value="selectedDay = $event"
      />
    </div>

    <div class="result__actions">
      <button
        class="result__btn result__btn--save"
        type="button"
        :disabled="!canSaveStructuredPlan || savingCourse || !!planLoadError"
        :title="canSaveStructuredPlan ? '' : 'AI 채팅으로 만든 일정만 저장할 수 있어요'"
        @click="saveCourse"
      >
        {{
          savingCourse
            ? '저장 중…'
            : tripStore.savedPlanMeta?.planId
              ? '다시 저장'
              : '코스 저장'
        }}
      </button>
      <button class="result__btn result__btn--another" type="button" @click="generateAnother">
        다시 생성
      </button>
    </div>
  </div>
</template>

<style scoped>
.result {
  height: 100dvh;
  max-height: 100dvh;
  background: #fafaf8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.result__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  z-index: 10;
}

.result__header-save {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 10px;
  border: 2px solid #fe9c00;
  background: #fff7ed;
  color: #c2410c;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.result__header-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  border-color: #d6d3d1;
  background: #f5f5f4;
  color: #a8a29e;
}

.result__header-save:active:not(:disabled) {
  opacity: 0.88;
}

.result__banner {
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #57534e;
  background: #fffbeb;
  border-bottom: 1px solid #fde68a;
}

.result__banner--error {
  color: #b91c1c;
  background: #fef2f2;
  border-bottom-color: #fecaca;
}

.result__back-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #333;
  cursor: pointer;
  line-height: 1;
  padding: 0 8px 0 0;
  flex-shrink: 0;
}

.result__title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result__map-section {
  height: 46dvh;
  flex-shrink: 0;
  background: #e8e8e8;
  position: relative;
}

.result__itinerary-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 8px;
  -webkit-overflow-scrolling: touch;
}

.result__actions {
  display: flex;
  gap: 12px;
  padding: 12px 20px max(16px, env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.result__btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.result__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.result__btn:active:not(:disabled) {
  opacity: 0.85;
}

.result__btn--save {
  background: #fff;
  color: #fe9c00;
  border: 2px solid #fe9c00;
}

.result__btn--another {
  background: #fe9c00;
  color: #fff;
}
</style>
