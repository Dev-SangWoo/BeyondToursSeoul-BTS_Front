/**
 * API structured 객체를 UI에서 안전하게 쓰도록 보정
 * - summary.route: 문자열 한 줄·배열 혼용 → 문자열 배열
 * - days: itinerary / schedule / dayPlans 등 별칭 → days
 * - slots: activities / items / stops / places 등 → slots, 장소명 키 보정
 * - 루트 title·route·summary.title 혼용
 */

function routeToArray(route) {
  if (route == null) return []
  if (Array.isArray(route)) {
    return route.map((x) => String(x).trim()).filter(Boolean)
  }
  const s = String(route).trim()
  if (!s) return []
  return expandSingleRouteString(s)
}

function toNumberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * 한 문자열에 "1일차 ... 2일차 ..." 가 같이 붙어 있는 경우 나눔
 */
function expandSingleRouteString(s) {
  const t = s.trim()
  if (!t) return []

  // "1일차: … , 2일차: …" 한 줄에 쉼표로 이어진 경우
  const commaDay = t.split(/,\s*(?=\d+일차\s*[:：])/i).map((x) => x.trim()).filter(Boolean)
  if (commaDay.length > 1) return commaDay

  const byDay = t.split(/(?=\d+일차\s*[:：])/i).map((x) => x.trim()).filter(Boolean)
  if (byDay.length > 1) return byDay

  const byDay2 = t.split(/(?=제\s*\d+일\s*일차)/i).map((x) => x.trim()).filter(Boolean)
  if (byDay2.length > 1) return byDay2

  if (t.includes('\n')) {
    return t.split(/\n+/).map((x) => x.trim()).filter(Boolean)
  }

  return [t]
}

/**
 * @param {unknown} raw
 * @returns {object|null}
 */
function normalizeSlotEntry(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const s = raw.trim()
    return s ? { placeName: s, address: '', reason: '', label: '', type: '' } : null
  }
  if (typeof raw !== 'object') return null
  const o = /** @type {Record<string, unknown>} */ (raw)
  const placeName =
    o.placeName ??
    o.name ??
    o.place ??
    o.title ??
    o.spot ??
    o.destination ??
    o.location
  let pn = typeof placeName === 'string' ? placeName.trim() : String(placeName ?? '').trim()
  const addr = String(o.address ?? o.addr ?? o.locationDetail ?? '').trim()
  if (!pn && addr) pn = addr
  if (!pn) return null
  return {
    placeName: pn,
    address: addr,
    reason: String(o.reason ?? o.note ?? o.notes ?? o.description ?? '').trim(),
    label: String(o.label ?? o.slotLabel ?? o.phase ?? '').trim(),
    type: o.type,
    sourceType: String(o.sourceType ?? o.source_type ?? o.st ?? '').trim(),
    sourceId: String(o.sourceId ?? o.source_id ?? o.sid ?? '').trim(),
    lat: toNumberOrNull(o.lat ?? o.latitude ?? o.y),
    lng: toNumberOrNull(o.lng ?? o.longitude ?? o.x),
    category: String(o.category ?? o.cat ?? '').trim(),
    localScore: toNumberOrNull(o.localScore ?? o.ls),
  }
}

/**
 * @param {unknown} raw
 * @param {number} _index
 */
function normalizeDayEntry(raw, _index) {
  if (raw == null || typeof raw !== 'object') {
    return { date: '', label: '', slots: [] }
  }
  const d = /** @type {Record<string, unknown>} */ (raw)
  const slotSources = [d.slots, d.activities, d.items, d.stops, d.places, d.plan, d.timeline].filter(
    (x) => Array.isArray(x) && x.length,
  )
  const slotsRaw = slotSources[0] ?? []
  const slots = Array.isArray(slotsRaw) ? slotsRaw.map(normalizeSlotEntry).filter(Boolean) : []

  const label = String(
    d.label ?? d.dayLabel ?? d.title ?? d.dayTitle ?? d.name ?? d.theme ?? '',
  ).trim()
  const date = d.date != null ? String(d.date) : ''
  const dayNote = String(d.summary ?? d.overview ?? d.description ?? d.notes ?? '').trim()

  return { ...d, date, label, slots, dayNote }
}

function pickDaysArray(out) {
  if (Array.isArray(out.days) && out.days.length) return out.days
  if (Array.isArray(out.itinerary) && out.itinerary.length) return out.itinerary
  if (Array.isArray(out.schedule) && out.schedule.length) return out.schedule
  if (Array.isArray(out.dayPlans) && out.dayPlans.length) return out.dayPlans
  if (Array.isArray(out.tripDays) && out.tripDays.length) return out.tripDays
  return Array.isArray(out.days) ? out.days : []
}

/**
 * @param {object|null|undefined} structured
 * @returns {object|null}
 */
export function normalizeStructured(structured) {
  if (structured == null || typeof structured !== 'object') return null

  const out = { ...structured }

  const rawDays = pickDaysArray(out)
  out.days = rawDays.map((day, i) => normalizeDayEntry(day, i))

  let summary =
    out.summary != null && typeof out.summary === 'object' ? { ...out.summary } : {}

  const titleCandidates = [
    summary.title,
    out.title,
    out.tripTitle,
    out.name,
    summary.name,
    summary.headline,
  ]
  let title = ''
  for (const c of titleCandidates) {
    if (c != null && String(c).trim()) {
      title = String(c).trim()
      break
    }
  }
  if (!title) {
    const long =
      summary.description ?? summary.overview ?? summary.summary ?? out.description ?? out.overview
    if (typeof long === 'string' && long.trim()) {
      title = long.trim().slice(0, 220)
    }
  }
  summary.title = title

  let lines = routeToArray(summary.route)
  if (!lines.length) {
    lines = routeToArray(out.route ?? out.routes ?? summary.routes)
  }
  if (lines.length === 1 && lines[0].length > 60) {
    const extra = expandSingleRouteString(lines[0])
    if (extra.length > 1) lines = extra
  }
  summary.route = lines

  out.summary = summary

  return out
}
