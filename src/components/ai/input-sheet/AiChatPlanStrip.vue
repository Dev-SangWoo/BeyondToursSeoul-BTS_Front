<script setup>
import { watch, computed } from 'vue'
import ItineraryTimeline from '@/components/itinerary/ItineraryTimeline.vue'
import { structuredToItineraryDays } from '@/utils/structuredToItinerary'

const props = defineProps({
  structured: { type: Object, default: null },
  selectedDayIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:selectedDayIndex'])

const itineraryDays = computed(() =>
  props.structured ? structuredToItineraryDays(props.structured) : [],
)

/** structured.days 슬롯 기반인지 (요약 route만 있는지) */
const hasSlotData = computed(() => {
  const days = props.structured?.days
  return Array.isArray(days) && days.some((d) => Array.isArray(d?.slots) && d.slots.length > 0)
})

watch(
  () => props.structured,
  () => {
    emit('update:selectedDayIndex', 0)
  },
)

function onTimelineDay(dayNum) {
  emit('update:selectedDayIndex', Math.max(0, dayNum - 1))
}
</script>

<template>
  <!-- structured 여부와 관계없이 동일한 패널 영역 유지 -->
  <div class="plan-strip plan-strip--panel">
    <div class="plan-strip__head">
      <div class="plan-strip__title">
        <span class="plan-strip__title-text">여행 일정</span>
        <span v-if="structured?.summary?.title" class="plan-strip__subtitle">{{
          structured.summary.title
        }}</span>
      </div>
    </div>

    <template v-if="structured">
      <p v-if="itineraryDays.length && !hasSlotData" class="plan-strip__hint">
        상세 장소·시간대는 응답에 <strong>days[].slots</strong>가 포함되면 DAY별로 나뉩니다. 지금은 요약
        위주입니다.
      </p>

      <div class="plan-strip__timeline-wrap">
        <ItineraryTimeline
          v-if="itineraryDays.length"
          :source-days="itineraryDays"
          :model-value="selectedDayIndex + 1"
          :horizontal="true"
          @update:model-value="onTimelineDay"
        />
        <div v-else class="plan-strip__empty-state">
          <p class="plan-strip__empty-title">일정 데이터가 없습니다</p>
          <p class="plan-strip__empty-desc">
            응답 JSON의 <code>structured</code> 안에
            <code>days[].slots</code> 또는 <code>summary.route</code>(배열)·
            <code>summary.title</code>이 오면 이 영역이 채워집니다.
          </p>
        </div>
      </div>

      <div
        v-if="
          structured.budget &&
          (structured.budget.perPerson || structured.budget.total || structured.budget.note)
        "
        class="plan-strip__budget"
      >
        <span v-if="structured.budget.perPerson" class="plan-strip__budget-item"
          >1인 {{ structured.budget.perPerson }}</span
        >
        <span v-if="structured.budget.total" class="plan-strip__budget-item"
          >합계 {{ structured.budget.total }}</span
        >
        <span v-if="structured.budget.note" class="plan-strip__budget-note">{{
          structured.budget.note
        }}</span>
      </div>
    </template>

    <template v-else>
      <div class="plan-strip__timeline-wrap">
        <div class="plan-strip__empty-state">
          <p class="plan-strip__empty-title">structured 데이터 없음</p>
          <p class="plan-strip__empty-desc">
            AI 응답에 <code>structured</code> 필드가 없거나 <code>null</code>이면 일정 JSON을 채울 수
            없습니다. 백엔드에서 파싱 성공 시 여기에 표시됩니다.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.plan-strip {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

/** 시트 안에서 일정 블록이 항상 한 덩어리로 보이도록 */
.plan-strip--panel {
  min-height: 140px;
  padding: 10px 10px 12px;
  border-radius: 14px;
  border: 1px solid #eceae4;
  background: #fafaf8;
}

.plan-strip__head {
  flex-shrink: 0;
}

.plan-strip__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-strip__title-text {
  font-size: 14px;
  font-weight: 800;
  color: #1a1a1a;
}

.plan-strip__subtitle {
  font-size: 12px;
  font-weight: 700;
  color: #666;
  line-height: 1.35;
}

.plan-strip__hint {
  margin: 0;
  padding: 0 2px;
  font-size: 10px;
  line-height: 1.4;
  color: #9a9a9a;
  font-weight: 600;
}

.plan-strip__hint strong {
  color: #888;
  font-weight: 800;
}

.plan-strip__timeline-wrap {
  min-height: 72px;
  overflow: visible;
  margin: 0 -4px;
  padding: 4px 4px 0;
}

.plan-strip__timeline-wrap :deep(.itinerary-timeline__tabs) {
  margin-bottom: 10px;
}

.plan-strip__empty-state {
  padding: 14px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px dashed #e0ddd4;
  text-align: center;
}

.plan-strip__empty-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 800;
  color: #888;
}

.plan-strip__empty-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: #aaa;
  font-weight: 600;
}

.plan-strip__empty-desc code {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  background: #f3f2ec;
  color: #666;
}

.plan-strip__budget {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 2px 0;
  border-top: 1px solid #f0ede6;
  font-size: 11px;
  color: #666;
}

.plan-strip__budget-item {
  font-weight: 700;
}

.plan-strip__budget-note {
  flex: 1 1 100%;
  font-size: 10px;
  color: #999;
}
</style>
