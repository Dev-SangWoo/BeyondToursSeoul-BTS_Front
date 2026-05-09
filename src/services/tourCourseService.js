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
 * @param {string} [lang]
 * @param {string} accessToken
 */
export async function fetchSavedTourCourses(lang = 'KOR', accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const q = new URLSearchParams({ lang })
  const res = await fetch(`${BASE_URL}/api/v1/courses/saved?${q}`, {
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw new Error('로그인이 만료되었습니다.')
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
  if (res.status === 401) throw new Error('로그인이 만료되었습니다.')
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

function normalizeCourseSummary(c) {
  const isSaved = c.isSaved === true || c.saved === true
  return {
    id: c.id,
    title: c.title ?? '',
    hashtags: c.hashtags ?? '',
    featuredImage: c.featuredImage ?? c.featured_image ?? '',
    isSaved,
  }
}
