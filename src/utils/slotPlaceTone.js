import { i18n } from '@/i18n'

function tTone(key) {
  return i18n.global.t(`itinerary.tone.${key}`)
}

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
    if (v >= 0.58) return { label: tTone('local'), kind: 'local' }
    if (v <= 0.42) return { label: tTone('tourist'), kind: 'tourist' }
    return { label: tTone('blend'), kind: 'blend' }
  }
  const c = String(slot?.category || '').toLowerCase()
  if (!c) return { label: '', kind: null }
  if (c.includes('locker')) return { label: '', kind: null }
  if (c.includes('restaurant')) return { label: tTone('local'), kind: 'local' }
  if (
    c.includes('attraction')
    || c.includes('shopping')
    || c.includes('night')
    || c.includes('event')
  ) {
    return { label: tTone('tourist'), kind: 'tourist' }
  }
  return { label: '', kind: null }
}
