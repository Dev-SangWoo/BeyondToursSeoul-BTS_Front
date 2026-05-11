import { sortSlotsForTimeline, getPhaseShortLabel } from '@/utils/slotTimeline'
import { slotToneFromSlot } from '@/utils/slotPlaceTone'

function firstImageCandidate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const nested = firstImageCandidate(value[i])
      if (nested) return nested
    }
    return ''
  }
  if (typeof value === 'object') {
    return String(
      value.url
      || value.imageUrl
      || value.image_url
      || value.thumbnail
      || value.firstImage
      || value.firstimage
      || '',
    ).trim()
  }
  return ''
}

function pickSlotImage(slot) {
  return String(
    slot?.thumbnail
    || slot?.imageUrl
    || slot?.image_url
    || slot?.firstImage
    || slot?.firstimage
    || slot?.image
    || slot?.photo
    || slot?.photoUrl
    || firstImageCandidate(slot?.images)
    || firstImageCandidate(slot?.photos)
    || firstImageCandidate(slot?.media)
    || '',
  ).trim()
}

/**
 * structured → Result 페이지 ItineraryTimeline 과 같은 형태
 * @returns {Array<{ day: number, date?: string, label?: string, items: Array<{ time: string, name: string, crowdTag?: string, crowdLevel?: string, desc?: string, reason?: string }> }>}
 */
export function structuredToItineraryDays(structured) {
  if (!structured || typeof structured !== 'object') return []

  const days = Array.isArray(structured.days) ? structured.days : []
  if (days.length) {
    const mapped = days.map((day, i) => {
      const slots = Array.isArray(day.slots) ? day.slots : []
      const ordered = sortSlotsForTimeline(slots)
      let items = ordered.map(({ slot }) => {
        const tone = slotToneFromSlot(slot)
        const sourceType = String(slot?.sourceType || slot?.source_type || '').trim().toLowerCase()
        const category = String(slot?.category || slot?.cat || '').trim().toLowerCase()
        const isLocker = sourceType.includes('locker') || category === 'locker'
        const lat = Number(slot?.lat)
        const lng = Number(slot?.lng)
        const imageUrl = pickSlotImage(slot)
        return {
          time: isLocker ? '보관함' : getPhaseShortLabel(slot),
          name: String(slot?.placeName || slot?.address || '장소').trim() || '장소',
          crowdTag: '',
          crowdLevel: 'low',
          address: String(slot?.address || '').trim(),
          desc: '',
          reason: '',
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          type: String(slot?.type || slot?.phase || '').trim(),
          sourceType: String(slot?.sourceType || slot?.source_type || '').trim(),
          sourceId: String(slot?.sourceId || slot?.source_id || '').trim(),
          toneLabel: tone.label,
          toneKind: tone.kind,
          isLocker,
          imageUrl,
        }
      })
      if (!items.length) {
        const dayLabel = String(day.label ?? '').trim()
        const note = String(day.dayNote ?? day.summary ?? day.description ?? '').trim()
        const line = dayLabel || note
        if (line) {
          items = [
            {
              time: '안내',
              name: line.length > 200 ? `${line.slice(0, 197)}…` : line,
              crowdTag: '',
              crowdLevel: 'low',
              desc: dayLabel && note && note !== dayLabel ? note : '',
              reason: '',
            },
          ]
        }
      }
      return {
        day: i + 1,
        date: day.date != null ? String(day.date) : '',
        label: day.label != null ? String(day.label) : '',
        items,
      }
    })
    if (mapped.some((d) => d.items.length > 0)) return mapped
  }

  const routes = structured.summary?.route
  const lines = Array.isArray(routes)
    ? routes.map((x) => String(x).trim()).filter(Boolean)
    : []
  if (lines.length) {
    return lines.map((line, i) => ({
      day: i + 1,
      date: '',
      label: `${i + 1}일차 요약`,
      items: [
        {
          time: '코스',
          name: line.length > 120 ? `${line.slice(0, 117)}…` : line,
          crowdTag: '',
          crowdLevel: 'low',
          desc: '',
          reason: '',
        },
      ],
    }))
  }

  /** days·route 없고 summary.title(또는 정규화로 채워진 한 줄 요약)만 있는 경우 */
  const titleStr =
    structured.summary != null && typeof structured.summary === 'object'
      ? String(structured.summary.title ?? '').trim()
      : ''
  if (titleStr) {
    const t = titleStr
    return [
      {
        day: 1,
        date: '',
        label: '요약',
        items: [
          {
            time: '안내',
            name: t.length > 200 ? `${t.slice(0, 197)}…` : t,
            crowdTag: '',
            crowdLevel: 'low',
            desc: '',
            reason: '',
          },
        ],
      },
    ]
  }

  return []
}
