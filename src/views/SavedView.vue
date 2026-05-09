<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDays, Heart, MapPin, Sparkles } from 'lucide-vue-next'
import { useSavedStore } from '@/stores/useSavedStore'

const { t } = useI18n()
const savedStore = useSavedStore()
const activeTab = ref('course')

const tabs = computed(() => [
  { id: 'course', label: t('saved.tabs.course') },
  { id: 'place', label: t('saved.tabs.place') },
  { id: 'event', label: t('saved.tabs.event') },
])

const activeItems = computed(() => {
  if (activeTab.value === 'place') return savedStore.savedPlaces
  if (activeTab.value === 'event') return savedStore.savedEvents
  return savedStore.savedCourses
})
</script>

<template>
  <div class="saved">
    <header class="saved__header">
      <h1>{{ $t('saved.title') }}</h1>
      <p>{{ $t('saved.description') }}</p>
    </header>

    <section class="saved__summary">
      <div class="saved__summary-item">
        <Heart :size="16" :stroke-width="2.2" />
        <span>{{ $t('saved.savedCoursesCount', { n: savedStore.savedCourses.length }) }}</span>
      </div>
      <div class="saved__summary-item">
        <Sparkles :size="16" :stroke-width="2.2" />
        <span>{{ $t('saved.attractionsEvents', { a: savedStore.savedPlaces.length, e: savedStore.savedEvents.length }) }}</span>
      </div>
    </section>

    <section class="saved__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="saved__tab"
        :class="{ 'saved__tab--active': activeTab === tab.id }"
        type="button"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </section>

    <section class="saved__list">
      <article v-for="item in activeItems" :key="item.id" class="saved-card">
        <h2 class="saved-card__title">
          {{ item.title || item.name }}
        </h2>
        <p class="saved-card__route">
          <template v-if="activeTab === 'event'">
            <CalendarDays :size="14" :stroke-width="2.2" />
            <span>{{ item.period || $t('saved.noPeriod') }}</span>
          </template>
          <template v-else>
            <MapPin :size="14" :stroke-width="2.2" />
            <span>{{ item.route || item.name }}</span>
          </template>
        </p>
        <div v-if="item.tags?.length" class="saved-card__tags">
          <span v-for="tag in item.tags" :key="tag" class="saved-card__tag">#{{ tag }}</span>
        </div>
      </article>

      <article v-if="!activeItems.length" class="saved-card saved-card--empty">
        <h2 class="saved-card__title">{{ $t('saved.empty') }}</h2>
        <p class="saved-card__route">{{ $t('saved.emptyHint') }}</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.saved {
  min-height: 100dvh;
  background: #f5f4f0;
  padding: 18px 16px 92px;
}

.saved__header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #1f1f1f;
}

.saved__header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #7d7d7d;
}

.saved__summary {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.saved__tabs {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}

.saved__tab {
  flex: 1;
  border: 1px solid #efdfc6;
  background: #fff9ef;
  color: #8f6a2f;
  border-radius: 999px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.saved__tab--active {
  background: #fe9c00;
  border-color: #fe9c00;
  color: #fff;
}

.saved__summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #f0ece5;
  border-radius: 12px;
  padding: 10px 12px;
  color: #555;
  font-size: 12px;
  font-weight: 700;
}

.saved__list {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.saved-card {
  background: #fff;
  border: 1px solid #f0ece5;
  border-radius: 14px;
  padding: 14px;
}

.saved-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #222;
}

.saved-card__route {
  margin: 9px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 12px;
}

.saved-card__tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.saved-card--empty {
  text-align: center;
}

.saved-card__tag {
  font-size: 11px;
  color: #c97000;
  background: #fff6e7;
  border: 1px solid #ffe2b5;
  border-radius: 999px;
  padding: 3px 8px;
  font-weight: 700;
}
</style>
