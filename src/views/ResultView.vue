<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTripStore } from '@/stores/useTripStore'
import MapView from '@/components/map/MapView.vue'
import ItineraryTimeline from '@/components/itinerary/ItineraryTimeline.vue'
import AiChatPanel from '@/components/ai/AiChatPanel.vue'

const { t } = useI18n()
const router = useRouter()
const tripStore = useTripStore()

function goBack() {
  router.back()
}

function saveCourse() {
  // TODO: 코스 저장 로직
}

function generateAnother() {
  router.push('/discover')
}
</script>

<template>
  <div class="result">
    <header class="result__header">
      <button class="result__back-btn" @click="goBack" :aria-label="$t('result.back')">‹</button>
      <h2 class="result__title">{{ $t('result.title') }}</h2>
      <div class="result__weather-badge">☁️ {{ $t('result.weatherBadge') }}</div>
    </header>

    <div class="result__map-section">
      <MapView />
    </div>

    <div class="result__itinerary-section">
      <ItineraryTimeline />
      <AiChatPanel />
    </div>

    <div class="result__actions">
      <button class="result__btn result__btn--save" @click="saveCourse">
        {{ $t('result.saveCourse') }}
      </button>
      <button class="result__btn result__btn--another" @click="generateAnother">
        {{ $t('result.anotherCourse') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.result {
  min-height: 100dvh;
  background: #fafaf8;
  display: flex;
  flex-direction: column;
}

.result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.result__back-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #333;
  cursor: pointer;
  line-height: 1;
  padding: 0 8px 0 0;
}

.result__title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  flex: 1;
}

.result__weather-badge {
  font-size: 12px;
  background: #e8f4fd;
  color: #2d7dd2;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.result__map-section {
  height: 50dvh;
  flex-shrink: 0;
  background: #e8e8e8;
  position: relative;
}

.result__itinerary-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.result__actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.result__btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.result__btn:active {
  opacity: 0.85;
}

.result__btn--save {
  background: #fff;
  color: #FE9C00;
  border: 2px solid #FE9C00;
}

.result__btn--another {
  background: #FE9C00;
  color: #fff;
}
</style>
