<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { IsIcon } from '@ratoufa/iconsax-vue'
import { useMapStore } from '@/stores/useMapStore'
import { fetchAttractions, fetchLockers } from '@/services/attractionService'
import MapView from '@/components/map/MapView.vue'
import AttractionDetailView from '@/views/AttractionDetailView.vue'
import LockerDetailView from '@/views/LockerDetailView.vue'

const mapStore = useMapStore()

// ── GPS ──────────────────────────────────────────────────────────────
const gpsLoading = ref(false)
const gpsError = ref('')

// ── Density ──────────────────────────────────────────────────────────
const courseDensityIndex = ref(2)

const densityModes = [
  { id: 'local0',      text: '유명 관광지 완전 위주',     scoreMin: 0,    scoreMax: 0 },
  { id: 'local1-30',   text: '관광지 중심, 로컬 가미',    scoreMin: 0.01, scoreMax: 0.30 },
  { id: 'local31-50',  text: '관광지 & 로컬 균형',        scoreMin: 0.31, scoreMax: 0.50 },
  { id: 'local51-70',  text: '로컬 핀 중심, 관광지 가미', scoreMin: 0.51, scoreMax: 0.70 },
  { id: 'local71-100', text: '완전 로컬 핀 위주',         scoreMin: 0.71, scoreMax: 1.0 },
]

function changeCourseDensity(delta) {
  const last = densityModes.length - 1
  courseDensityIndex.value = Math.max(0, Math.min(last, courseDensityIndex.value + delta))
}

// ── Categories ───────────────────────────────────────────────────────
const categories = [
  { id: '음식',         icon: 'cup',        color: '#f97316', label: '음식' },
  { id: '쇼핑',         icon: 'shop',       color: '#ec4899', label: '쇼핑' },
  { id: '체험관광',      icon: 'people',    color: '#8b5cf6', label: '체험관광' },
  { id: '자연관광',      icon: 'tree',      color: '#16a34a', label: '자연관광' },
  { id: '문화관광',      icon: 'courthouse', color: '#a16207', label: '문화관광' },
  { id: '역사관광',      icon: 'building',  color: '#78716c', label: '역사관광' },
  { id: '레저스포츠',    icon: 'activity',  color: '#2563eb', label: '레저스포츠' },
]

const activeCategory = ref(null)

function selectCategory(id) {
  activeCategory.value = activeCategory.value === id ? null : id
}

// ── Attractions ───────────────────────────────────────────────────────
const attractions = ref([])
const lockers = ref([])
const attractionsLoading = ref(false)

onMounted(async () => {
  attractionsLoading.value = true
  try {
    const [attrData, lockerData] = await Promise.allSettled([
      fetchAttractions(),
      fetchLockers(),
    ])
    if (attrData.status === 'fulfilled') {
      attractions.value = attrData.value
    } else {
      console.error('[MapPage] 관광지 로드 실패:', attrData.reason)
    }
    if (lockerData.status === 'fulfilled') {
      lockers.value = lockerData.value
    } else {
      console.error('[MapPage] 물품보관소 로드 실패:', lockerData.reason)
    }
  } finally {
    attractionsLoading.value = false
  }
  fetchCurrentLocation()
})

const filteredAttractions = computed(() => {
  const mode = densityModes[courseDensityIndex.value]
  let list = attractions.value

  if (mode.id === 'local0') {
    list = list.filter((a) => Number(a.score) === 0)
  } else {
    list = list.filter((a) => {
      const s = Number(a.score)
      return s >= mode.scoreMin && s <= mode.scoreMax
    })
  }

  if (activeCategory.value) {
    list = list.filter((a) => a.cat1Name === activeCategory.value)
  }

  return list
})

// 관광지 + 물품보관소 마커 통합 computed
const allMarkers = computed(() => {
  const attrMarkers = filteredAttractions.value
    .filter((a) => a.lat != null && a.lng != null)
    .map((a) => ({
      id: a.id,
      lat: Number(a.lat),
      lng: Number(a.lng),
    }))

  const lockerMarkers = lockers.value
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: `locker-${l.id}`,
      lat: Number(l.latitude),
      lng: Number(l.longitude),
      type: 'locker',
    }))

  return [...attrMarkers, ...lockerMarkers]
})

// Map store에 마커 동기화
watch(
  allMarkers,
  (markers) => {
    mapStore.selectMarker(null)
    mapStore.setMarkers(markers)
  },
  { immediate: true },
)

// ── Bottom Sheet ─────────────────────────────────────────────────────
const sheetOpen = computed(() => mapStore.selectedMarkerId != null)

const isLockerSheet = computed(() => {
  const id = mapStore.selectedMarkerId
  return typeof id === 'string' && id.startsWith('locker-')
})

const lockerSheetId = computed(() => {
  if (!isLockerSheet.value) return null
  const raw = String(mapStore.selectedMarkerId).replace(/^locker-/, '')
  return raw || null
})

function closeSheet() {
  mapStore.selectMarker(null)
}

// ESC 키로 시트 닫기
function onKeyDown(e) {
  if (e.key === 'Escape') closeSheet()
}
onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

