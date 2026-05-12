/**
 * 코스 제목에서 첫 번째 ':' 기준으로 가제·설명을 나눕니다.
 * 뒤쪽이 비어 있으면(예: "제목:"만 있는 경우) 줄바꿈 없이 원문을 둡니다.
 *
 * @param {string | null | undefined} title
 * @returns {{ head: string, tail: string }}
 */
export function splitCourseTitleAtColon(title) {
  if (title == null) return { head: '', tail: '' }
  const s = String(title)
  const idx = s.indexOf(':')
  if (idx === -1) return { head: s, tail: '' }
  const tail = s.slice(idx + 1).trim()
  if (!tail) return { head: s, tail: '' }
  const head = s.slice(0, idx + 1).trimEnd()
  return { head, tail }
}

/**
 * 화면에 쌓을 줄 단위 배열 (콜론이 있고 뒤에 내용이 있으면 2줄).
 *
 * @param {string | null | undefined} title
 * @returns {string[]}
 */
export function getCourseTitleLines(title) {
  const { head, tail } = splitCourseTitleAtColon(title)
  if (!tail) return [head]
  return [head, tail]
}
