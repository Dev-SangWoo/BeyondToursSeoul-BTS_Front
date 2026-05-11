<script setup>
import { watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ItineraryTimeline from '@/components/itinerary/ItineraryTimeline.vue'
import { structuredToItineraryDays } from '@/utils/structuredToItinerary'
import { getApiLangCode } from '@/i18n'

const { t, locale } = useI18n()
const props = defineProps({
  structured: { type: Object, default: null },
  selectedDayIndex: { type: Number, default: 0 },
})

const emit = defineEmits(['update:selectedDayIndex', 'focus-item', 'before-navigate-detail'])

const itineraryDays = computed(() => {
  void locale.value
  return props.structured ? structuredToItineraryDays(props.structured) : []
})


watch(
  () => props.structured,
  (next) => {
    const days = next?.days
    const maxIndex = Array.isArray(days) ? Math.max(0, days.length - 1) : 0
    if (props.selectedDayIndex > maxIndex) {
      emit('update:selectedDayIndex', maxIndex)
    }
  },
)

function onTimelineDay(dayNum) {
  emit('update:selectedDayIndex', Math.max(0, dayNum - 1))
}

function onFocusItem(payload) {
  emit('focus-item', payload)
}

function onBeforeNavigateDetail() {
  emit('before-navigate-detail')
}
</script>

<template>
  <!-- structured 여부와 관계없이 동일한 패널 영역 유지 -->
  <div class="plan-strip plan-strip--panel">
    <template v-if="structured">
      <div class="plan-strip__timeline-wrap">
        <ItineraryTimeline
          v-if="itineraryDays.length"
          :source-days="itineraryDays"
          :model-value="selectedDayIndex + 1"
          :horizontal="true"
          :locker-lang="getApiLangCode()"
          @update:model-value="onTimelineDay"
          @focus-item="onFocusItem"
          @before-navigate-detail="onBeforeNavigateDetail"
        />
        <div v-else class="plan-strip__empty-state">
          <p class="plan-strip__empty-title">{{ t('ai.chat.planStripLoading') }}</p>
        </div>
      </div>

    </template>

    <template v-else>
      <div class="plan-strip__timeline-wrap">
        <div class="plan-strip__empty-state">
          <p class="plan-strip__empty-title">{{ t('ai.chat.planStripGenerating') }}</p>
          <p class="plan-strip__empty-desc">{{ t('ai.chat.planStripGeneratingDesc') }}</p>
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

</style>
