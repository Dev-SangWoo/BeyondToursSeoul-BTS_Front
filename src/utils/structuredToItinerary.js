import { sortSlotsForTimeline, getPhaseShortLabel } from '@/utils/slotTimeline'

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
      let items = ordered.map(({ slot }) => ({
        time: getPhaseShortLabel(slot),
        name: String(slot?.placeName || slot?.address || '장소').trim() || '장소',
        crowdTag: '',
        crowdLevel: 'low',
        address: String(slot?.address || '').trim(),
        desc: String(slot?.reason || slot?.label || slot?.description || '').trim(),
        reason: String(slot?.tip || slot?.memo || '').trim(),
        type: String(slot?.type || slot?.phase || '').trim(),
      }))
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
