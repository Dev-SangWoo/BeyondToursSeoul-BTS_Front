import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  // marker shape: { lat, lng, label?, type?: 'start'|'end'|'default', crowdLevel?: 'low'|'medium'|'high' }
  const markers = ref([])
  // polyline shape: [{ lat, lng }, ...]
  const polyline = ref([])
  const selectedMarkerId = ref(null)
  const mapCenter = ref({ lat: 37.5665, lng: 126.9780 }) // 서울 시청 기본값
  // 현재 GPS 위치 { lat, lng } | null
  const currentLocation = ref(null)
  // 혼잡도 마커 노출 여부
  const showCongestion = ref(true)

  function setMarkers(newMarkers) {
    markers.value = newMarkers
  }

  function setPolyline(points) {
    polyline.value = points
  }

  function selectMarker(id) {
    selectedMarkerId.value = id
  }

  function setCenter(lat, lng) {
    mapCenter.value = { lat, lng }
  }

  function setCurrentLocation(lat, lng) {
    currentLocation.value = { lat, lng }
  }

  function toggleCongestion() {
    showCongestion.value = !showCongestion.value
  }

  function reset() {
    markers.value = []
    polyline.value = []
    selectedMarkerId.value = null
  }

  return {
    markers,
    polyline,
    selectedMarkerId,
    mapCenter,
    currentLocation,
    showCongestion,
    setMarkers,
    setPolyline,
    selectMarker,
    setCenter,
    setCurrentLocation,
    toggleCongestion,
    reset,
  }
})
