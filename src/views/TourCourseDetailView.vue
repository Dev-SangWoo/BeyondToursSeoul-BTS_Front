<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, Heart, MapPin, ChevronRight } from 'lucide-vue-next'
import { fetchTourCourseDetail, toggleTourCourseSave } from '@/services/tourCourseService'
import { getApiLangCode } from '@/i18n'
import { useAuthStore } from '@/stores/useAuthStore'
import { isAuthExpiredError } from '@/utils/authFlow'
import { parseHashtagList } from '@/utils/hashtags'
import { getCourseTitleLines } from '@/utils/courseTitle'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const course = ref(null)
const loading = ref(true)
const error = ref(null)
const saveBusy = ref(false)

const hashtagBadges = computed(() => parseHashtagList(course.value?.hashtags))

const titleLines = computed(() => getCourseTitleLines(course.value?.title))

const TOUR_COURSE_LOCAL_BAND_KEYS = [
  'local0',
  'local1-30',
  'local31-50',
  'local51-70',
  'local71-100',
]

const resolvedId = computed(() => {
  const raw = route.params.id
  return raw != null ? String(raw).trim() : ''
})

function tourCourseLocalBandLabel(band) {
  const b = Number(band)
  if (!Number.isInteger(b) || b < 0 || b > 4) return ''
  return t(`discover.densityMode.${TOUR_COURSE_LOCAL_BAND_KEYS[b]}`)
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'discover' })
}

function openSpot(item) {
  if (!item?.id) return
  if (item.itemType === 'EVENT') {
    router.push({ name: 'event-detail', params: { id: String(item.id) } })
    return
  }
  router.push({ name: 'attraction-detail', params: { id: String(item.id) } })
}

async function toggleSave() {
  const id = course.value?.id
  if (id == null || !authStore.accessToken || saveBusy.value) return
  saveBusy.value = true
  try {
    const saved = await toggleTourCourseSave(id, authStore.accessToken)
    course.value = { ...course.value, isSaved: saved }
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
    console.error(e)
  } finally {
    saveBusy.value = false
  }
}

