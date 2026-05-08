const BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * 행사·축제 전용 API (상세 스키마는 백엔드와 맞춤)
 * @returns {Promise<Array>}
 */
export async function fetchEvents() {
  const res = await fetch(`${BASE_URL}/api/v1/tour/events`)
  if (!res.ok) throw new Error(`행사 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchEventById(id) {
  const res = await fetch(`${BASE_URL}/api/v1/tour/events/${id}`)
  if (!res.ok) throw new Error(`행사 상세 조회 실패: ${res.status}`)
  return res.json()
}
