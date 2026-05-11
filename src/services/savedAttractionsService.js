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
 * @param {string} accessToken
 * @returns {Promise<Array<{ id: number, name: string, thumbnail?: string, address?: string, lat?: number, lng?: number, savedAt: string }>>}
 */
export async function fetchSavedAttractions(accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/attractions`, {
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) throw new Error(`저장 관광지 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} attractionId
 * @param {string} accessToken
 * @returns {Promise<{ saved: boolean }>}
 */
export async function toggleSavedAttraction(attractionId, accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const id = encodeURIComponent(String(attractionId).trim())
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/attractions/${id}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) {
    let msg = `저장 처리 실패: ${res.status}`
    try {
      const t = await res.text()
      if (t) msg = t
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const body = await res.json()
  const saved = typeof body.saved === 'boolean'
    ? body.saved
    : typeof body.isSaved === 'boolean'
      ? body.isSaved
      : false
  return { saved }
}
