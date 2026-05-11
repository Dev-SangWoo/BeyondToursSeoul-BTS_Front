<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ItineraryItem from './ItineraryItem.vue'
import { fetchNearestLockers } from '@/services/attractionService'

const props = defineProps({
  sourceDays: { type: Array, default: undefined },
  modelValue: { type: Number, default: undefined },
  horizontal: { type: Boolean, default: false },
  /** 물품보관함 nearest API: KOR | ENG | JPN | CHS | CHT */
  lockerLang: { type: String, default: 'KOR' },
})

const emit = defineEmits(['update:modelValue', 'focus-item', 'before-navigate-detail'])
const router = useRouter()
const route = useRoute()

const internalActive = ref(1)
const selectedItem = ref(null)

const mockDays = [
  {
    day: 1, date: '', label: '',
    items: [
      { time: '09:00', name: '성수동 카페거리', crowdTag: '혼잡도 보통', crowdLevel: 'medium', desc: '강남 가까운 카페에서 여유로운 아침입니다!', reason: '행사 진행 중' },
      { time: '11:00', name: '언더스탠드에비뉴', crowdTag: '혼잡도 낮음', crowdLevel: 'low', desc: '복합문화공간에서 전시와 쇼핑 즐기기', reason: '혼잡도 낮음' },
      { time: '13:00', name: '뚝섬 한강공원', crowdTag: '혼잡도 낮음', crowdLevel: 'low', desc: '한강에서 피크닉으로 점심', reason: '혼잡도 낮음' },
      { time: '15:30', name: '서울숲', crowdTag: '혼잡도 낮음', crowdLevel: 'low', desc: '산책하며 재충전', reason: '' },
      { time: '18:00', name: '성수 맛집 탐방', crowdTag: '혼잡도 높음', crowdLevel: 'high', desc: '로컬 맛집에서 저녁 식사', reason: '인기 높음 — 예약 권장' },
    ],
  },
  { day: 2, date: '', label: '', items: [] },
  { day: 3, date: '', label: '', items: [] },
]

const displayDays = computed(() => props.sourceDays !== undefined ? props.sourceDays : mockDays)

const activeDay = computed({
  get() { return props.modelValue != null ? props.modelValue : internalActive.value },
  set(v) {
    const n = Number(v)
    internalActive.value = n
    emit('update:modelValue', n)
  },
})

const lockerHintStart = ref(null)
const lockerHintLastStart = ref(null)
const lockerHintEnd = ref(null)

function formatStraightDistance(m) {
  if (m == null || Number.isNaN(Number(m))) return ''
  const n = Number(m)
  if (n < 1000) return `${Math.round(n)}m`
  return `${(n / 1000).toFixed(1)}km`
}

function pickBreakfastAnchor(items) {
  if (!items?.length) return null
  return items.find((i) => String(i.type || '').includes('아침')) ?? items[0]
}

function pickLastDayAnchor(items) {
  if (!items?.length) return null
  let idx = items.length - 1
  while (idx >= 0 && items[idx].isLocker) idx -= 1
  return idx >= 0 ? items[idx] : items[items.length - 1]
}

