<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { IsIcon } from '@ratoufa/iconsax-vue';
import { useMapStore } from '@/stores/useMapStore';
import { fetchAttractions, fetchLockers } from '@/services/attractionService';
import { fetchCongestions } from '@/services/congestionService';
import MapView from '@/components/map/MapView.vue';
import AttractionDetailView from '@/views/AttractionDetailView.vue';
import LockerDetailView from '@/views/LockerDetailView.vue';

const { t } = useI18n();
const mapStore = useMapStore();

// ── GPS ──────────────────────────────────────────────────────────────
const gpsLoading = ref(false);
const gpsError = ref('');

// ── Congestion ───────────────────────────────────────────────────────
const congestions = ref([]);
const showCongestionInfo = ref(false);

// ── Density ──────────────────────────────────────────────────────────
const courseDensityIndex = ref(2);

const densityModes = computed(() => [
  { id: 'local0',      text: t('discover.densityMode.local0'),      scoreMin: 0,    scoreMax: 0 },
  { id: 'local1-30',   text: t('discover.densityMode.local1-30'),   scoreMin: 0.01, scoreMax: 0.30 },
  { id: 'local31-50',  text: t('discover.densityMode.local31-50'),  scoreMin: 0.31, scoreMax: 0.50 },
  { id: 'local51-70',  text: t('discover.densityMode.local51-70'),  scoreMin: 0.51, scoreMax: 0.70 },
  { id: 'local71-100', text: t('discover.densityMode.local71-100'), scoreMin: 0.71, scoreMax: 1.0 },
]);

const personaDensityIndexMap = {
  main100: 0,
  main70: 1,
  balanced: 2,
  local70: 3,
  local100: 4,
};

function applyInitialDensityFromPersona() {
  let pref = null;
  try {
    pref = JSON.parse(localStorage.getItem('bts:auth:v1') || '{}')?.user?.localPreference;
  } catch {
    pref = null;
  }
  if (!pref || !(pref in personaDensityIndexMap)) return;
  courseDensityIndex.value = personaDensityIndexMap[pref];
}

// ── Categories ───────────────────────────────────────────────────────
const categories = computed(() => [
  { id: null,        icon: 'element-4',  color: '#fe9c00', label: t('discover.category.all') },
  { id: '음식',      icon: 'cup',        color: '#f97316', label: t('discover.category.food') },
  { id: '쇼핑',      icon: 'shop',       color: '#ec4899', label: t('discover.category.shopping') },
  { id: '체험관광',  icon: 'people',     color: '#8b5cf6', label: t('discover.category.experience') },
  { id: '자연관광',  icon: 'tree',       color: '#16a34a', label: t('discover.category.nature') },
  { id: '문화관광',  icon: 'courthouse', color: '#a16207', label: t('discover.category.culture') },
  { id: '역사관광',  icon: 'building',   color: '#78716c', label: t('discover.category.history') },
  { id: '레저스포츠', icon: 'activity',  color: '#2563eb', label: t('discover.category.leisure') },
]);

const activeCategory = ref(null);

function selectCategory(id) {
  activeCategory.value = id;
}

// ── Attractions ───────────────────────────────────────────────────────
const attractions = ref([]);
const lockers = ref([]);
const attractionsLoading = ref(false);

async function loadAttractionsByDensity() {
  const mode = densityModes.value[courseDensityIndex.value];
  return fetchAttractions({
    minScore: mode.scoreMin,
    maxScore: mode.scoreMax,
  });
}

onMounted(async () => {
  applyInitialDensityFromPersona();
  attractionsLoading.value = true;
  try {
    const [attrData, lockerData, congData] = await Promise.allSettled([
      loadAttractionsByDensity(),
      fetchLockers(),
      fetchCongestions(),
    ]);
    if (attrData.status === 'fulfilled') {
      attractions.value = attrData.value;
    } else {
      console.error('[MapPage] 관광지 로드 실패:', attrData.reason);
    }
    if (lockerData.status === 'fulfilled') {
      lockers.value = lockerData.value;
    } else {
      console.error('[MapPage] 물품보관소 로드 실패:', lockerData.reason);
    }
    if (congData.status === 'fulfilled') {
      congestions.value = congData.value;
    } else {
      console.error('[MapPage] 혼잡도 로드 실패:', congData.reason);
    }
  } finally {
    attractionsLoading.value = false;
  }
  fetchCurrentLocation();
});