// ── GPS ──────────────────────────────────────────────────────────────
function fetchCurrentLocation() {
  if (!navigator.geolocation) {
    gpsError.value = '이 브라우저는 위치 서비스를 지원하지 않습니다.'
    return
  }
  gpsLoading.value = true
  gpsError.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      mapStore.setCurrentLocation(lat, lng)
      mapStore.setCenter(lat, lng)
      gpsLoading.value = false
    },
    (err) => {
      gpsLoading.value = false
      switch (err.code) {
        case err.PERMISSION_DENIED:
          gpsError.value = '위치 접근 권한이 거부되었습니다.'
          break
        case err.POSITION_UNAVAILABLE:
          gpsError.value = '위치 정보를 가져올 수 없습니다.'
          break
        case err.TIMEOUT:
          gpsError.value = '위치 조회 시간이 초과되었습니다.'
          break
        default:
          gpsError.value = '위치를 가져오지 못했습니다.'
      }
      setTimeout(() => { gpsError.value = '' }, 3000)
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  )
}
</script>

<template>
  <div class="map-page">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <header class="map-page__header">
      <h1 class="map-page__title">서울 지도</h1>
      <span v-if="attractionsLoading" class="map-page__loading-badge">로드 중…</span>
      <span v-else class="map-page__count-badge">{{ allMarkers.length }}개 핀</span>
    </header>

    <!-- ── Density Selector ────────────────────────────────────── -->
    <div class="map-density-bar">
      <p class="map-density-bar__label">여행 스타일</p>
      <div class="map-density-bar__control">
        <button
          class="map-density-bar__arrow"
          :disabled="courseDensityIndex === 0"
          aria-label="이전"
          @click="changeCourseDensity(-1)"
        >
          <ChevronLeft :size="16" :stroke-width="2.5" />
        </button>
        <div class="map-density-bar__track">
          <button
            v-for="(mode, i) in densityModes"
            :key="mode.id"
            class="map-density-bar__pip"
            :class="{ 'map-density-bar__pip--active': courseDensityIndex === i }"
            :aria-label="mode.text"
            @click="courseDensityIndex = i"
          />
        </div>
        <button
          class="map-density-bar__arrow"
          :disabled="courseDensityIndex === densityModes.length - 1"
          aria-label="다음"
          @click="changeCourseDensity(1)"
        >
          <ChevronRight :size="16" :stroke-width="2.5" />
        </button>
      </div>
      <p class="map-density-bar__text">{{ densityModes[courseDensityIndex].text }}</p>
    </div>

    <!-- ── Map + Overlays ─────────────────────────────────────── -->
    <div class="map-page__map">
      <MapView />

      <!-- Category chips overlay -->
      <div class="map-page__cat-overlay">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="map-cat-chip"
          :class="{ 'map-cat-chip--active': activeCategory === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <IsIcon
            :name="cat.icon"
            :variant="activeCategory === cat.id ? 'bulk' : 'twotone'"
            :size="14"
            :color="activeCategory === cat.id ? '#fff' : cat.color"
          />
          <span class="map-cat-chip__label">{{ cat.label }}</span>
        </button>
      </div>

      <!-- GPS 현재 위치 버튼 -->
      <button
        class="map-page__locate-btn"
        :class="{ 'map-page__locate-btn--loading': gpsLoading }"
        :disabled="gpsLoading"
        aria-label="현재 위치로 이동"
        @click="fetchCurrentLocation"
      >
        <span v-if="gpsLoading" class="map-page__locate-spinner"></span>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="8"/>
          <circle cx="12" cy="12" r="1.5" fill="#555" stroke="none"/>
          <line x1="12" y1="2" x2="12" y2="5"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="5" y2="12"/>
          <line x1="19" y1="12" x2="22" y2="12"/>
        </svg>
      </button>

      <!-- 핀 범례 -->
      <div class="map-page__legend">
        <div class="map-page__legend-item">
          <span class="map-page__legend-dot" style="background:#FE9C00;"></span>
          <span class="map-page__legend-label">관광지</span>
        </div>
        <div class="map-page__legend-item">
          <span class="map-page__legend-dot" style="background:#0d9488;"></span>
          <span class="map-page__legend-label">물품보관소</span>
        </div>
      </div>

      <!-- GPS 에러 토스트 -->
      <Transition name="toast">
        <div v-if="gpsError" class="map-page__toast">
          ⚠️ {{ gpsError }}
        </div>
      </Transition>
    </div>

    <!-- ── Bottom Sheet ───────────────────────────────────────── -->
    <Transition name="sheet">
      <div v-if="sheetOpen" class="map-sheet">
        <!-- 반투명 배경 -->
        <div class="map-sheet__backdrop" @click="closeSheet" />

        <!-- 기존 AttractionDetailView 그대로 임베드 -->
        <div class="map-sheet__panel">
          <div class="map-sheet__handle-bar" />
          <LockerDetailView
            v-if="isLockerSheet && lockerSheetId"
            :locker-id="lockerSheetId"
            class="map-sheet__detail"
            @close="closeSheet"
          />
          <AttractionDetailView
            v-else-if="!isLockerSheet"
            :attraction-id="mapStore.selectedMarkerId"
            class="map-sheet__detail"
            @close="closeSheet"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: #fafaf8;
  padding-bottom: max(64px, calc(64px + env(safe-area-inset-bottom)));
  position: relative; /* 바텀시트 absolute 기준점 */
}