async function reloadNearestLockers() {
  lockerHintStart.value = null
  lockerHintLastStart.value = null
  lockerHintEnd.value = null
  const days = displayDays.value
  if (!days.length) return

  const d1 = days[0]
  const dLast = days[days.length - 1]
  const anchorMorning = pickBreakfastAnchor(d1?.items)
  const anchorLastMorning = pickBreakfastAnchor(dLast?.items)
  const anchorLast = pickLastDayAnchor(dLast?.items)
  const sameSlot =
    days.length === 1
    && anchorMorning
    && anchorLast
    && anchorMorning === anchorLast

  try {
    if (anchorMorning?.lat != null && anchorMorning?.lng != null) {
      const list = await fetchNearestLockers(anchorMorning.lat, anchorMorning.lng, {
        limit: 1,
        lang: props.lockerLang,
      })
      const locker = list?.[0]
      if (locker) {
        lockerHintStart.value = {
          label: sameSlot ? '아침·마지막 코스 근처 물품보관함' : '1일차 아침 코스 근처 물품보관함',
          locker,
        }
      }
    }
    if (
      days.length > 1
      && anchorLastMorning?.lat != null
      && anchorLastMorning?.lng != null
      && anchorLastMorning !== anchorMorning
    ) {
      const list = await fetchNearestLockers(anchorLastMorning.lat, anchorLastMorning.lng, {
        limit: 1,
        lang: props.lockerLang,
      })
      const locker = list?.[0]
      if (locker) {
        lockerHintLastStart.value = {
          label: '마지막 날 첫 코스 근처 물품보관함',
          locker,
        }
      }
    }
    if (!sameSlot && anchorLast?.lat != null && anchorLast?.lng != null) {
      const list = await fetchNearestLockers(anchorLast.lat, anchorLast.lng, {
        limit: 1,
        lang: props.lockerLang,
      })
      const locker = list?.[0]
      if (locker) {
        lockerHintEnd.value = {
          label: '마지막 날 마지막 코스 근처 물품보관함',
          locker,
        }
      }
    }
  } catch (e) {
    console.warn('[ItineraryTimeline] nearest lockers:', e)
  }
}

watch(displayDays, (list) => {
  const maxD = list.length ? Math.max(...list.map((x) => x.day)) : 1
  if (activeDay.value > maxD) activeDay.value = maxD
  if (activeDay.value < 1) activeDay.value = 1
  selectedItem.value = null
  void reloadNearestLockers()
}, { deep: true, immediate: true })

watch(activeDay, () => { selectedItem.value = null })

function currentDayData() {
  return displayDays.value.find((d) => d.day === activeDay.value)
}

function breakfastItemIndex(items) {
  if (!items?.length) return -1
  const idx = items.findIndex((it) => String(it.type || '').includes('아침'))
  return idx >= 0 ? idx : 0
}

function lastActivityItemIndex(items) {
  if (!items?.length) return -1
  let idx = items.length - 1
  while (idx >= 0 && items[idx].isLocker) idx -= 1
  return idx >= 0 ? idx : items.length - 1
}

/** 현재 선택된 DAY의 타임라인: 코스 슬롯 + (조건 시) 보관함 추천 끼워넣기 */
const currentDayTimelineSegments = computed(() => {
  const dayData = currentDayData()
  const items = dayData?.items
  if (!items?.length) return []

  const days = displayDays.value
  const firstDayNum = days[0]?.day
  const lastDayNum = days[days.length - 1]?.day
  const isActiveFirst = firstDayNum != null && activeDay.value === firstDayNum
  const isActiveLast = lastDayNum != null && activeDay.value === lastDayNum
  const bIdx = breakfastItemIndex(items)
  const lIdx = lastActivityItemIndex(items)

  const out = []
  let slotOrdinal = 0
  for (let i = 0; i < items.length; i += 1) {
    slotOrdinal += 1
    out.push({ kind: 'slot', item: items[i], slotIndex: i, slotOrdinal })
    if (isActiveFirst && lockerHintStart.value && i === bIdx) {
      out.push({ kind: 'lockerSuggest', hint: lockerHintStart.value, hintKey: 'start' })
    }
    if (isActiveLast && lockerHintLastStart.value && i === bIdx) {
      const skipDupStart =
        lockerHintStart.value
        && lockerHintLastStart.value.locker?.id === lockerHintStart.value.locker?.id
      if (!skipDupStart) {
        out.push({ kind: 'lockerSuggest', hint: lockerHintLastStart.value, hintKey: 'last-start' })
      }
    }
    if (isActiveLast && lockerHintEnd.value && i === lIdx) {
      const skipDup =
        isActiveFirst
        && i === bIdx
        && lockerHintStart.value
        && lockerHintEnd.value.locker?.id === lockerHintStart.value.locker?.id
      if (!skipDup) {
        out.push({ kind: 'lockerSuggest', hint: lockerHintEnd.value, hintKey: 'end' })
      }
    }
  }
  return out
})

