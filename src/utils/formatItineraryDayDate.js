/**
 * AI 일정 day.date / Groq 출력(한국어 장문, ISO 등) → 표준 YYYY-MM-DD 또는 표시용 로케일 문자열.
 */

/** @param {number} y @param {number} m @param {number} d */
function isValidYmd(y, m, d) {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** @param {number} y @param {number} m @param {number} d */
function toIso(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * 다양한 문자열을 YYYY-MM-DD로 통일. 실패 시 ''.
 * @param {string} raw
 * @returns {string}
 */
export function tryParseToIsoDate(raw) {
  if (raw == null) return ''
  const s = String(raw).trim()
  if (!s) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return isValidYmd(y, m, d) ? s : ''
  }

  const cjk = s.match(/^(\d{4})\s*(?:년|年)\s*(\d{1,2})\s*(?:월|月)\s*(\d{1,2})\s*(?:일|日)?\s*$/)
  if (cjk) {
    const y = Number(cjk[1])
    const m = Number(cjk[2])
    const d = Number(cjk[3])
    return isValidYmd(y, m, d) ? toIso(y, m, d) : ''
  }

  const slash = s.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/)
  if (slash) {
    const y = Number(slash[1])
    const m = Number(slash[2])
    const d = Number(slash[3])
    return isValidYmd(y, m, d) ? toIso(y, m, d) : ''
  }

  const t = Date.parse(s)
  if (!Number.isNaN(t)) {
    const dt = new Date(t)
    const y = dt.getFullYear()
    const m = dt.getMonth() + 1
    const d = dt.getDate()
    if (isValidYmd(y, m, d)) return toIso(y, m, d)
  }

  return ''
}

/** @param {string} locale vue-i18n 코드 ko|en|ja|zh */
function localeToBcp47(locale) {
  switch (String(locale || '').toLowerCase()) {
    case 'ja':
      return 'ja-JP'
    case 'zh':
      return 'zh-CN'
    case 'en':
      return 'en-US'
    case 'ko':
    default:
      return 'ko-KR'
  }
}

/**
 * 일정 탭 등에 표시할 날짜 문자열 (로케일별 장월일 형식).
 * @param {string} raw ISO 또는 한/중/일 장문 등
 * @param {string} localeCode ko|en|ja|zh
 * @returns {string}
 */
export function formatItineraryDayDate(raw, localeCode) {
  const trimmed = raw != null ? String(raw).trim() : ''
  if (!trimmed) return ''

  const iso = tryParseToIsoDate(trimmed)
  if (!iso) return trimmed

  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const tag = localeToBcp47(localeCode)
  try {
    return dt.toLocaleDateString(tag, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}
