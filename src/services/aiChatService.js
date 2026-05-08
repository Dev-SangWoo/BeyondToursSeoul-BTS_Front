import { normalizeStructured } from '@/utils/structuredNormalize'

const AI_CHAT_BASE_URL =
  import.meta.env.VITE_AI_CHAT_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL_LOCAL ||
  'http://localhost:8080'

/**
 * POST /api/v1/ai/chat 성공 본문 형태 (백엔드 Groq 파싱 결과).
 * @typedef {object} AiChatResponse
 * @property {string} answer - 말풍선용 Markdown (fallback 시 원문만)
 * @property {object|null} [structured] - 카드/일정/예산 UI (파싱 실패 시 null)
 * @property {string} [model] - 사용 모델명
 */

/**
 * 원격 응답을 안전하게 정규화 (structured null·answer 문자열 보장).
 * @param {unknown} raw
 * @returns {{ answer: string, structured: object | null, model?: string }}
 */
export function normalizeAiChatResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    return { answer: '', structured: null, model: undefined }
  }
  const o = /** @type {Record<string, unknown>} */ (raw)
  const answer = typeof o.answer === 'string' ? o.answer : ''
  let rawStructured = null

  // 1순위: o.structured 키가 있고 days 배열을 포함하는 경우
  if (o.structured !== undefined && o.structured !== null) {
    if (typeof o.structured === 'string') {
      try {
        const parsed = JSON.parse(o.structured)
        if (parsed && typeof parsed === 'object') rawStructured = parsed
      } catch {
        rawStructured = null
      }
    } else if (typeof o.structured === 'object') {
      rawStructured = o.structured
    }
  }

  // 2순위: structured가 없거나 빈 객체이고, 루트에 days/budget이 있는 경우 (JSON-only 모드 fallback)
  const hasDays = Array.isArray(rawStructured?.days) && rawStructured.days.length > 0
  if (!hasDays && (Array.isArray(o.days) || o.budget)) {
    rawStructured = o
  }

  const structured = normalizeStructured(rawStructured)
  const model = typeof o.model === 'string' ? o.model : undefined
  return { answer, structured, model }
}

/**
 * UI 스레드({ role, text }) → API history({ role, content })
 * @param {Array<{ role: string, text?: string, content?: string }>} items
 * @returns {Array<{ role: 'user' | 'assistant', content: string }>}
 */
export function toChatHistoryPayload(items) {
  if (!Array.isArray(items)) return []
  return items
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: String(m.text ?? m.content ?? '').trim(),
    }))
    .filter((m) => m.content.length > 0)
}

/**
 * @param {string} message - 이번 턴 사용자 메시지
 * @param {string} [language]
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} [history] - message 이전 대화
 * @param {number} [localRatio] - 로컬 선호도 0(관광지)~100(로컬), 기본값 50
 */
export async function requestAiChat(message, language = 'ko', history = [], localRatio = 50) {
  const res = await fetch(`${AI_CHAT_BASE_URL}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      language,
      history: Array.isArray(history) ? history : [],
      localRatio: Math.max(0, Math.min(100, Number(localRatio) || 50)),
    }),
  })

  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { answer: text }
  }

  if (!res.ok) {
    throw new Error(data?.message || 'AI 챗 응답을 가져오지 못했습니다.')
  }

  const normalized = normalizeAiChatResponse(data)

  if (import.meta.env.DEV) {
    const s = normalized.structured
    const days = Array.isArray(s?.days) ? s.days : []
    const daySlots = days.map((d) => (Array.isArray(d?.slots) ? d.slots.length : 0))
    const route = Array.isArray(s?.summary?.route) ? s.summary.route.length : 0
    const title = typeof s?.summary?.title === 'string' ? s.summary.title.trim() : ''
    console.info('[AI_CHAT_DEBUG] structured shape', {
      rawStructuredType: typeof data?.structured,
      hasStructured: !!s,
      dayCount: days.length,
      daySlots,
      routeCount: route,
      hasTitle: !!title,
      structured: s,
    })
  }

  return normalized
}