function segmentVueKey(seg, si) {
  if (seg.kind === 'slot') return `${activeDay.value}-slot-${seg.slotIndex}`
  return `${activeDay.value}-locker-${seg.hintKey}-${si}`
}
function setDay(d) { activeDay.value = d.day }
function openDetail(item) {
  emit('focus-item', { day: activeDay.value, item })
  if (routeForItem(item)) {
    void openSourceDetail(item)
    return
  }
  selectedItem.value = selectedItem.value === item ? null : item
}
function closeDetail() { selectedItem.value = null }

function routeForItem(item) {
  const st = String(item?.sourceType || '').toLowerCase()
  const sid = String(item?.sourceId || '').trim()
  if (!sid) return null
  if (st.includes('locker')) return { name: 'locker-detail', params: { id: sid } }
  if (st.includes('event')) return { name: 'event-detail', params: { id: sid } }
  if (st.includes('attraction')) return { name: 'attraction-detail', params: { id: sid } }
  return null
}

async function openSourceDetail(item) {
  const target = routeForItem(item)
  if (!target) return
  const returnTo =
    route.path === '/ai'
      ? (
          typeof route.query?.returnTo === 'string' && route.query.returnTo.trim()
            ? route.query.returnTo.trim()
            : '/discover'
        )
      : route.fullPath
  emit('before-navigate-detail')
  await router.push({
    ...target,
    query: {
      returnTo,
    },
  })
}

async function openLockerSuggestion(lockerId) {
  if (lockerId == null) return
  const sid = String(lockerId).trim()
  if (!sid) return
  const returnTo =
    route.path === '/ai'
      ? (
          typeof route.query?.returnTo === 'string' && route.query.returnTo.trim()
            ? route.query.returnTo.trim()
            : '/discover'
        )
      : route.fullPath
  emit('before-navigate-detail')
  await router.push({
    name: 'locker-detail',
    params: { id: sid },
    query: {
      returnTo,
    },
  })
}

const slotTypeIcon = {
  '아침': '🌅', '오전 코스': '🌤', '점심': '🍽', '오후 코스': '🗺',
  '저녁': '🌙', '밤 코스': '✨',
}
</script>

