<script setup>
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useMapStore } from '@/stores/useMapStore'

const mapStore = useMapStore()
const mapRef = ref(null)

let mapInstance = null
let naverMarkers = []
let naverPolyline = null
let currentLocationMarker = null

// ── Naver Maps 스크립트 동적 로드 ─────────────────────────────
function loadNaverMapScript() {
  return new Promise((resolve, reject) => {
    // 이미 완전히 로드된 경우
    if (window.naver?.maps?.Map) {
      resolve()
      return
    }
    const existing = document.getElementById('naver-map-script')
    if (existing) {
      // 스크립트 태그는 있지만 아직 로드 중인 경우에만 이벤트 대기
      // 이미 완료됐으나 naver.maps가 없으면 auth 실패 → reject
      if (existing.dataset.loaded === 'true') {
        window.naver?.maps?.Map ? resolve() : reject(new Error('Naver Maps 인증 실패'))
        return
      }
      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true'
        resolve()
      }, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'naver-map-script'
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${import.meta.env.VITE_NAVER_MAP_CLIENT_ID}`
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// ── 현재 위치 마커 ─────────────────────────────────────────────
function buildCurrentLocationIcon() {
  return {
    content: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:rgba(66,133,244,0.25);
          animation:loc-pulse 1.8s ease-out infinite;
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:14px;height:14px;
          border-radius:50%;
          background:#4285F4;
          border:2.5px solid #fff;
          box-shadow:0 2px 6px rgba(66,133,244,0.5);
        "></div>
        <style>
          @keyframes loc-pulse {
            0%   { transform:scale(0.5); opacity:0.8; }
            100% { transform:scale(2.2); opacity:0; }
          }
        </style>
      </div>`,
    anchor: new window.naver.maps.Point(12, 12),
  }
}

function syncCurrentLocation(loc) {
  if (currentLocationMarker) {
    currentLocationMarker.setMap(null)
    currentLocationMarker = null
  }
  if (!loc) return
  currentLocationMarker = new window.naver.maps.Marker({
    position: new window.naver.maps.LatLng(loc.lat, loc.lng),
    map: mapInstance,
    icon: buildCurrentLocationIcon(),
    zIndex: 200,
  })
}

// ── 마커 색상 헬퍼 ─────────────────────────────────────────────
function markerColor(type, crowdLevel) {
  if (type === 'start')  return '#22c55e'
  if (type === 'end')    return '#ef4444'
  if (type === 'locker') return '#0d9488'
  if (crowdLevel === 'high')   return '#ef4444'
  if (crowdLevel === 'medium') return '#f97316'
  return '#FE9C00'
}

function buildMarkerIcon(type, crowdLevel, selected = false, id = null) {
  const color = markerColor(type, crowdLevel)
  const size = selected ? 22 : 14
  const border = selected ? '3px solid #fff' : '2px solid #fff'
  const shadow = selected
    ? '0 3px 10px rgba(0,0,0,.35), 0 0 0 4px rgba(254,156,0,0.3)'
    : '0 2px 6px rgba(0,0,0,.25)'
  const onclickAttr = id != null
    ? `onclick="window.__naverPinClick && window.__naverPinClick(${JSON.stringify(id)})" `
    : ''
  return {
    content: `
      <div
        ${onclickAttr}
        style="
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          width:30px;
          height:30px;
        "
      >
        <div style="
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${selected ? '#FF6B00' : color};
          border:${border};
          box-shadow:${shadow};
          pointer-events:none;
        "></div>
      </div>`,
    anchor: new window.naver.maps.Point(15, 15),
  }
}

// ── 마커 동기화 ────────────────────────────────────────────────
function syncMarkers(markers) {
  naverMarkers.forEach(({ nm }) => nm.setMap(null))
  naverMarkers = []

  markers.forEach(marker => {
    if (marker.lat == null || marker.lng == null) return
    const isSelected = mapStore.selectedMarkerId === marker.id
    const nm = new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(marker.lat, marker.lng),
      map: mapInstance,
      icon: buildMarkerIcon(marker.type, marker.crowdLevel, isSelected, marker.id),
      zIndex: isSelected ? 100 : 10,
    })
    naverMarkers.push({ nm, marker })
  })
}

// ── 선택 마커만 아이콘 갱신 ────────────────────────────────────
function syncSelectedMarker(selectedId) {
  naverMarkers.forEach(({ nm, marker }) => {
    const isSelected = marker.id === selectedId
    nm.setIcon(buildMarkerIcon(marker.type, marker.crowdLevel, isSelected, marker.id))
    nm.setZIndex(isSelected ? 100 : 10)
  })
}

// ── 폴리라인 동기화 ────────────────────────────────────────────
function syncPolyline(points) {
  if (naverPolyline) {
    naverPolyline.setMap(null)
    naverPolyline = null
  }
  const latLngPoints = points.filter(p => p.lat != null && p.lng != null)
  if (latLngPoints.length < 2) return

  naverPolyline = new window.naver.maps.Polyline({
    map: mapInstance,
    path: latLngPoints.map(p => new window.naver.maps.LatLng(p.lat, p.lng)),
    strokeColor: '#FE9C00',
    strokeWeight: 4,
    strokeOpacity: 0.9,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
  })
}

// ── 지도 초기화 ────────────────────────────────────────────────
onMounted(async () => {
  window.__naverPinClick = (id) => { mapStore.selectMarker(id) }
  window.navermap_authFailure = () => {
    console.error('[NaverMap] 인증 실패: NCP 콘솔에서 localhost:5173 도메인을 등록하세요.')
  }

  try {
    await loadNaverMapScript()

    if (!window.naver?.maps?.Map) {
      console.warn('[NaverMap] 지도 API를 불러오지 못했습니다.')
      return
    }

    const { lat, lng } = mapStore.mapCenter
    mapInstance = new window.naver.maps.Map(mapRef.value, {
      center: new window.naver.maps.LatLng(lat, lng),
      zoom: 14,
      mapTypeControl: false,
      scaleControl: false,
      logoControl: true,
      mapDataControl: false,
    })

    syncMarkers(mapStore.markers)
    syncPolyline(mapStore.polyline)
    syncCurrentLocation(mapStore.currentLocation)
  } catch (e) {
    console.warn('[NaverMap] 초기화 실패:', e?.message ?? e)
  }
})

onUnmounted(() => {
  naverMarkers.forEach(({ nm }) => nm.setMap(null))
  if (naverPolyline) naverPolyline.setMap(null)
  if (currentLocationMarker) currentLocationMarker.setMap(null)
  mapInstance = null
  delete window.__naverPinClick
  delete window.navermap_authFailure
})

// ── store 변경 반응 ────────────────────────────────────────────
watch(
  () => mapStore.markers,
  (markers) => { if (mapInstance) syncMarkers(markers) },
  { deep: true },
)

watch(
  () => mapStore.selectedMarkerId,
  (id) => { if (mapInstance) syncSelectedMarker(id) },
)

watch(
  () => mapStore.polyline,
  (points) => { if (mapInstance) syncPolyline(points) },
  { deep: true },
)

watch(
  () => mapStore.mapCenter,
  ({ lat, lng }) => {
    if (mapInstance)
      mapInstance.setCenter(new window.naver.maps.LatLng(lat, lng))
  },
)

watch(
  () => mapStore.currentLocation,
  (loc) => { if (mapInstance) syncCurrentLocation(loc) },
)
</script>

<template>
  <div class="map-view">
    <div ref="mapRef" class="map-view__canvas"></div>

  </div>
</template>

<style scoped>
.map-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.map-view__canvas {
  width: 100%;
  height: 100%;
}
</style>
