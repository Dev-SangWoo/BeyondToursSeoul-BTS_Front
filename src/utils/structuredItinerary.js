import { sortSlotsForTimeline } from '@/utils/slotTimeline'
import { slotToneFromSlot } from '@/utils/slotPlaceTone'

/** 서울 중심 기본 좌표 (지오코딩 실패 시 마커 분산용) */
export const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 }

/**
 * @param {object|null} structured
 * @returns {Array<{ dayIndex: number, slotIndex: number, date?: string, dayLabel?: string, placeName: string, address: string, reason?: string, type?: string, slotLabel?: string }>}
 * 일차 내 슬롯은 아침→오전→점심→오후→저녁→밤 순으로 정렬됩니다.
 */
export function flattenStructuredSlots(structured) {
  if (!structured || !Array.isArray(structured.days)) return []
  const out = []
  structured.days.forEach((day, di) => {
    const slots = Array.isArray(day.slots) ? day.slots : []
    const ordered = sortSlotsForTimeline(slots)
    ordered.forEach(({ slot, originalIndex: si }) => {
      out.push({
        dayIndex: di,
        slotIndex: si,
        date: day.date,
        dayLabel: day.label,
        placeName: slot?.placeName != null ? String(slot.placeName) : '',
        address: slot?.address != null ? String(slot.address) : '',
        reason: slot?.reason != null ? String(slot.reason) : '',
        type: slot?.type,
        sourceType: slot?.sourceType,
        sourceId: slot?.sourceId,
        slotLabel: slot?.label != null ? String(slot.label) : '',
        lat: Number.isFinite(Number(slot?.lat)) ? Number(slot.lat) : null,
        lng: Number.isFinite(Number(slot?.lng)) ? Number(slot.lng) : null,
        category: slot?.category != null ? String(slot.category).trim() : '',
        localScore: Number.isFinite(Number(slot?.localScore)) ? Number(slot.localScore) : null,
      })
    })
  })
  return out
}

function spiralOffset(i) {
  const angle = i * 0.72
  const r = 0.0016 * (1 + i * 0.18)
  return {
    lat: SEOUL_CENTER.lat + r * Math.cos(angle),
    lng: SEOUL_CENTER.lng + r * Math.sin(angle),
  }
}

/** @param {ReturnType<flattenStructuredSlots>} flat */
export function buildFallbackMarkers(flat) {
  return flat.map((item, i) => {
    const labelSource = item.placeName || item.address || `장소 ${i + 1}`
    const pos = spiralOffset(i)
    return {
      lat: pos.lat,
      lng: pos.lng,
      label: labelSource.length > 14 ? `${labelSource.slice(0, 14)}…` : labelSource,
      type: 'default',
      crowdLevel: 'low',
      dayIndex: item.dayIndex,
    }
  })
}

function geocodeQuery(query) {
  return new Promise((resolve) => {
    const S = window.naver?.maps?.Service
    const OK = window.naver?.maps?.Service?.Status?.OK
    if (!S?.geocode || OK === undefined) {
      resolve(null)
      return
    }
    const q = String(query || '').trim()
    if (!q) {
      resolve(null)
      return
    }
    S.geocode({ query: q }, (status, response) => {
      if (status !== OK) {
        resolve(null)
        return
      }
      const a = response?.v2?.addresses?.[0]
      if (!a) {
        resolve(null)
        return
      }
      const lat = parseFloat(a.y)
      const lng = parseFloat(a.x)
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        resolve(null)
        return
      }
      resolve({ lat, lng })
    })
  })
}

/**
 * 장소명 + 주소로 네이버 지오코딩 시도 후, 실패 시 스파이럴 폴백
 * @param {ReturnType<flattenStructuredSlots>} flat
 */
export async function buildMapMarkersFromStructured(flat) {
  if (!flat.length) return { markers: [], polyline: [] }

  const markers = []
  const dayOrderCounter = new Map()
  for (let i = 0; i < flat.length; i += 1) {
    const item = flat[i]
    const currentOrder = (dayOrderCounter.get(item.dayIndex) ?? 0) + 1
    dayOrderCounter.set(item.dayIndex, currentOrder)
    let lat = item.lat
    let lng = item.lng
    if (lat == null || lng == null) {
      const query = [item.placeName, item.address].filter(Boolean).join(' ').trim()
      if (query) {
        const g = await geocodeQuery(query)
        if (g) {
          lat = g.lat
          lng = g.lng
        }
      }
    }
    const fb = buildFallbackMarkers([item])[0]
    const labelSource = item.placeName || item.address || `장소 ${i + 1}`
    const label = labelSource.length > 14 ? `${labelSource.slice(0, 14)}…` : labelSource
    const tone = slotToneFromSlot(item)
    const sourceType = String(item?.sourceType || item?.type || '').toLowerCase()
    const category = String(item?.category || '').toLowerCase()
    const isLocker = sourceType.includes('locker') || category.includes('locker')
    markers.push({
      id: `day-${item.dayIndex}-slot-${item.slotIndex}-${i}`,
      lat: lat ?? fb.lat,
      lng: lng ?? fb.lng,
      label,
      placeName: item.placeName || labelSource,
      slotLabel: item.slotLabel || item.type || '',
      order: currentOrder,
      orderShort: String(currentOrder),
      orderLabel: `${item.slotLabel || item.type || '코스'} ${currentOrder}`,
      type: isLocker ? 'locker' : 'default',
      crowdLevel: 'low',
      dayIndex: item.dayIndex,
      placeTone: isLocker ? null : tone.kind,
      isLocker,
      sourceType: String(item?.sourceType || '').trim(),
      sourceId: String(item?.sourceId || '').trim(),
    })
  }

  const polyline = markers
    .filter((m) => m.lat != null && m.lng != null)
    .map((m) => ({ lat: m.lat, lng: m.lng }))

  return { markers, polyline }
}

export function meanCenter(markers) {
  const withCoords = markers.filter((m) => m.lat != null && m.lng != null)
  if (!withCoords.length) return { ...SEOUL_CENTER }
  let sLat = 0
  let sLng = 0
  withCoords.forEach((m) => {
    sLat += m.lat
    sLng += m.lng
  })
  return {
    lat: sLat / withCoords.length,
    lng: sLng / withCoords.length,
  }
}