/* ── Header ─────────────────────────────────────────────────────────── */
.map-page__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.map-page__title {
  font-size: 17px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
}

.map-page__count-badge,
.map-page__loading-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: #fff3df;
  color: #c97000;
  border: 1px solid #ffe3ba;
  white-space: nowrap;
}

.map-page__loading-badge {
  background: #f0f0f0;
  color: #999;
  border-color: #e0e0e0;
}

/* ── Density Bar ─────────────────────────────────────────────────────── */
.map-density-bar {
  background: linear-gradient(110deg, #ffb23f 0%, #fe9c00 48%, #ff8f00 100%);
  padding: 12px 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.map-density-bar__label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.map-density-bar__control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.map-density-bar__arrow {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  backdrop-filter: blur(4px);
}

.map-density-bar__arrow:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.3);
}

.map-density-bar__arrow:not(:disabled):active {
  transform: scale(0.92);
}

.map-density-bar__arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.map-density-bar__track {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  position: relative;
  padding: 8px 0;
}

.map-density-bar__track::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.map-density-bar__pip {
  position: relative;
  z-index: 1;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;
  flex-shrink: 0;
}

.map-density-bar__pip:hover {
  background: rgba(255, 255, 255, 0.55);
}

.map-density-bar__pip--active {
  width: 18px;
  height: 18px;
  background: #fff;
  border-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.map-density-bar__text {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  letter-spacing: -0.2px;
}

/* ── Map ─────────────────────────────────────────────────────────────── */
.map-page__map {
  flex: 1;
  min-height: 0;
  position: relative;
}

/* ── Category Overlay ────────────────────────────────────────────────── */
.map-page__cat-overlay {
  position: absolute;
  top: 12px;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  gap: 6px;
  padding: 0 12px;
  overflow-x: auto;
  scrollbar-width: none;
  pointer-events: none; /* allow touch through gaps */
}

.map-page__cat-overlay::-webkit-scrollbar {
  display: none;
}

.map-cat-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px 6px 8px;
  background: rgba(255, 255, 255, 0.94);
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  cursor: pointer;
  pointer-events: auto;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.map-cat-chip:active {
  transform: scale(0.93);
}

.map-cat-chip--active {
  background: #fe9c00;
  border-color: #fe9c00;
  box-shadow: 0 2px 10px rgba(254, 156, 0, 0.4);
}

.map-cat-chip__label {
  font-size: 11px;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
}

.map-cat-chip--active .map-cat-chip__label {
  color: #fff;
}

/* ── GPS Button ──────────────────────────────────────────────────────── */
.map-page__locate-btn {
  position: absolute;
  bottom: 20px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: transform 0.15s, box-shadow 0.15s;
}

/* ── Legend ──────────────────────────────────────────────────────────── */
.map-page__legend {
  position: absolute;
  bottom: 20px;
  left: 16px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.map-page__legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
}

.map-page__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.map-page__legend-label {
  font-size: 11px;
  font-weight: 700;
  color: #444;
  white-space: nowrap;
}

.map-page__locate-btn:active {
  transform: scale(0.93);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.14);
}

.map-page__locate-btn--loading {
  cursor: default;
  opacity: 0.7;
}

.map-page__locate-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid #e0e0e0;
  border-top-color: #4285F4;
  border-radius: 50%;
  animation: map-spin 0.8s linear infinite;
}

@keyframes map-spin {
  to { transform: rotate(360deg); }
}

/* ── Toast ───────────────────────────────────────────────────────────── */
.map-page__toast {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(40, 40, 40, 0.88);
  color: #fff;
  font-size: 13px;
  padding: 10px 18px;
  border-radius: 20px;
  white-space: nowrap;
  z-index: 50;
  pointer-events: none;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

/* ── Bottom Sheet ────────────────────────────────────────────────────── */
.map-sheet {
  position: absolute;   /* fixed 대신 absolute → 430px 컨테이너 안에 구속 */
  inset: 0;
  z-index: 200;
  pointer-events: none;
}

.map-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  pointer-events: auto;
}

.map-sheet__panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.14);
  padding-top: 10px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  height: 60%;
  overflow: hidden;
}

.map-sheet__handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #e0e0e0;
  margin: 0 auto 6px;
  flex-shrink: 0;
}

/* AttractionDetailView가 패널 안에서 스크롤 */
.map-sheet__detail {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Sheet 트랜지션 */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}

.sheet-enter-active .map-sheet__panel,
.sheet-leave-active .map-sheet__panel {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .map-sheet__panel,
.sheet-leave-to .map-sheet__panel {
  transform: translateY(100%);
}
</style>