const filteredAttractions = computed(() => {
  let list = attractions.value ?? [];

  if (activeCategory.value) {
    list = list.filter((a) => a.cat1Name === activeCategory.value);
  }

  return list;
});

// 관광지 + 물품보관소 + 혼잡도 마커 통합 computed
const allMarkers = computed(() => {
  const attrMarkers = filteredAttractions.value
    .filter((a) => a.lat != null && a.lng != null)
    .map((a) => ({
      id: a.id,
      lat: Number(a.lat),
      lng: Number(a.lng),
    }));

  const lockerMarkers = lockers.value
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: `locker-${l.id}`,
      lat: Number(l.latitude),
      lng: Number(l.longitude),
      type: 'locker',
    }));

  const congestionMarkers = congestions.value
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      id: c.id, // already has 'zone-' prefix from service
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      type: 'congestion',
      congestionLevel: c.congestion_level,
      areaName: c.area_name,
    }));

  return [...attrMarkers, ...lockerMarkers, ...congestionMarkers];
});

// Map store에 마커 동기화
watch(
  allMarkers,
  (markers) => {
    mapStore.selectMarker(null);
    mapStore.setMarkers(markers);
  },
  { immediate: true },
);

// ── Bottom Sheet ─────────────────────────────────────────────────────
const sheetOpen = computed(() => mapStore.selectedMarkerId != null);

const isLockerSheet = computed(() => {
  const id = mapStore.selectedMarkerId;
  return typeof id === 'string' && id.startsWith('locker-');
});

const isZoneSheet = computed(() => {
  const id = mapStore.selectedMarkerId;
  return typeof id === 'string' && id.startsWith('zone-');
});

const selectedZone = computed(() => {
  if (!isZoneSheet.value) return null;
  return congestions.value.find((c) => c.id === mapStore.selectedMarkerId);
});

const lockerSheetId = computed(() => {
  if (!isLockerSheet.value) return null;
  const raw = String(mapStore.selectedMarkerId).replace(/^locker-/, '');
  return raw || null;
});

function getCongestionText(level) {
  if (level === 4) return '매우 붐빔';
  if (level === 3) return '약간 붐빔';
  if (level === 2) return '보통';
  return '여유';
}

function getCongestionClass(level) {
  return `congestion-badge--${level}`;
}

function closeSheet() {
  mapStore.selectMarker(null);
}

// ESC 키로 시트 닫기
function onKeyDown(e) {
  if (e.key === 'Escape') closeSheet();
}
onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));

// ── GPS ──────────────────────────────────────────────────────────────
function fetchCurrentLocation() {
  if (!navigator.geolocation) {
    gpsError.value = t('map.gps.notSupported');
    return;
  }
  gpsLoading.value = true;
  gpsError.value = '';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      mapStore.setCurrentLocation(lat, lng);
      mapStore.setCenter(lat, lng);
      gpsLoading.value = false;
    },
    (err) => {
      gpsLoading.value = false;
      switch (err.code) {
        case err.PERMISSION_DENIED:
          gpsError.value = t('map.gps.denied');
          break;
        case err.POSITION_UNAVAILABLE:
          gpsError.value = t('map.gps.unavailable');
          break;
        case err.TIMEOUT:
          gpsError.value = t('map.gps.timeout');
          break;
        default:
          gpsError.value = t('map.gps.error');
      }
      setTimeout(() => {
        gpsError.value = '';
      }, 3000);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}
</script>

