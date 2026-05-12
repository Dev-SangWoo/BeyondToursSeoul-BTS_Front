import { createAuthExpiredError } from "@/utils/authFlow"

const BASE_URL = import.meta.env.VITE_API_BASE_URL

function authHeaders(accessToken) {
  const h = { Accept: 'application/json' }
  if (accessToken) {
    h.Authorization = `Bearer ${accessToken}`
  }
  return h
}

/**
 * @param {string} [lang]
 * @param {string|null} [accessToken]
 */
export async function fetchTourCourses(lang = 'KOR', accessToken = null) {
  const q = new URLSearchParams({ lang })
  const res = await fetch(`${BASE_URL}/api/v1/courses?${q}`, {
    headers: authHeaders(accessToken),
  })
  if (!res.ok) throw new Error(`추천 코스 목록 조회 실패: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeCourseSummary) : []
}

/**
 * @param {string|number} courseId
 * @param {string} [lang]
 * @param {string|null} [accessToken]
 */
export async function fetchTourCourseDetail(courseId, lang = 'KOR', accessToken = null) {
  const id = encodeURIComponent(String(courseId))
  const q = new URLSearchParams({ lang })
  const res = await fetch(`${BASE_URL}/api/v1/courses/${id}?${q}`, {
    headers: authHeaders(accessToken),
  })
  if (res.status === 404) throw new Error('코스를 찾을 수 없습니다.')
  if (!res.ok) throw new Error(`추천 코스 상세 조회 실패: ${res.status}`)
  return normalizeCourseDetail(await res.json())
}

/**
 * @param {string} [lang]
 * @param {string} accessToken
 */
export async function fetchSavedTourCourses(lang = 'KOR', accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const q = new URLSearchParams({ lang })
  const res = await fetch(`${BASE_URL}/api/v1/courses/saved?${q}`, {
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) throw new Error(`저장 코스 목록 조회 실패: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeCourseSummary) : []
}

/**
 * @param {string|number} courseId
 * @param {string} accessToken
 * @returns {Promise<boolean>}
 */
export async function toggleTourCourseSave(courseId, accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const id = encodeURIComponent(String(courseId))
  const res = await fetch(`${BASE_URL}/api/v1/courses/${id}/save`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) {
    let msg = `코스 저장 처리 실패: ${res.status}`
    try {
      const t = await res.text()
      if (t) msg = t
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const body = await res.json()
  if (typeof body.saved === 'boolean') return body.saved
  if (typeof body.isSaved === 'boolean') return body.isSaved
  return false
}

function normalizeCourseItem(raw) {
  const typ = String(raw.itemType ?? raw.item_type ?? '').toUpperCase()
  return {
    itemType: typ === 'EVENT' ? 'EVENT' : 'ATTRACTION',
    id: raw.id,
    name: raw.name ?? '',
    address: raw.address ?? '',
    thumbnail: raw.thumbnail ?? '',
    sequenceOrder: Number(raw.sequenceOrder ?? raw.sequence_order ?? 0),
    aiComment: raw.aiComment ?? raw.ai_comment ?? '',
    latitude: raw.latitude != null ? Number(raw.latitude) : null,
    longitude: raw.longitude != null ? Number(raw.longitude) : null,
  }
}

function normalizeCourseDetail(body) {
  const items = Array.isArray(body.items)
    ? body.items.map(normalizeCourseItem).sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    : []
  const pctRaw = body.avgLocalScorePercent ?? body.avg_local_score_percent
  const bandRaw = body.localBand ?? body.local_band
  const avgRaw = body.avgLocalScore ?? body.avg_local_score
  const pct =
    pctRaw != null && Number.isFinite(Number(pctRaw)) ? Math.round(Number(pctRaw)) : null
  const band =
    bandRaw != null && Number.isFinite(Number(bandRaw)) ? Math.round(Number(bandRaw)) : null
  const avg =
    avgRaw != null && Number.isFinite(Number(avgRaw)) ? Number(avgRaw) : null
  return {
    id: body.id,
    title: body.title ?? '',
    hashtags: body.hashtags ?? '',
    featuredImage: body.featuredImage ?? body.featured_image ?? '',
    isSaved: body.isSaved === true || body.saved === true,
    items,
    avgLocalScore: avg,
    avgLocalScorePercent: pct,
    localBand: band,
  }
}

function normalizeCourseSummary(c) {
  const isSaved = c.isSaved === true || c.saved === true
  const pctRaw = c.avgLocalScorePercent ?? c.avg_local_score_percent
  const bandRaw = c.localBand ?? c.local_band
  const avgRaw = c.avgLocalScore ?? c.avg_local_score
  const pct =
    pctRaw != null && Number.isFinite(Number(pctRaw)) ? Math.round(Number(pctRaw)) : null
  const band =
    bandRaw != null && Number.isFinite(Number(bandRaw)) ? Math.round(Number(bandRaw)) : null
  const avg =
    avgRaw != null && Number.isFinite(Number(avgRaw)) ? Number(avgRaw) : null
  return {
    id: c.id,
    title: c.title ?? '',
    hashtags: c.hashtags ?? '',
    featuredImage: c.featuredImage ?? c.featured_image ?? '',
    isSaved,
    avgLocalScore: avg,
    avgLocalScorePercent: pct,
    localBand: band,
  }
}
