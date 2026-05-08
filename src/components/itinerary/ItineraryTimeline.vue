<script setup>
import { ref, computed, watch } from 'vue'
import ItineraryItem from './ItineraryItem.vue'

const props = defineProps({
  sourceDays: { type: Array, default: undefined },
  modelValue: { type: Number, default: undefined },
  horizontal: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

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

watch(displayDays, (list) => {
  const maxD = list.length ? Math.max(...list.map((x) => x.day)) : 1
  if (activeDay.value > maxD) activeDay.value = maxD
  if (activeDay.value < 1) activeDay.value = 1
  selectedItem.value = null
}, { deep: true })

watch(activeDay, () => { selectedItem.value = null })

function currentDayData() {
  return displayDays.value.find((d) => d.day === activeDay.value)
}
function setDay(d) { activeDay.value = d.day }
function openDetail(item) { selectedItem.value = selectedItem.value === item ? null : item }
function closeDetail() { selectedItem.value = null }

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

    <!-- 가로 카드 모드 -->
    <template v-if="horizontal">
      <div v-if="currentDayData()?.items?.length" class="itinerary-timeline__hscroll">
        <button
          v-for="(item, i) in currentDayData().items"
          :key="`${activeDay}-${i}`"
          type="button"
          class="itinerary-timeline__hcard"
          :class="{ 'itinerary-timeline__hcard--active': selectedItem === item }"
          @click="openDetail(item)"
        >
          <span class="itinerary-timeline__hcard-icon">{{ slotTypeIcon[item.time] ?? slotTypeIcon[item.name] ?? '📍' }}</span>
          <span class="itinerary-timeline__hcard-label">{{ item.time }}</span>
          <span class="itinerary-timeline__hcard-name">{{ item.name }}</span>
          <span
            v-if="item.crowdTag"
            class="itinerary-timeline__hcard-crowd"
            :class="`itinerary-timeline__hcard-crowd--${item.crowdLevel}`"
          >{{ item.crowdTag }}</span>
        </button>
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
              v-if="selectedItem.crowdTag"
              class="itinerary-timeline__detail-crowd"
              :class="`itinerary-timeline__hcard-crowd--${selectedItem.crowdLevel}`"
            >{{ selectedItem.crowdTag }}</span>
          </div>
          <p class="itinerary-timeline__detail-name">{{ selectedItem.name }}</p>
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
          <ItineraryItem
            v-for="(item, i) in currentDayData().items"
            :key="`${activeDay}-${i}`"
            v-bind="item"
            :is-first="i === 0"
            :is-last="i === currentDayData().items.length - 1"
          />
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

/* ── 세로 목록 ── */
.itinerary-timeline__list { padding: 4px 0; }

/* ── 가로 스크롤 카드 ── */
.itinerary-timeline__hscroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 2px 2px 8px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.itinerary-timeline__hscroll::-webkit-scrollbar { display: none; }

.itinerary-timeline__hcard {
  scroll-snap-align: start;
  flex-shrink: 0;
  width: 110px;
  padding: 10px 10px 12px;
  border-radius: 14px;
  border: 1.5px solid #eceae4;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s, box-shadow 0.18s, transform 0.15s;
}
.itinerary-timeline__hcard:hover {
  border-color: #fe9c00;
  box-shadow: 0 2px 10px rgba(254,156,0,0.15);
  transform: translateY(-1px);
}
.itinerary-timeline__hcard--active {
  border-color: #fe9c00;
  background: #fff8ee;
  box-shadow: 0 3px 12px rgba(254,156,0,0.2);
}
.itinerary-timeline__hcard-icon { font-size: 20px; line-height: 1; }
.itinerary-timeline__hcard-label {
  font-size: 10px; font-weight: 700; color: #fe9c00;
  background: #fff3dc; border-radius: 4px; padding: 1px 5px;
}
.itinerary-timeline__hcard-name {
  font-size: 12px; font-weight: 800; color: #1a1a1a;
  line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
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
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
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
  font-size: 15px; font-weight: 800; color: #1a1a1a; margin: 0 0 6px;
}
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

/* ── 공통 빈 상태 ── */
.itinerary-timeline__empty {
  text-align: center; padding: 32px 0; color: #aaa; font-size: 14px;
}
.itinerary-timeline--emptyroot { padding: 16px 0; }
.itinerary-timeline__empty--root { margin: 0; padding: 12px; font-size: 13px; }
</style>
