/**
 * 아침 → 오전 코스 → 점심 → 오후 코스 → 저녁 → 밤 코스 순 정렬·표시용
 * type / label은 백엔드·모델이 허용한 토큰과 정확히 맞을 때만 단계로 인식합니다.
 * (includes 기반 매칭은 "오후"가 문장에 포함되는 등 오탐이 나와 제거했습니다.)
 */

import { i18n } from '@/i18n'

const PHASES = [
  {
    id: 'breakfast',
    shortLabel: '아침',
  },
  {
    id: 'morning_course',
    shortLabel: '오전 코스',
  },
  {
    id: 'lunch',
    shortLabel: '점심',
  },
  {
    id: 'afternoon_course',
    shortLabel: '오후 코스',
  },
  {
    id: 'dinner',
    shortLabel: '저녁',
  },
  {
    id: 'night_course',
    shortLabel: '밤 코스',
  },
]

/** 공백 제거·소문자 (라틴) 정규화 — 한글은 그대로 두되 공백만 축약 */
function collapsed(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

/**
 * 정규화된 type/label 문자열 → 단계 인덱스
 * @param {string} v collapsed(type) 또는 collapsed(label)
 */
function phaseIndexFromCollapsed(v) {
  if (!v) return -1
  const map = new Map([
    ['아침', 0],
    ['오전코스', 1],
    ['점심', 2],
    ['오후코스', 3],
    ['저녁', 4],
    ['밤코스', 5],
    ['breakfast', 0],
    ['morningcourse', 1],
    ['morningmeal', 0],
    ['morning_meal', 0],
    ['amcourse', 1],
    ['forenoon', 1],
    ['lunch', 2],
    ['afternooncourse', 3],
    ['pmcourse', 3],
    ['afternoon', 3],
    ['dinner', 4],
    ['nightcourse', 5],
    ['eveningcourse', 5],
    ['조식', 0],
  ])
  if (map.has(v)) return map.get(v)
  return -1
}

/** @returns {number} 0..PHASES.length-1 또는 PHASES.length(미분류) */
export function getSlotPhaseOrder(slot) {
  const ct = collapsed(slot?.type)
  const cl = collapsed(slot?.label)
  const fromType = phaseIndexFromCollapsed(ct)
  if (fromType >= 0) return fromType
  const fromLabel = phaseIndexFromCollapsed(cl)
  if (fromLabel >= 0) return fromLabel
  return PHASES.length
}

/**
 * 표시용 짧은 구간 이름 (앱 표시 언어 기준)
 * @param {object} slot
 * @param {number|null} [slotIndexInDay] 같은 날짜 슬롯 배열에서의 순서(0..) — 파싱 실패 시 기본 단계 추정에 사용
 */
export function getPhaseShortLabel(slot, slotIndexInDay = null) {
  let i = getSlotPhaseOrder(slot)
  if (i >= PHASES.length && slotIndexInDay != null) {
    const n = Number(slotIndexInDay)
    if (Number.isFinite(n) && n >= 0 && n < PHASES.length) {
      i = n
    }
  }
  if (i < PHASES.length) {
    const id = PHASES[i].id
    return i18n.global.t(`itinerary.phases.${id}`)
  }
  return i18n.global.t('itinerary.phases.fallback')
}

/**
 * 한 일의 slots를 타임라인 순으로 정렬 (같은 단계면 원래 배열 순 유지)
 * @returns {Array<{ slot: object, originalIndex: number }>}
 */
export function sortSlotsForTimeline(slots) {
  if (!Array.isArray(slots)) return []
  const withIdx = slots.map((slot, originalIndex) => ({ slot, originalIndex }))
  return withIdx.sort((a, b) => {
    const pa = getSlotPhaseOrder(a.slot)
    const pb = getSlotPhaseOrder(b.slot)
    if (pa !== pb) return pa - pb
    return a.originalIndex - b.originalIndex
  })
}