<template>
  <div v-if="!displayDays.length" class="itinerary-timeline itinerary-timeline--emptyroot">
    <p class="itinerary-timeline__empty itinerary-timeline__empty--root">표시할 일정이 없습니다.</p>
  </div>

  <div v-else class="itinerary-timeline" :class="{ 'itinerary-timeline--horizontal': horizontal }">
    <!-- DAY 탭 -->
    <div class="itinerary-timeline__tabs">
      <button
        v-for="d in displayDays"
        :key="d.day"
        type="button"
        class="itinerary-timeline__tab"
        :class="{ 'itinerary-timeline__tab--active': activeDay === d.day }"
        @click="setDay(d)"
      >
        <span class="itinerary-timeline__tab-main">DAY {{ d.day }}</span>
        <span v-if="d.date || d.label" class="itinerary-timeline__tab-sub">{{ d.date || d.label }}</span>
      </button>
    </div>

    <!-- 가로 타임라인 모드 -->
    <template v-if="horizontal">
      <div v-if="currentDayData()?.items?.length" class="itinerary-timeline__hscroll">
        <div class="itinerary-timeline__hline">
          <template v-for="(seg, si) in currentDayTimelineSegments" :key="segmentVueKey(seg, si)">
            <button
              v-if="seg.kind === 'slot'"
              type="button"
              class="itinerary-timeline__hnode"
              :class="{
                'itinerary-timeline__hnode--active': selectedItem === seg.item,
                'itinerary-timeline__hnode--locker': seg.item.isLocker,
                'itinerary-timeline__hnode--tone-local': seg.item.toneKind === 'local',
                'itinerary-timeline__hnode--tone-blend': seg.item.toneKind === 'blend',
                'itinerary-timeline__hnode--tone-tourist': seg.item.toneKind === 'tourist',
              }"
              @click="openDetail(seg.item)"
            >
              <span class="itinerary-timeline__hnode-dot">
                {{ seg.slotOrdinal }}
              </span>
              <span class="itinerary-timeline__hnode-time">{{ seg.item.time }}</span>
              <div class="itinerary-timeline__hnode-text">
                <span class="itinerary-timeline__hnode-name">{{ seg.item.name }}</span>
                <span
                  v-if="seg.item.isLocker"
                  class="itinerary-timeline__hnode-locker"
                >🧳 물품보관함</span>
                <span
                  v-if="seg.item.toneLabel"
                  class="itinerary-timeline__hnode-tone"
                  :class="{
                    'itinerary-timeline__hnode-tone--local': seg.item.toneKind === 'local',
                    'itinerary-timeline__hnode-tone--tourist': seg.item.toneKind === 'tourist',
                    'itinerary-timeline__hnode-tone--blend': seg.item.toneKind === 'blend',
                  }"
                >{{ seg.item.toneLabel }}</span>
                <p v-if="seg.item.desc" class="itinerary-timeline__hnode-desc">{{ seg.item.desc }}</p>
              </div>
            </button>
            <button
              v-else
              class="itinerary-timeline__hnode itinerary-timeline__hnode--locker-suggest"
              type="button"
              @click="openLockerSuggestion(seg.hint.locker.id)"
            >
              <span class="itinerary-timeline__hnode-dot itinerary-timeline__hnode-dot--locker-suggest">🧳</span>
              <span class="itinerary-timeline__hnode-time">보관함</span>
              <div class="itinerary-timeline__hnode-text">
                <span class="itinerary-timeline__hnode-name itinerary-timeline__hnode-name--locker-suggest">
                  {{ seg.hint.locker.stationName || seg.hint.locker.lockerName }}
                </span>
                <span class="itinerary-timeline__hnode-locker-suggest-meta">
                  약 {{ formatStraightDistance(seg.hint.locker.distanceMeters) }}
                </span>
              </div>
            </button>
          </template>
        </div>
      </div>
      <div v-else class="itinerary-timeline__empty">
        <p>📅 이 날의 일정을 생성 중입니다...</p>
      </div>

      <!-- 상세 패널 -->
      <transition name="detail-slide">
        <div v-if="selectedItem" class="itinerary-timeline__detail">
          <button class="itinerary-timeline__detail-close" type="button" @click="closeDetail">✕</button>
          <div class="itinerary-timeline__detail-header">
            <span class="itinerary-timeline__detail-time">{{ selectedItem.time }}</span>
            <span
              v-if="selectedItem.isLocker"
              class="itinerary-timeline__detail-locker-badge"
            >🧳 물품보관함</span>
            <span
              v-if="selectedItem.crowdTag"
              class="itinerary-timeline__detail-crowd"
              :class="`itinerary-timeline__hcard-crowd--${selectedItem.crowdLevel}`"
            >{{ selectedItem.crowdTag }}</span>
          </div>
          <p class="itinerary-timeline__detail-name">{{ selectedItem.name }}</p>
          <p
            v-if="selectedItem.toneLabel"
            class="itinerary-timeline__detail-tone"
            :class="{
              'itinerary-timeline__detail-tone--local': selectedItem.toneKind === 'local',
              'itinerary-timeline__detail-tone--tourist': selectedItem.toneKind === 'tourist',
              'itinerary-timeline__detail-tone--blend': selectedItem.toneKind === 'blend',
            }"
          >{{ selectedItem.toneLabel }}</p>
          <p v-if="selectedItem.address" class="itinerary-timeline__detail-address">
            📍 {{ selectedItem.address }}
          </p>
          <p v-if="selectedItem.desc" class="itinerary-timeline__detail-desc">{{ selectedItem.desc }}</p>
          <div v-if="selectedItem.reason" class="itinerary-timeline__detail-reason">
            <span>💡</span> {{ selectedItem.reason }}
          </div>
        </div>
      </transition>
    </template>

    <!-- 기존 세로 모드 -->
    <template v-else>
      <div class="itinerary-timeline__list">
        <template v-if="currentDayData()?.items?.length">
          <template v-for="(seg, si) in currentDayTimelineSegments" :key="segmentVueKey(seg, si)">
            <div
              v-if="seg.kind === 'slot'"
              class="itinerary-timeline__item-wrap"
              :class="{ 'itinerary-timeline__item-wrap--clickable': routeForItem(seg.item) }"
              role="button"
              :tabindex="routeForItem(seg.item) ? 0 : -1"
              @click="openDetail(seg.item)"
              @keydown.enter.space.prevent="openDetail(seg.item)"
            >
              <ItineraryItem
                v-bind="seg.item"
                :is-first="seg.slotIndex === 0"
                :is-last="seg.slotIndex === currentDayData().items.length - 1"
              />
            </div>
            <button
              v-else
              class="itinerary-timeline__locker-inline"
              type="button"
              @click="openLockerSuggestion(seg.hint.locker.id)"
            >
              <div class="itinerary-timeline__locker-inline-rail">
                <span class="itinerary-timeline__locker-inline-line" aria-hidden="true" />
                <span class="itinerary-timeline__locker-inline-dot" aria-hidden="true">🧳</span>
              </div>
              <div class="itinerary-timeline__locker-inline-body">
                <span class="itinerary-timeline__locker-inline-label">{{ seg.hint.label }}</span>
                <span class="itinerary-timeline__locker-inline-name">
                  {{ seg.hint.locker.stationName || seg.hint.locker.lockerName }}
                </span>
                <span class="itinerary-timeline__locker-inline-meta">
                  직선 거리 약 {{ formatStraightDistance(seg.hint.locker.distanceMeters) }} · 상세 보기
                </span>
              </div>
              <span class="itinerary-timeline__locker-inline-chev" aria-hidden="true">›</span>
            </button>
          </template>
        </template>
        <div v-else class="itinerary-timeline__empty">
          <p>📅 이 날의 일정을 생성 중입니다...</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.itinerary-timeline { width: 100%; }

