<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTripStore } from '@/stores/useTripStore'
import { useMapStore } from '@/stores/useMapStore'
import { useAuthStore } from '@/stores/useAuthStore'
import MapView from '@/components/map/MapView.vue'
import ItineraryTimeline from '@/components/itinerary/ItineraryTimeline.vue'
import { fetchSavedPlanDetail, saveStructuredPlan } from '@/services/savedPlansService'
import {
  flattenStructuredSlots,
  buildMapMarkersFromStructured,
  meanCenter,
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

const selectedDay = ref(1)
const allMarkers = ref([])
const allPolyline = ref([])

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
    selectedDay.value = 1
  } catch (e) {
    planLoadError.value = e.message || '일정을 불러오지 못했습니다.'
  } finally {
    loadingPlan.value = false
  }
}

watch(selectedDay, (day) => {
  if (allMarkers.value.length) applyDayToMap(day)
})

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

function goBack() {
  router.back()
}

async function saveCourse() {
  if (!tripStore.aiStructured) {
    window.alert?.('저장할 AI 일정이 없습니다.')
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
    window.alert?.('일정을 저장했어요. 홈의 「내가 저장한 일정」에서도 볼 수 있어요.')
  } catch (e) {
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
        @update:model-value="selectedDay = $event"
      />
    </div>

    <div class="result__actions">
      <button
        class="result__btn result__btn--save"
        type="button"
        :disabled="savingCourse || planLoadError"
        @click="saveCourse"
      >
        {{ savingCourse ? '저장 중…' : '코스 저장' }}
      </button>
      <button class="result__btn result__btn--another" type="button" @click="generateAnother">
        다시 생성
      </button>
    </div>
  </div>
</template>

<style scoped>
.result {
  min-height: 100dvh;
  background: #fafaf8;
  display: flex;
  flex-direction: column;
}

.result__header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
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
  overflow-y: auto;
  padding: 16px 20px 8px;
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
