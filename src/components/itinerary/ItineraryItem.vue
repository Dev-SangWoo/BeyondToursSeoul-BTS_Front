<script setup>
defineProps({
  time: { type: String, required: true },
  name: { type: String, required: true },
  crowdTag: { type: String, default: '' },
  crowdLevel: { type: String, default: 'low' }, // 'low' | 'medium' | 'high'
  desc: { type: String, default: '' },
  reason: { type: String, default: '' },
  /** 로컬 / 유명 톤 (structuredToItinerary) */
  toneLabel: { type: String, default: '' },
  toneKind: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isLocker: { type: Boolean, default: false },
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
})

const crowdColors = { low: '#22c55e', medium: '#f97316', high: '#ef4444' }
</script>

<template>
  <div class="itinerary-item">
    <div class="itinerary-item__timeline">
      <div
        class="itinerary-item__dot"
        :style="{ background: crowdColors[crowdLevel] }"
      ></div>
      <div v-if="!isLast" class="itinerary-item__line"></div>
    </div>

    <div class="itinerary-item__content">
      <div class="itinerary-item__top">
        <span class="itinerary-item__time">{{ time }}</span>
        <span v-if="isLocker" class="itinerary-item__locker-tag">🧳 보관함</span>
        <span v-if="crowdTag" class="itinerary-item__crowd-tag" :style="{ color: crowdColors[crowdLevel] }">
          {{ crowdTag }}
        </span>
      </div>
      <p class="itinerary-item__name">{{ name }}</p>
      <p
        v-if="toneLabel"
        class="itinerary-item__tone"
        :class="{
          'itinerary-item__tone--local': toneKind === 'local',
          'itinerary-item__tone--tourist': toneKind === 'tourist',
          'itinerary-item__tone--blend': toneKind === 'blend',
        }"
      >{{ toneLabel }}</p>
      <p v-if="desc" class="itinerary-item__desc">{{ desc }}</p>
      <div v-if="reason" class="itinerary-item__reason">
        <span class="itinerary-item__reason-icon">💡</span>
        {{ reason }}
      </div>
    </div>

    <div v-if="imageUrl" class="itinerary-item__thumb">
      <img
        class="itinerary-item__thumb-img"
        :src="imageUrl"
        :alt="name"
        loading="lazy"
      />
    </div>
  </div>
</template>

<style scoped>
.itinerary-item {
  display: flex;
  gap: 12px;
  padding: 0 0 20px;
}

.itinerary-item__timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 16px;
  padding-top: 4px;
}

.itinerary-item__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px currentColor;
}

.itinerary-item__line {
  flex: 1;
  width: 2px;
  background: #e8e8e8;
  margin-top: 4px;
  min-height: 24px;
}

.itinerary-item__content {
  flex: 1;
  min-width: 0;
}

.itinerary-item__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.itinerary-item__time {
  font-size: 12px;
  font-weight: 700;
  color: #FE9C00;
}

.itinerary-item__locker-tag {
  font-size: 10px;
  font-weight: 800;
  color: #0f766e;
  background: #ecfdf5;
  border-radius: 4px;
  padding: 1px 6px;
}

.itinerary-item__crowd-tag {
  font-size: 10px;
  font-weight: 600;
  border: 1.5px solid currentColor;
  border-radius: 4px;
  padding: 1px 5px;
}

.itinerary-item__name {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 2px;
  color: #1a1a1a;
}

.itinerary-item__tone {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
}

.itinerary-item__tone--local { color: #0f766e; }
.itinerary-item__tone--tourist { color: #c2410c; }
.itinerary-item__tone--blend { color: #6d28d9; }

.itinerary-item__desc {
  font-size: 12px;
  color: #666;
  margin: 0 0 6px;
  line-height: 1.5;
}

.itinerary-item__reason {
  font-size: 11px;
  color: #888;
  background: #fafaf8;
  border-radius: 6px;
  padding: 4px 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.itinerary-item__reason-icon {
  font-size: 12px;
}

.itinerary-item__thumb {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.itinerary-item__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