<template>
  <div class="map-page">
    <!-- ── Header ─────────────────────────────────────────────── -->
    <header class="map-page__header">
      <h1 class="map-page__title">{{ $t('map.title') }}</h1>
      <span v-if="attractionsLoading" class="map-page__loading-badge">{{ $t('map.loading') }}</span>
      <span v-else class="map-page__count-badge">{{ $t('map.pinCount', { n: allMarkers.length }) }}</span>
    </header>

    <!-- ── Map + Overlays ─────────────────────────────────────── -->
    <div class="map-page__map">
      <MapView />

      <!-- Category chips overlay -->
      <div class="map-page__cat-overlay">
        <button
          v-for="cat in categories"
          :key="cat.id ?? '__all__'"
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
        :aria-label="$t('map.locateCurrent')"
        @click="fetchCurrentLocation"
      >
        <span v-if="gpsLoading" class="map-page__locate-spinner"></span>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#555"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="1.5" fill="#555" stroke="none" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      <!-- 혼잡도 범례 (상단 부유형) -->
      <div
        class="map-page__congestion-legend"
        @click="showCongestionInfo = true"
      >
        <div class="congestion-legend-item">
          <span class="congestion-dot congestion-dot--1"></span>
          <span class="congestion-label">여유</span>
        </div>
        <div class="congestion-legend-item">
          <span class="congestion-dot congestion-dot--2"></span>
          <span class="congestion-label">보통</span>
        </div>
        <div class="congestion-legend-item">
          <span class="congestion-dot congestion-dot--3"></span>
          <span class="congestion-label">붐빔</span>
        </div>
        <div class="congestion-legend-item">
          <span class="congestion-dot congestion-dot--4"></span>
          <span class="congestion-label">매우붐빔</span>
        </div>
        <div class="congestion-legend-right">
          <div class="congestion-legend-info">
            <IsIcon name="info-circle" :size="14" />
          </div>
          <div
            class="congestion-toggle"
            role="switch"
            :aria-checked="mapStore.showCongestion"
            @click.stop="mapStore.toggleCongestion"
          >
            <div
              class="toggle-track"
              :class="{ 'toggle-track--active': mapStore.showCongestion }"
            >
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 핀 범례 -->
      <div class="map-page__legend">
        <div class="map-page__legend-item map-page__legend-item--attraction">
          <span
            class="map-page__legend-dot"
            :style="{ background: mapStore.showAttraction ? '#fe9c00' : '#b0bec5' }"
          ></span>
          <span
            class="map-page__legend-label"
            :class="{ 'map-page__legend-label--off': !mapStore.showAttraction }"
          >{{ $t('map.legendAttraction') }}</span>
          <div
            class="attraction-toggle"
            role="switch"
            :aria-checked="mapStore.showAttraction"
            style="pointer-events: auto"
            @click.stop="mapStore.toggleAttraction"
          >
            <div
              class="toggle-track"
              :class="{ 'toggle-track--active': mapStore.showAttraction }"
            >
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </div>
        <div class="map-page__legend-item map-page__legend-item--locker">
          <span
            class="map-page__legend-dot"
            :style="{ background: mapStore.showLocker ? '#0d9488' : '#b0bec5' }"
          ></span>
          <span
            class="map-page__legend-label"
            :class="{ 'map-page__legend-label--off': !mapStore.showLocker }"
          >{{ $t('map.legendLocker') }}</span>
          <div
            class="locker-toggle"
            role="switch"
            :aria-checked="mapStore.showLocker"
            style="pointer-events: auto"
            @click.stop="mapStore.toggleLocker"
          >
            <div
              class="toggle-track"
              :class="{ 'toggle-track--active': mapStore.showLocker }"
            >
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- GPS 에러 토스트 -->
      <Transition name="toast">
        <div v-if="gpsError" class="map-page__toast">⚠️ {{ gpsError }}</div>
      </Transition>

      <!-- 혼잡도 안내 모달 -->
      <Transition name="fade">
        <div
          v-if="showCongestionInfo"
          class="congestion-modal-overlay"
          @click.self="showCongestionInfo = false"
        >
          <div class="congestion-modal">
            <header class="congestion-modal__header">
              <h3 class="congestion-modal__title">실시간 혼잡도 안내</h3>
              <button
                class="congestion-modal__close"
                @click="showCongestionInfo = false"
              >
                <IsIcon name="close-circle" :size="20" />
              </button>
            </header>
            <div class="congestion-modal__body">
              <div class="congestion-info-row">
                <span class="congestion-dot congestion-dot--1"></span>
                <div class="congestion-info-text">
                  <p class="congestion-info-name">여유</p>
                  <p class="congestion-info-desc">
                    사람이 적어 쾌적하게 이동하고 구경할 수 있어요.
                  </p>
                </div>
              </div>
              <div class="congestion-info-row">
                <span class="congestion-dot congestion-dot--2"></span>
                <div class="congestion-info-text">
                  <p class="congestion-info-name">보통</p>
                  <p class="congestion-info-desc">
                    적당한 인파가 있어요. 일상적인 활동이 가능해요.
                  </p>
                </div>
              </div>
              <div class="congestion-info-row">
                <span class="congestion-dot congestion-dot--3"></span>
                <div class="congestion-info-text">
                  <p class="congestion-info-name">약간 붐빔</p>
                  <p class="congestion-info-desc">
                    사람이 다소 많아 활기차지만, 조금 복잡할 수 있어요.
                  </p>
                </div>
              </div>
              <div class="congestion-info-row">
                <span class="congestion-dot congestion-dot--4"></span>
                <div class="congestion-info-text">
                  <p class="congestion-info-name">매우 붐빔</p>
                  <p class="congestion-info-desc">
                    인파가 매우 많아 혼잡해요. 안전에 유의하세요!
                  </p>
                </div>
              </div>
            </div>
            <p class="congestion-modal__footer">
              ※ 데이터 제공: 서울시 실시간 인구 데이터
            </p>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Bottom Sheet ───────────────────────────────────────── -->
    <Transition name="sheet">
      <div v-if="sheetOpen" class="map-sheet">
        <!-- 반투명 배경 -->
        <div class="map-sheet__backdrop" @click="closeSheet" />

        <!-- 기존 AttractionDetailView 그대로 임베드 -->
        <div
          class="map-sheet__panel"
          :class="{ 'map-sheet__panel--zone': isZoneSheet }"
        >
          <div class="map-sheet__handle-bar" />
          <div v-if="isZoneSheet && selectedZone" class="zone-detail">
            <header class="zone-detail__header">
              <div class="zone-detail__title-row">
                <h2 class="zone-detail__title">
                  {{ selectedZone.area_name }} 권역
                </h2>
                <span
                  class="congestion-badge"
                  :class="getCongestionClass(selectedZone.congestion_level)"
                >
                  {{ getCongestionText(selectedZone.congestion_level) }}
                </span>
              </div>
              <p class="zone-detail__time">
                {{ selectedZone.population_time }} 기준
              </p>
            </header>
            <div class="zone-detail__body">
              <h3 class="zone-detail__section-title">포함된 주요 지역</h3>
              <div class="zone-detail__tags">
                <span
                  v-for="area in selectedZone.sub_areas"
                  :key="area"
                  class="zone-area-tag"
                >
                  #{{ area }}
                </span>
              </div>
              <div class="zone-detail__info-card">
                <IsIcon name="info-circle" :size="16" />
                <p>
                  해당 권역 내 여러 장소의 실시간 인구 데이터를 종합하여 산출한
                  평균 혼잡도입니다.
                </p>
              </div>
            </div>
          </div>
          <LockerDetailView
            v-else-if="isLockerSheet && lockerSheetId"
            :locker-id="lockerSheetId"
            class="map-sheet__detail"
            @close="closeSheet"
          />
          <AttractionDetailView
            v-else-if="!isLockerSheet && !isZoneSheet"
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
  transition:
    background 0.15s,
    transform 0.1s;
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
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.12s;
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
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.1s;
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
  transition:
    transform 0.15s,
    box-shadow 0.15s;
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
  pointer-events: auto;
}

