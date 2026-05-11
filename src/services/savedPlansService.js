const BASE_URL = import.meta.env.VITE_API_BASE_URL

function authHeaders(accessToken) {
  const h = { Accept: 'application/json' }
  if (accessToken) {
    h.Authorization = `Bearer ${accessToken}`
  }
  return h
}

function jsonHeaders(accessToken) {
  return {
    ...authHeaders(accessToken),
    'Content-Type': 'application/json',
  }
}

/** Pinia/Vue 반응형 Proxy 제거 — JSON 직렬화·서버 파싱 안정화 */
function toPlainStructured(structured) {
  try {
    return JSON.parse(JSON.stringify(structured))
  } catch {
    throw new Error('일정 데이터 형식을 직렬화할 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')
  }
}

function parseErrorMessage(text) {
  if (!text || !text.trim()) return null
  try {
    const j = JSON.parse(text)
    if (j && typeof j.message === 'string' && j.message.trim()) return j.message.trim()
  } catch {
    /* not JSON */
  }
  return text.trim()
}

/**
 * @param {string} accessToken
 * @returns {Promise<Array<{ id: number, title: string, savedAt: string }>>}
 */
export async function fetchSavedPlans(accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/plans`, {
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw new Error('로그인이 만료되었습니다.')
  if (!res.ok) throw new Error(`저장 일정 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} planId
 * @param {string} accessToken
 * @returns {Promise<{ id: number, title: string, savedAt: string, structured: object }>}
 */
export async function fetchSavedPlanDetail(planId, accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/plans/${planId}`, {
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw new Error('로그인이 만료되었습니다.')
  if (res.status === 404) throw new Error('저장된 일정을 찾을 수 없습니다.')
  if (!res.ok) throw new Error(`일정 상세 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string} accessToken
 * @param {{ title?: string, structured: object }} body
 */
export async function saveStructuredPlan(accessToken, body) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  if (!body?.structured || typeof body.structured !== 'object') {
    throw new Error('저장할 일정 데이터가 없습니다.')
  }
  const plain = toPlainStructured(body.structured)
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/plans`, {
    method: 'POST',
    headers: jsonHeaders(accessToken),
    body: JSON.stringify({
      title: body.title ?? undefined,
      structured: plain,
    }),
  })
  if (res.status === 401) throw new Error('로그인이 만료되었습니다.')
  if (!res.ok) {
    let msg = `일정 저장 실패: ${res.status}`
    try {
      const t = await res.text()
      const parsed = parseErrorMessage(t)
      if (parsed) msg = parsed
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json()
}

/**
 * @param {string|number} planId
 * @param {string} accessToken
 * @returns {Promise<void>}
 */
export async function deleteSavedPlan(planId, accessToken) {
  if (!accessToken) throw new Error('로그인이 필요합니다.')
  const res = await fetch(`${BASE_URL}/api/v1/me/saved/plans/${planId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  if (res.status === 401) throw new Error('로그인이 만료되었습니다.')
  if (res.status === 404) throw new Error('저장된 일정을 찾을 수 없습니다.')
  if (!res.ok) throw new Error(`일정 삭제 실패: ${res.status}`)
}
