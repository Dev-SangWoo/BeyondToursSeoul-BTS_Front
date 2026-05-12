/** 코스 카드·상세·저장 등에서 보여 줄 해시태그 최대 개수 */
export const TOUR_COURSE_TAG_DISPLAY_MAX = 3

/**
 * 해시태그 문자열("#a #b" 또는 "a b" 혼합)을 파싱해 중복을 제거한 뒤 상한만큼 반환합니다.
 * 비교는 대소문자 무시, 앞뒤 공백·선행 # 은 제거된 라벨을 유지합니다.
 *
 * @param {string | null | undefined} hashtags
 * @param {{ limit?: number }} [opts] limit 생략 시 {@link TOUR_COURSE_TAG_DISPLAY_MAX}
 * @returns {string[]}
 */
export function parseHashtagList(hashtags, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? Math.max(0, Math.floor(opts.limit)) : TOUR_COURSE_TAG_DISPLAY_MAX
  if (hashtags == null || String(hashtags).trim() === '') return []

  const seen = new Set()
  const out = []
  for (const part of String(hashtags).split(/[#\s]+/)) {
    const label = part.replace(/^#+/, '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
    if (out.length >= limit) break
  }
  return out
}
