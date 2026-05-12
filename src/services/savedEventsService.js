import { createAuthExpiredError } from "@/utils/authFlow"
import { getCurrentLocale } from '@/i18n'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

/** 관광지 저장 목록과 동일한 Accept-Language (ko/en/ja/zh) */
function acceptLanguageForSavedEventsApi() {
  const raw = String(getCurrentLocale() ?? 'ko').trim().toLowerCase()
  if (raw.startsWith('ko')) return 'ko'
  if (raw.startsWith('en')) return 'en'
  if (raw.startsWith('ja')) return 'ja'
  if (raw.startsWith('zh')) return 'zh'
  return 'ko'
}

function authHeaders(accessToken) {
  const h = {
    Accept: 'application/json',
    'Accept-Language': acceptLanguageForSavedEventsApi(),
  }
  if (accessToken) {
    h.Authorization = `Bearer ${accessToken}`
  }
  return h
}

/**
 * @param {string} accessToken
 * @returns {Promise<Array<{ contentId: number, title: string, address?: string, firstImage?: string, eventStartDate?: string, eventEndDate?: string, mapX?: number, mapY?: number, savedAt: string }>>}
 */
export async function fetchSavedEvents(accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/events`, {
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) throw new Error(`저장 행사 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} contentId
 * @param {string} accessToken
 * @returns {Promise<{ saved: boolean }>}
 */
export async function toggleSavedEvent(contentId, accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const id = encodeURIComponent(String(contentId).trim())
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/events/${id}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw createAuthExpiredError()
  if (!res.ok) {
    let msg = `행사 저장 처리 실패: ${res.status}`
    try {
      const t = await res.text()
      if (t) msg = t
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  const body = await res.json()
  return { saved: body?.saved === true }
}
