/**
 * RAG localScore(0~1) 또는 카테고리로 장소 톤 라벨 (가로 타임라인·지도 마커용)
 * @param {{ localScore?: number|null, category?: string }} slot
 * @returns {{ label: string, kind: 'local' | 'tourist' | 'blend' | null }}
 */
export function slotToneFromSlot(slot) {
  const ls = slot?.localScore
  if (ls != null && Number.isFinite(Number(ls))) {
    const v = Number(ls)
    // 0.5 부근은 한쪽으로 몰리지 않게 중간대(유명·로컬)로 표시
    if (v >= 0.58) return { label: '로컬', kind: 'local' }
    if (v <= 0.42) return { label: '유명', kind: 'tourist' }
    return { label: '유명·로컬', kind: 'blend' }
  }  const c = String(slot?.category || '').toLowerCase()
  if (!c) return { label: '', kind: null }
  if (c.includes('locker')) return { label: '', kind: null }
  if (c.includes('restaurant')) return { label: '로컬', kind: 'local' }
  if (
    c.includes('attraction')
    || c.includes('shopping')
    || c.includes('night')
    || c.includes('event')
  ) {
    return { label: '유명', kind: 'tourist' }
  }
  return { label: '', kind: null }
}