.map-page__legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  pointer-events: none;
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
  flex: 1;
}

.map-page__legend-label--off {
  color: #b0bec5;
}

.map-page__legend-item--attraction,
.map-page__legend-item--locker {
  pointer-events: auto;
  cursor: pointer;
  justify-content: space-between;
  width: 100%;
}

.attraction-toggle,
.locker-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-left: 8px;
  flex-shrink: 0;
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
  border-top-color: #4285f4;
  border-radius: 50%;
  animation: map-spin 0.8s linear infinite;
}

@keyframes map-spin {
  to {
    transform: rotate(360deg);
  }
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
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

/* ── Bottom Sheet ────────────────────────────────────────────────────── */
.map-sheet {
  position: absolute; /* fixed 대신 absolute → 430px 컨테이너 안에 구속 */
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

.map-sheet__panel--zone {
  height: auto;
  max-height: 42%;
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

/* ── Congestion Legend ────────────────────────────────────────────────── */
.map-page__congestion-legend {
  position: absolute;
  top: 58px;
  left: 12px;
  right: 12px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: transform 0.15s;
}

.map-page__congestion-legend:active {
  transform: scale(0.98);
}

.congestion-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.congestion-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.congestion-dot--1 {
  background: #22c55e;
} /* 여유 */
.congestion-dot--2 {
  background: #eab308;
} /* 보통 */
.congestion-dot--3 {
  background: #f97316;
} /* 붐빔 */
.congestion-dot--4 {
  background: #ef4444;
} /* 매우 붐빔 */

.congestion-label {
  font-size: 11px;
  font-weight: 700;
  color: #444;
}

.congestion-legend-right {
  display: flex;
  align-items: center;
  gap: 10px;
  border-left: 1px solid #eee;
  padding-left: 10px;
  margin-left: 4px;
}

.congestion-legend-info {
  color: #999;
  display: flex;
  align-items: center;
}

.congestion-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle-track {
  width: 28px;
  height: 16px;
  background: #e0e0e0;
  border-radius: 10px;
  position: relative;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-track--active {
  background: #fe9c00;
}

.attraction-toggle .toggle-track--active {
  background: #fe9c00;
}

.locker-toggle .toggle-track--active {
  background: #0d9488;
}

.toggle-thumb {
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-track--active .toggle-thumb {
  transform: translateX(12px);
}

/* ── Congestion Modal ─────────────────────────────────────────────────── */
.congestion-modal-overlay {
  position: absolute;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(3px);
}

.congestion-modal {
  width: 100%;
  max-width: 320px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-pop {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.congestion-modal__header {
  padding: 18px 20px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f5f5f5;
}

.congestion-modal__title {
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
}

.congestion-modal__close {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 0;
  display: flex;
  transition: color 0.2s;
}

.congestion-modal__close:hover {
  color: #888;
}

.congestion-modal__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.congestion-info-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.congestion-info-row .congestion-dot {
  margin-top: 4px;
  width: 12px;
  height: 12px;
}

.congestion-info-text {
  flex: 1;
}

.congestion-info-name {
  font-size: 13px;
  font-weight: 800;
  color: #333;
  margin: 0 0 2px;
}

.congestion-info-desc {
  font-size: 12px;
  color: #777;
  margin: 0;
  line-height: 1.45;
}

.congestion-modal__footer {
  margin: 0;
  padding: 12px 20px;
  background: #fcfcfc;
  font-size: 10px;
  color: #aaa;
  text-align: center;
}

/* ── Transitions ───────────────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── Zone Detail ───────────────────────────────────────────────────────── */
.zone-detail {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

.zone-detail__header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

.zone-detail__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.zone-detail__title {
  font-size: 20px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
}

.congestion-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  color: #fff;
}

.congestion-badge--1 {
  background: #22c55e;
}
.congestion-badge--2 {
  background: #eab308;
}
.congestion-badge--3 {
  background: #f97316;
}
.congestion-badge--4 {
  background: #ef4444;
}

.zone-detail__time {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.zone-detail__section-title {
  font-size: 14px;
  font-weight: 800;
  color: #333;
  margin: 0 0 12px;
}

.zone-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.zone-area-tag {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #eee;
}

.zone-detail__info-card {
  background: #f8fbff;
  border: 1px solid #e1efff;
  padding: 12px 16px;
  border-radius: 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.zone-detail__info-card p {
  margin: 0;
  font-size: 12px;
  color: #556;
  line-height: 1.5;
}

.zone-detail__info-card .is-icon {
  color: #3b82f6;
  margin-top: 1px;
}
</style>
