const BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * @returns {Promise<Array>}
 */
export async function fetchAttractions() {
  const res = await fetch(`${BASE_URL}/api/v1/attractions`)
  if (!res.ok) throw new Error(`관광지 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchAttractionById(id) {
  const res = await fetch(`${BASE_URL}/api/v1/attractions/${id}`)
  if (!res.ok) throw new Error(`관광지 상세 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @returns {Promise<Array>}
 */
export async function fetchLockers() {
  const res = await fetch(`${BASE_URL}/api/v1/lockers`)
  if (!res.ok) throw new Error(`물품보관소 목록 조회 실패: ${res.status}`)
  return res.json()
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchLockerById(id) {
  const res = await fetch(`${BASE_URL}/api/v1/lockers/${id}`)
  if (!res.ok) throw new Error(`물품보관소 상세 조회 실패: ${res.status}`)
  return res.json()
}
