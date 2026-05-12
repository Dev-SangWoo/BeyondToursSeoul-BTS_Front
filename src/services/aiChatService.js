import { normalizeStructured } from '@/utils/structuredNormalize'

const AI_CHAT_BASE_URL =
  import.meta.env.VITE_AI_CHAT_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL_LOCAL ||
  'http://localhost:8080'
const AI_CHAT_TIMEOUT_MS = 30_000

/** 백엔드 application.yml 기본(prompt-max-history-*)과 맞춤 → HTTP 본문·Groq TPM 절약 */
const MAX_AI_CHAT_HISTORY_MESSAGES = 6
const MAX_AI_CHAT_HISTORY_CONTENT_CHARS = 380
/** 현재 턴 메시지 상한(백엔드 prompt-max-user-chars 기본 2600 근처로 정렬) */
const MAX_AI_CHAT_MESSAGE_CHARS = 2800

function clipUtf16Chars(s, maxLen) {
  const t = String(s ?? '')
  if (t.length <= maxLen) return t
  if (maxLen <= 1) return '…'
  return `${t.slice(0, maxLen - 1)}…`
}

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
 * assistant 메시지에 붙일 짧은 일정 스냅샷 (수정 요청 시 모델이 이전 코스를 알 수 있게)
 * @param {object|null|undefined} structured
 * @param {number} maxLen
 */
function compactItineraryForHistory(structured, maxLen = 420) {
  if (!structured || typeof structured !== 'object') return ''
  const norm = normalizeStructured(structured)
  const days = Array.isArray(norm?.days) ? norm.days : []
  if (!days.length) return ''
  const parts = []
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i]
    const slots = Array.isArray(day?.slots) ? day.slots : []
    if (!slots.length) continue
    const dayLabel = String(day.label || day.date || `${i + 1}일차`).trim() || `${i + 1}일차`
    const slotStr = slots
      .map((s) => {
        const typ = String(s?.type || s?.label || '').trim() || '?'
        const n = String(s?.placeName || '').trim() || '?'
        return `${typ}:${n}`
      })
      .join('; ')
    parts.push(`${dayLabel}→${slotStr}`)
  }
  let out = parts.join(' | ')
  if (out.length > maxLen) out = `${out.slice(0, maxLen - 1)}…`
  return `[이전일정] ${out}`
}

/**
 * UI 스레드({ role, text }) → API history({ role, content })
 * @param {Array<{ role: string, text?: string, content?: string, structured?: object }>} items
 * @returns {Array<{ role: 'user' | 'assistant', content: string }>}
 */
export function toChatHistoryPayload(items) {
  if (!Array.isArray(items)) return []
  return items
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => {
      const text = String(m.text ?? m.content ?? '').trim()
      if (m.role === 'assistant' && m.structured && typeof m.structured === 'object') {
        const snap = compactItineraryForHistory(m.structured, 400)
        if (snap) {
          const rest = text.length > 220 ? `${text.slice(0, 219)}…` : text
          return { role: m.role, content: `${snap}\n${rest}`.trim() }
        }
      }
      return { role: m.role, content: text }
    })
    .filter((m) => m.content.length > 0)
}

/** API history — 문자열 role/content만 보낸다. */
function sanitizeAiChatHistory(history) {
  if (!Array.isArray(history)) return []
  const out = []
  for (const h of history) {
    if (!h || typeof h !== 'object') continue
    const role = String(h.role ?? '').trim().toLowerCase()
    const content = clipUtf16Chars(String(h.content ?? '').trim(), MAX_AI_CHAT_HISTORY_CONTENT_CHARS)
    if (!content || (role !== 'user' && role !== 'assistant')) continue
    out.push({ role, content })
  }
  if (out.length <= MAX_AI_CHAT_HISTORY_MESSAGES) return out
  return out.slice(-MAX_AI_CHAT_HISTORY_MESSAGES)
}

/** Long 배열용: 소수 JSON은 Jackson 역직렬화 400 → 양의 정수만 */
function sanitizePositiveLongIds(ids) {
  if (!Array.isArray(ids)) return []
  return ids
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && Number.isInteger(n) && n > 0)
}

/**
 * @param {string} message - 이번 턴 사용자 메시지
 * @param {string} [language]
 * @param {Array<{ role: 'user' | 'assistant', content: string }>} [history] - message 이전 대화
 * @param {number} [localRatio] - 로컬 선호도 0(관광지)~100(로컬), 기본값 50
 * @param {object} [options]
 * @param {string|null} [options.accessToken] - 있으면 Bearer로 전달(저장 항목 검증·반영)
 * @param {number[]} [options.savedAttractionIds]
 * @param {number[]} [options.savedCourseIds]
 */
export async function requestAiChat(message, language = 'ko', history = [], localRatio = 50, options = {}) {
  const {
    accessToken = null,
    savedAttractionIds = [],
    savedCourseIds = [],
  } = options || {}

  const msg = clipUtf16Chars(String(message ?? '').trim(), MAX_AI_CHAT_MESSAGE_CHARS)
  if (!msg) {
    throw new Error('AI 챗 메시지가 비어 있습니다.')
  }

  const body = {
    message: msg,
    language: String(language ?? 'ko').trim().slice(0, 12) || 'ko',
    history: sanitizeAiChatHistory(history),
    localRatio: Math.max(0, Math.min(100, Math.round(Number(localRatio)) || 50)),
  }
  const idsA = sanitizePositiveLongIds(savedAttractionIds)
  const idsC = sanitizePositiveLongIds(savedCourseIds)
  if (idsA.length) body.savedAttractionIds = idsA
  if (idsC.length) body.savedCourseIds = idsC

  const headers = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), AI_CHAT_TIMEOUT_MS)

  let bodyJson
  try {
    bodyJson = JSON.stringify(body)
  } catch {
    throw new Error('AI 요청 본문을 직렬화할 수 없습니다.')
  }

  let res
  try {
    res = await fetch(`${AI_CHAT_BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: bodyJson,
    })
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('AI 응답 대기 시간이 초과되었습니다. 서버 상태를 확인해 주세요.')
    }
    throw e
  } finally {
    clearTimeout(timeoutId)
  }

  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { answer: text }
  }

  if (!res.ok) {
    const fromJson =
      typeof data?.message === 'string' && data.message.trim()
        ? data.message.trim()
        : ''
    const fallback =
      text && text.length < 1200 && !text.trimStart().startsWith('<')
        ? text.trim()
        : ''
    throw new Error(fromJson || fallback || `AI 챗 요청 실패 (${res.status})`)
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