.itinerary-timeline__tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.itinerary-timeline__tab {
  flex: 1;
  min-width: 0;
  padding: 10px 6px;
  border-radius: 10px;
  border: 1.5px solid #e8e8e8;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  color: #aaa;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.itinerary-timeline__tab-main { font-size: 13px; font-weight: 700; }
.itinerary-timeline__tab-sub {
  font-size: 10px; font-weight: 600; color: inherit; opacity: 0.85;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.itinerary-timeline__tab--active {
  border-color: #fe9c00; background: #fe9c00; color: #fff;
}
.itinerary-timeline__tab--active .itinerary-timeline__tab-sub { opacity: 0.95; }

/* 세로: 타임라인에 끼워 넣는 보관함 추천 */
.itinerary-timeline__locker-inline {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0 0 18px;
  margin-left: 0;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
  transition: opacity 0.15s;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}
.itinerary-timeline__locker-inline:hover {
  opacity: 0.92;
}
.itinerary-timeline__locker-inline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
  padding-top: 4px;
}
.itinerary-timeline__locker-inline-line {
  width: 2px;
  flex: 1;
  min-height: 12px;
  background: linear-gradient(180deg, #99f6e4, #5eead4);
  border-radius: 1px;
  margin-bottom: 4px;
}
.itinerary-timeline__locker-inline-dot {
  font-size: 12px;
  line-height: 1;
}
.itinerary-timeline__locker-inline-body {
  flex: 1;
  min-width: 0;
  padding: 8px 12px 10px;
  border-radius: 12px;
  border: 1px solid #ccfbf1;
  background: linear-gradient(135deg, #f0fdfa 0%, #fff 100%);
}
.itinerary-timeline__locker-inline-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  color: #0f766e;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}
.itinerary-timeline__locker-inline-name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #134e4a;
  line-height: 1.3;
}
.itinerary-timeline__locker-inline-meta {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}
.itinerary-timeline__locker-inline-chev {
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 300;
  color: #0d9488;
  align-self: center;
  padding-right: 4px;
}

/* 가로: 보관함 추천 노드 */
.itinerary-timeline__hnode--locker-suggest {
  flex: 0 0 104px;
  text-decoration: none;
  color: inherit;
  border: none;
  background: transparent;
  font-family: inherit;
}
.itinerary-timeline__hnode-dot--locker-suggest {
  border-color: #14b8a6 !important;
  color: #0f766e !important;
  background: #ecfdf5 !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(20, 184, 166, 0.2) !important;
}
.itinerary-timeline__hnode-name--locker-suggest {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #134e4a !important;
  line-height: 1.25 !important;
  line-clamp: 3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.itinerary-timeline__hnode-locker-suggest-meta {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
}

/* ── 세로 목록 ── */
.itinerary-timeline__list { padding: 4px 0; }

/* ── 가로 스크롤 타임라인 ── */
.itinerary-timeline__hscroll {
  overflow-x: auto;
  padding: 8px 2px 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.itinerary-timeline__hscroll::-webkit-scrollbar { display: none; }

.itinerary-timeline__hline {
  position: relative;
  display: flex;
  gap: 18px;
  min-width: max-content;
  padding: 0 6px;
}

.itinerary-timeline__hline::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 20px;
  right: 20px;
  height: 2px;
  background: linear-gradient(90deg, #ffe1b0, #ffd28c);
  z-index: 0;
}

.itinerary-timeline__hnode {
  position: relative;
  z-index: 1;
  flex: 0 0 112px;
  border: none;
  background: transparent;
  padding: 0;
  display: grid;
  grid-template-rows: 36px auto auto;
  justify-items: center;
  gap: 5px;
  cursor: pointer;
  text-align: center;
  transition: transform 0.15s ease;
}

.itinerary-timeline__hnode--locker .itinerary-timeline__hnode-dot {
  border-color: #0f766e;
  color: #0f766e;
  box-shadow: 0 2px 8px rgba(15, 118, 110, 0.22);
}

.itinerary-timeline__hnode:hover {
  transform: translateY(-1px);
}

.itinerary-timeline__hnode-dot {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 2px solid #c2410c;
  background: #fff;
  color: #c2410c;
  font-size: 13px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(194, 65, 12, 0.18);
}

.itinerary-timeline__hnode--active .itinerary-timeline__hnode-dot {
  background: #c2410c;
  color: #fff;
  box-shadow: 0 4px 12px rgba(194, 65, 12, 0.35);
}

.itinerary-timeline__hnode--tone-local .itinerary-timeline__hnode-dot {
  border-color: #0f766e;
  color: #0f766e;
  box-shadow: 0 2px 8px rgba(15, 118, 110, 0.2);
}

.itinerary-timeline__hnode--tone-local.itinerary-timeline__hnode--active .itinerary-timeline__hnode-dot {
  background: #0f766e;
  color: #fff;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.35);
}

.itinerary-timeline__hnode--tone-blend .itinerary-timeline__hnode-dot {
  border-color: #6d28d9;
  color: #6d28d9;
  box-shadow: 0 2px 8px rgba(109, 40, 217, 0.2);
}

.itinerary-timeline__hnode--tone-blend.itinerary-timeline__hnode--active .itinerary-timeline__hnode-dot {
  background: #6d28d9;
  color: #fff;
  box-shadow: 0 4px 12px rgba(109, 40, 217, 0.35);
}

.itinerary-timeline__hnode--tone-tourist .itinerary-timeline__hnode-dot {
  border-color: #c2410c;
  color: #c2410c;
  box-shadow: 0 2px 8px rgba(194, 65, 12, 0.2);
}

.itinerary-timeline__hnode--tone-tourist.itinerary-timeline__hnode--active .itinerary-timeline__hnode-dot {
  background: #c2410c;
  color: #fff;
  box-shadow: 0 4px 12px rgba(194, 65, 12, 0.35);
}

.itinerary-timeline__hnode-time {
  font-size: 10px;
  font-weight: 700;
  color: #8b8b8b;
}

.itinerary-timeline__hnode-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  min-width: 0;
}

.itinerary-timeline__hnode-name {
  font-size: 11px;
  font-weight: 700;
  color: #272727;
  line-height: 1.3;
  line-clamp: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.itinerary-timeline__hnode-tone {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.itinerary-timeline__hnode-tone--local { color: #0f766e; }
.itinerary-timeline__hnode-tone--tourist { color: #c2410c; }
.itinerary-timeline__hnode-tone--blend { color: #6d28d9; }

.itinerary-timeline__hnode-locker {
  font-size: 8px;
  font-weight: 800;
  color: #0f766e;
  letter-spacing: -0.02em;
}

.itinerary-timeline__hnode-desc {
  margin: 3px 0 0;
  font-size: 9px;
  font-weight: 600;
  color: #555;
  line-height: 1.35;
  text-align: center;
  line-clamp: 4;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
  max-width: 112px;
}

.itinerary-timeline__hcard-crowd {
  font-size: 9px; font-weight: 700;
  border: 1px solid currentColor; border-radius: 4px; padding: 1px 4px;
  margin-top: 2px;
}
.itinerary-timeline__hcard-crowd--low { color: #22c55e; }
.itinerary-timeline__hcard-crowd--medium { color: #f97316; }
.itinerary-timeline__hcard-crowd--high { color: #ef4444; }

/* ── 상세 패널 ── */
.itinerary-timeline__detail {
  position: relative;
  margin-top: 10px;
  padding: 14px 14px 16px;
  border-radius: 14px;
  border: 1.5px solid #fe9c00;
  background: #fff8ee;
}
.itinerary-timeline__detail-close {
  position: absolute;
  top: 10px; right: 10px;
  width: 24px; height: 24px;
  border: none; background: transparent;
  font-size: 13px; color: #999;
  cursor: pointer; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
}
.itinerary-timeline__detail-close:hover { background: #f0ede6; color: #555; }
.itinerary-timeline__detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.itinerary-timeline__detail-locker-badge {
  font-size: 10px;
  font-weight: 800;
  color: #0f766e;
  background: #ecfdf5;
  border-radius: 5px;
  padding: 2px 7px;
}
.itinerary-timeline__detail-time {
  font-size: 11px; font-weight: 800; color: #fe9c00;
  background: #fff3dc; border-radius: 5px; padding: 2px 7px;
}
.itinerary-timeline__detail-crowd {
  font-size: 10px; font-weight: 700;
  border: 1px solid currentColor; border-radius: 4px; padding: 1px 5px;
}
.itinerary-timeline__detail-name {
  font-size: 15px; font-weight: 800; color: #1a1a1a; margin: 0 0 4px;
}

.itinerary-timeline__detail-tone {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
}

.itinerary-timeline__detail-tone--local { color: #0f766e; }
.itinerary-timeline__detail-tone--tourist { color: #c2410c; }
.itinerary-timeline__detail-tone--blend { color: #6d28d9; }

.itinerary-timeline__detail-address {
  font-size: 11px; color: #666; margin: 0 0 6px; line-height: 1.4;
}
.itinerary-timeline__detail-desc {
  font-size: 12px; color: #555; margin: 0 0 8px; line-height: 1.5;
}
.itinerary-timeline__detail-reason {
  font-size: 11px; color: #888;
  background: #fff; border-radius: 8px; padding: 6px 10px;
  display: flex; align-items: flex-start; gap: 5px; line-height: 1.4;
}

/* 슬라이드 애니메이션 */
.detail-slide-enter-active { transition: all 0.2s ease-out; }
.detail-slide-leave-active { transition: all 0.15s ease-in; }
.detail-slide-enter-from { opacity: 0; transform: translateY(-6px); }
.detail-slide-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── 세로 아이템 wrapper ── */
.itinerary-timeline__item-wrap {
  cursor: default;
  border-radius: 10px;
  transition: background 0.15s;
}
.itinerary-timeline__item-wrap--clickable {
  cursor: pointer;
}
.itinerary-timeline__item-wrap--clickable:hover {
  background: #fff8ee;
}
.itinerary-timeline__item-wrap--clickable:hover :deep(.itinerary-item__name) {
  color: #fe9c00;
}

/* ── 공통 빈 상태 ── */
.itinerary-timeline__empty {
  text-align: center; padding: 32px 0; color: #aaa; font-size: 14px;
}
.itinerary-timeline--emptyroot { padding: 16px 0; }
.itinerary-timeline__empty--root { margin: 0; padding: 12px; font-size: 13px; }
</style>
