import { getCurrentLocale, getApiLangCode } from '@/i18n'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

function toTourLang(lang) {
  const value = String(lang || '').trim().toLowerCase()
  if (value === 'ko') return 'KOR'
  if (value === 'en') return 'ENG'
  if (value === 'ja') return 'JPN'
  if (value === 'zh') return 'CHS'
  if (value === 'kor' || value === 'eng' || value === 'jpn' || value === 'chs') return value.toUpperCase()
  return getApiLangCode()
}

/**
 * @param {{ lang?: string, minScore?: number, maxScore?: number }} [opts]
 * @returns {Promise<Array>}
 */
export async function fetchAttractions(opts = {}) {
  const lang = toTourLang(opts.lang ?? getCurrentLocale())
  const params = new URLSearchParams({ lang })
  if (typeof opts.minScore === 'number') params.set('minScore', String(opts.minScore))
  if (typeof opts.maxScore === 'number') params.set('maxScore', String(opts.maxScore))
  const res = await fetch(`${BASE_URL}/api/v1/attractions?${params.toString()}`)
  if (!res.ok) throw new Error(`관광지 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchAttractionById(id) {
  const lang = toTourLang(getCurrentLocale())
  const res = await fetch(`${BASE_URL}/api/v1/attractions/${id}?lang=${encodeURIComponent(lang)}`)
  if (!res.ok) throw new Error(`관광지 상세 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @returns {Promise<Array>}
 */
export async function fetchLockers() {
  const lang = getApiLangCode()
  const res = await fetch(`${BASE_URL}/api/v1/lockers?lang=${lang}`)
  if (!res.ok) throw new Error(`물품보관소 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchLockerById(id) {
  const lang = getApiLangCode()
  const res = await fetch(`${BASE_URL}/api/v1/lockers/${id}?lang=${lang}`)
  if (!res.ok) throw new Error(`물품보관소 상세 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {{ limit?: number, lang?: string }} [opts]
 * @returns {Promise<Array<{ id: number, lockerId: string, lockerName: string, stationName?: string, detailLocation?: string, latitude: number, longitude: number, distanceMeters: number }>>}
 */
export async function fetchNearestLockers(lat, lng, opts = {}) {
  const limit = opts.limit ?? 1
  const lang = opts.lang ?? 'KOR'
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    limit: String(limit),
    lang,
  })
  const res = await fetch(`${BASE_URL}/api/v1/lockers/nearest?${params.toString()}`)
  if (!res.ok) throw new Error(`가까운 물품보관소 조회 실패: ${res.status}`)
  return res.json()
}