watch(
  resolvedId,
  async (id) => {
    error.value = null
    course.value = null
    if (!id) {
      loading.value = false
      error.value = t('discover.courseDetailLoadError')
      return
    }
    loading.value = true
    try {
      course.value = await fetchTourCourseDetail(id, getApiLangCode(), authStore.accessToken || null)
    } catch (e) {
      if (isAuthExpiredError(e)) {
        await authStore.handleAuthExpired(router, route)
        return
      }
      error.value = e?.message || t('discover.courseDetailLoadError')
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

watch(
  () => authStore.accessToken,
  async (token) => {
    const id = resolvedId.value
    if (!id || !token) return
    try {
      course.value = await fetchTourCourseDetail(id, getApiLangCode(), token)
    } catch {
      /* ignore */
    }
  },
)

watch(locale, async () => {
  const id = resolvedId.value
  if (!id) return
  try {
    course.value = await fetchTourCourseDetail(
      id,
      getApiLangCode(),
      authStore.accessToken || null,
    )
  } catch {
    /* ignore */
  }
})
</script>

<template>
  <div class="tour-course-detail">
    <header class="tour-course-detail__header">
      <button type="button" class="tour-course-detail__back" @click="goBack">
        <ChevronLeft :size="22" :stroke-width="2.2" />
        <span>{{ $t('attraction.back') }}</span>
      </button>
      <button
        v-if="authStore.accessToken && course"
        type="button"
        class="tour-course-detail__save"
        :class="{ 'tour-course-detail__save--on': course.isSaved }"
        :disabled="saveBusy"
        :aria-label="course.isSaved ? $t('discover.unsaveCourse') : $t('discover.saveCourse')"
        @click="toggleSave"
      >
        <Heart :size="20" :stroke-width="2.2" />
      </button>
    </header>

    <div v-if="loading" class="tour-course-detail__state">
      {{ $t('discover.loadingCourses') }}
    </div>
    <p v-else-if="error" class="tour-course-detail__state tour-course-detail__state--error">
      {{ error }}
    </p>
    <template v-else-if="course">
      <div
        v-if="course.featuredImage"
        class="tour-course-detail__hero"
        :style="{ backgroundImage: `url(${course.featuredImage})` }"
      />
      <div class="tour-course-detail__body">
        <div class="tour-course-detail__title-row">
          <h1 class="tour-course-detail__title">
            <span
              v-for="(line, ti) in titleLines"
              :key="ti"
              class="tour-course-detail__title-line"
            >{{ line }}</span>
          </h1>
          <div
            v-if="course.avgLocalScorePercent != null && course.localBand != null"
            class="tour-course-detail__local-badge"
          >
            <span class="tour-course-detail__local-pct">{{ course.avgLocalScorePercent }}%</span>
            <span class="tour-course-detail__local-tier">{{
              tourCourseLocalBandLabel(course.localBand)
            }}</span>
          </div>
        </div>
        <div
          v-if="hashtagBadges.length"
          class="tour-course-detail__tags"
        >
          <span
            v-for="tag in hashtagBadges"
            :key="tag"
            class="tour-course-detail__tag"
            :title="'#' + tag"
          >
            #{{ tag }}
          </span>
        </div>

        <h2 class="tour-course-detail__steps-title">{{ $t('discover.courseDetailStepsTitle') }}</h2>
        <p class="tour-course-detail__steps-hint">{{ $t('discover.courseDetailSpotTap') }}</p>

        <p v-if="!course.items.length" class="tour-course-detail__empty">
          {{ $t('discover.courseDetailEmptySteps') }}
        </p>
        <ol v-else class="tour-course-detail__steps">
          <li v-for="item in course.items" :key="`${item.itemType}-${item.id}-${item.sequenceOrder}`">
            <button type="button" class="tour-course-detail__step" @click="openSpot(item)">
              <div class="tour-course-detail__step-num">{{ item.sequenceOrder }}</div>
              <div v-if="item.thumbnail" class="tour-course-detail__step-thumb-wrap">
                <img class="tour-course-detail__step-thumb" :src="item.thumbnail" alt="" />
              </div>
              <div class="tour-course-detail__step-main">
                <span class="tour-course-detail__step-badge">{{
                  item.itemType === 'EVENT'
                    ? $t('discover.courseStepEvent')
                    : $t('discover.courseStepAttraction')
                }}</span>
                <span class="tour-course-detail__step-name">{{ item.name }}</span>
                <span v-if="item.address" class="tour-course-detail__step-addr">
                  <MapPin :size="12" :stroke-width="2.2" class="tour-course-detail__step-addr-icon" />
                  {{ item.address }}
                </span>
                <p v-if="item.aiComment" class="tour-course-detail__step-comment">{{ item.aiComment }}</p>
              </div>
              <ChevronRight :size="18" :stroke-width="2.2" class="tour-course-detail__step-chevron" />
            </button>
          </li>
        </ol>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tour-course-detail {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f7f5f2;
  /* BottomNav fixed + FAB 여유 (DiscoverView와 유사) */
  padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
}

.tour-course-detail__header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(247, 245, 242, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.tour-course-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  color: #222;
  cursor: pointer;
  padding: 6px 4px;
}

.tour-course-detail__save {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e8e4dc;
  background: #fff;
  color: #888;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tour-course-detail__save--on {
  color: #fe9c00;
  border-color: #ffd79a;
  background: #fff8ed;
}

.tour-course-detail__save:disabled {
  opacity: 0.55;
  cursor: default;
}

.tour-course-detail__state {
  padding: 48px 20px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.tour-course-detail__state--error {
  color: #b91c1c;
  font-weight: 600;
}

.tour-course-detail__hero {
  height: min(38vw, 200px);
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid #e8e4dc;
}

.tour-course-detail__body {
  padding: 18px 16px 0;
  max-width: 560px;
  margin: 0 auto;
}

.tour-course-detail__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.tour-course-detail__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.35;
  flex: 1;
  min-width: min(100%, 200px);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2em;
}

.tour-course-detail__title-line {
  display: block;
  max-width: 100%;
  word-break: keep-all;
}

.tour-course-detail__title-line + .tour-course-detail__title-line {
  font-size: 0.88em;
  font-weight: 750;
  color: #444;
}

.tour-course-detail__tags {
  margin-top: 12px;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.tour-course-detail__tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 700;
  color: #8a4b00;
  background: #fff6e7;
  border: 1px solid #ffe2b5;
  border-radius: 999px;
  white-space: nowrap;
}

.tour-course-detail__local-badge {
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff8ed 0%, #fff 100%);
  border: 1px solid #ffe2b5;
  box-shadow: 0 2px 8px rgba(254, 156, 0, 0.12);
}

.tour-course-detail__local-pct {
  font-size: 16px;
  font-weight: 800;
  color: #fe9c00;
  line-height: 1;
}

.tour-course-detail__local-tier {
  font-size: 10px;
  font-weight: 700;
  color: #666;
  text-align: right;
  max-width: 120px;
  line-height: 1.25;
}

.tour-course-detail__steps-title {
  margin: 22px 0 0;
  font-size: 15px;
  font-weight: 800;
  color: #222;
}

.tour-course-detail__steps-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #888;
}

.tour-course-detail__empty {
  margin: 16px 0 0;
  font-size: 13px;
  color: #888;
}

.tour-course-detail__steps {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tour-course-detail__step {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  padding: 12px;
  border: 1px solid #ebe6df;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.tour-course-detail__step:hover {
  border-color: #fe9c00;
  box-shadow: 0 4px 14px rgba(254, 156, 0, 0.12);
}

.tour-course-detail__step-num {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: #fff6e7;
  color: #c97000;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tour-course-detail__step-thumb-wrap {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  background: #eee;
}

.tour-course-detail__step-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tour-course-detail__step-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tour-course-detail__step-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #a16207;
}

.tour-course-detail__step-name {
  font-size: 14px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.35;
}

.tour-course-detail__step-addr {
  font-size: 11px;
  color: #777;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  line-height: 1.35;
}

.tour-course-detail__step-addr-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.tour-course-detail__step-comment {
  margin: 4px 0 0;
  font-size: 12px;
  color: #555;
  line-height: 1.45;
}

.tour-course-detail__step-chevron {
  flex-shrink: 0;
  color: #ccc;
  margin-top: 4px;
}
</style>
