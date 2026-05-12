<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CalendarDays, Heart, MapPin, Sparkles } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/useAuthStore'
import { useServerSavedAttractionsStore } from '@/stores/useServerSavedAttractionsStore'
import { useServerSavedEventsStore } from '@/stores/useServerSavedEventsStore'
import { deleteSavedPlan, fetchSavedPlans } from '@/services/savedPlansService'
import { fetchSavedTourCourses } from '@/services/tourCourseService'
import { getApiLangCode } from '@/i18n'
import { isAuthExpiredError } from '@/utils/authFlow'
import { parseHashtagList } from '@/utils/hashtags'
import { getCourseTitleLines } from '@/utils/courseTitle'

const { t } = useI18n()
const authStore = useAuthStore()
const serverAttractions = useServerSavedAttractionsStore()
const serverEvents = useServerSavedEventsStore()
const router = useRouter()
const route = useRoute()

/** 서버 저장 AI 일정 */
const activeTab = ref('plan')

const tabs = computed(() => [
  { id: 'plan', label: t('saved.tabs.plan') },
  { id: 'home_course', label: t('saved.tabs.homeCourse') },
  { id: 'place', label: t('saved.tabs.place') },
  { id: 'event', label: t('saved.tabs.event') },
])

const savedPlansRemote = ref([])
const savedPlansLoading = ref(false)
const savedPlansError = ref(null)
const deletingPlanId = ref(null)

const savedTourCourses = ref([])
const savedTourCoursesLoading = ref(false)
const savedTourCoursesError = ref(null)

const TOUR_COURSE_LOCAL_BAND_KEYS = [
  'local0',
  'local1-30',
  'local31-50',
  'local51-70',
  'local71-100',
]

function tourCourseLocalBandLabel(band) {
  const b = Number(band)
  if (!Number.isInteger(b) || b < 0 || b > 4) return ''
  return t(`discover.densityMode.${TOUR_COURSE_LOCAL_BAND_KEYS[b]}`)
}

function openSavedTourCourse(item) {
  const id = item?.id
  if (id == null) return
  router.push({ name: 'tour-course-detail', params: { id: String(id) } })
}

async function loadSavedTourCourses() {
  savedTourCoursesError.value = null
  if (!authStore.accessToken) {
    savedTourCourses.value = []
    return
  }
  savedTourCoursesLoading.value = true
  try {
    savedTourCourses.value = await fetchSavedTourCourses(getApiLangCode(), authStore.accessToken)
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
    savedTourCourses.value = []
    savedTourCoursesError.value = e?.message || String(e)
  } finally {
    savedTourCoursesLoading.value = false
  }
}

function formatSavedPlanDate(iso) {
  if (iso == null || String(iso).trim() === '') return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return ''
  }
}

async function loadSavedPlansRemote() {
  savedPlansError.value = null
  if (!authStore.isAuthenticated || !authStore.accessToken) {
    savedPlansRemote.value = []
    return
  }
  savedPlansLoading.value = true
  try {
    savedPlansRemote.value = await fetchSavedPlans(authStore.accessToken)
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
    savedPlansRemote.value = []
    savedPlansError.value = e?.message || String(e)
  } finally {
    savedPlansLoading.value = false
  }
}

async function refreshSavedAttractions() {
  try {
    await serverAttractions.refresh(authStore.accessToken)
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
  }
}

async function refreshSavedEvents() {
  try {
    await serverEvents.refresh(authStore.accessToken)
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
  }
}

watch(
  () => authStore.accessToken,
  () => {
    void loadSavedPlansRemote()
    void refreshSavedAttractions()
    void refreshSavedEvents()
    void loadSavedTourCourses()
  },
)

watch(activeTab, (tab) => {
  if (tab === 'place' && authStore.accessToken) {
    void refreshSavedAttractions()
  }
  if (tab === 'home_course' && authStore.accessToken) {
    void loadSavedTourCourses()
  }
  if (tab === 'event' && authStore.accessToken) {
    void refreshSavedEvents()
  }
})

onMounted(() => {
  void loadSavedPlansRemote()
  void refreshSavedAttractions()
  void refreshSavedEvents()
  void loadSavedTourCourses()
})

const activeItems = computed(() => {
  if (activeTab.value === 'event') return serverEvents.items
  return []
})

function openSavedPlan(planId) {
  const sid = planId != null ? String(planId).trim() : ''
  if (!sid) return
  router.push({ name: 'result', query: { planId: sid } })
}

async function removeSavedPlan(planId) {
  if (!authStore.accessToken || deletingPlanId.value != null) return
  const sid = planId != null ? String(planId).trim() : ''
  if (!sid) return
  deletingPlanId.value = sid
  try {
    await deleteSavedPlan(sid, authStore.accessToken)
    savedPlansRemote.value = savedPlansRemote.value.filter((p) => String(p.id) !== sid)
  } catch (e) {
    window.alert?.(e?.message || t('saved.deletePlanFailed'))
  } finally {
    deletingPlanId.value = null
  }
}
</script>

<template>
  <div class="saved">
    <header class="saved__header">
      <h1>{{ $t('saved.title') }}</h1>
      <p>{{ $t('saved.headerDesc') }}</p>
    </header>

    <section class="saved__summary">
      <div class="saved__summary-item saved__summary-item--accent">
        <Sparkles :size="16" :stroke-width="2.2" />
        <span>{{ authStore.isAuthenticated ? $t('saved.summaryMyPlans', { n: savedPlansRemote.length }) : $t('saved.tabs.plan') }}</span>
        <span class="saved__summary-badge">{{ $t('saved.summaryServer') }}</span>
      </div>
      <div class="saved__summary-item">
        <Heart :size="16" :stroke-width="2.2" />
        <span>{{ authStore.isAuthenticated ? $t('saved.summaryCourseSaved', { n: savedTourCourses.length }) : $t('saved.tabs.homeCourse') }}</span>
        <span class="saved__summary-badge">{{ $t('saved.summaryServer') }}</span>
      </div>
      <div class="saved__summary-item">
        <MapPin :size="16" :stroke-width="2.2" />
        <span>{{ authStore.isAuthenticated ? $t('saved.summarySavedAttractions', { n: serverAttractions.items.length }) : $t('saved.tabs.place') }}</span>
        <span class="saved__summary-badge">{{ $t('saved.summaryServer') }}</span>
      </div>
      <div class="saved__summary-item">
        <CalendarDays :size="16" :stroke-width="2.2" />
        <span>{{ authStore.isAuthenticated ? $t('saved.summarySavedEvents', { n: serverEvents.items.length }) : $t('saved.tabs.event') }}</span>
        <span class="saved__summary-badge">{{ $t('saved.summaryServer') }}</span>
      </div>
    </section>

    <section class="saved__tabs" role="tablist" :aria-label="$t('saved.title')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="saved__tab"
        :class="{ 'saved__tab--active': activeTab === tab.id }"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <span class="saved__tab-label">{{ tab.label }}</span>
      </button>
    </section>

    <section class="saved__list">
      <!-- 내 일정: 서버 user_saved_plans -->
      <template v-if="activeTab === 'plan'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.needLogin') }}</h2>
          <p class="saved-card__route">{{ $t('saved.planNeedLoginDesc') }}</p>
        </div>
        <div v-else-if="savedPlansLoading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.loading') }}</h2>
        </div>
        <p v-else-if="savedPlansError" class="saved-card saved-card--error">
          {{ savedPlansError }}
        </p>
        <template v-else-if="savedPlansRemote.length">
          <article
            v-for="p in savedPlansRemote"
            :key="p.id"
            class="saved-card saved-card--plan"
          >
            <div class="saved-card__plan-head">
              <Sparkles :size="18" :stroke-width="2.2" class="saved-card__plan-icon" aria-hidden="true" />
              <h2 class="saved-card__title">{{ p.title || $t('saved.planFallbackTitle') }}</h2>
            </div>
            <p v-if="formatSavedPlanDate(p.savedAt)" class="saved-card__route">
              <CalendarDays :size="14" :stroke-width="2.2" />
              <span>{{ $t('saved.savedAtPrefix') }} {{ formatSavedPlanDate(p.savedAt) }}</span>
            </p>
            <div class="saved-card__cta-row">
              <button type="button" class="saved-card__cta saved-card__cta--secondary" @click="removeSavedPlan(p.id)" :disabled="deletingPlanId === String(p.id)">
                {{ deletingPlanId === String(p.id) ? $t('saved.deletingPlan') : $t('saved.deletePlan') }}
              </button>
              <button type="button" class="saved-card__cta" @click="openSavedPlan(p.id)">
                {{ $t('saved.viewPlan') }}
              </button>
            </div>
          </article>
        </template>
        <article v-else class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.emptyPlan') }}</h2>
          <p class="saved-card__route">{{ $t('saved.emptyPlanHint') }}</p>
        </article>
      </template>

      <!-- 공식 추천 코스 찜: user_saved_courses → tour_courses -->
      <template v-else-if="activeTab === 'home_course'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.needLogin') }}</h2>
          <p class="saved-card__route">{{ $t('saved.courseNeedLoginDesc') }}</p>
        </div>
        <div v-else-if="savedTourCoursesLoading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.loading') }}</h2>
        </div>
        <p v-else-if="savedTourCoursesError" class="saved-card saved-card--error">
          {{ savedTourCoursesError }}
        </p>
        <template v-else-if="savedTourCourses.length">
          <article
            v-for="item in savedTourCourses"
            :key="item.id"
            class="saved-card saved-card--course"
            role="button"
            tabindex="0"
            @click="openSavedTourCourse(item)"
            @keydown.enter.prevent="openSavedTourCourse(item)"
            @keydown.space.prevent="openSavedTourCourse(item)"
          >
            <h2 class="saved-card__title">
              <template v-if="item.title && String(item.title).trim()">
                <span
                  v-for="(line, ti) in getCourseTitleLines(item.title)"
                  :key="ti"
                  class="saved-card__title-line"
                >{{ line }}</span>
              </template>
              <template v-else>{{ $t('saved.tabs.homeCourse') }}</template>
            </h2>
            <p
              v-if="item.avgLocalScorePercent != null && item.localBand != null"
              class="saved-card__local-row"
            >
              <span class="saved-card__local-pct">{{ item.avgLocalScorePercent }}%</span>
              <span class="saved-card__local-tier">{{
                tourCourseLocalBandLabel(item.localBand)
              }}</span>
            </p>
            <div
              v-if="parseHashtagList(item.hashtags).length"
              class="saved-card__tags"
            >
              <span
                v-for="tag in parseHashtagList(item.hashtags)"
                :key="tag"
                class="saved-card__tag"
              >#{{ tag }}</span>
            </div>
          </article>
        </template>
        <article v-else class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.emptyCourse') }}</h2>
          <p class="saved-card__route">{{ $t('saved.emptyCourseHint') }}</p>
        </article>
      </template>

      <!-- 관광지: 서버 user_saved_attractions -->
      <template v-else-if="activeTab === 'place'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.needLogin') }}</h2>
          <p class="saved-card__route">{{ $t('saved.attractionNeedLoginDesc') }}</p>
        </div>
        <div v-else-if="serverAttractions.loading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.loading') }}</h2>
        </div>
        <template v-else-if="serverAttractions.items.length">
          <article
            v-for="a in serverAttractions.items"
            :key="a.id"
            class="saved-card saved-card--attract"
          >
            <div class="saved-card__attract-row">
              <div v-if="a.thumbnail" class="saved-card__thumb-wrap">
                <img class="saved-card__thumb" :src="a.thumbnail" alt="" />
              </div>
              <div class="saved-card__attract-main">
                <h2 class="saved-card__title">{{ a.name }}</h2>
                <p v-if="a.address" class="saved-card__route">
                  <MapPin :size="14" :stroke-width="2.2" />
                  <span>{{ a.address }}</span>
                </p>
                <p v-if="formatSavedPlanDate(a.savedAt)" class="saved-card__muted">
                  {{ $t('saved.savedAtPrefix') }} {{ formatSavedPlanDate(a.savedAt) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="saved-card__cta saved-card__cta--secondary"
              @click="router.push({ name: 'attraction-detail', params: { id: String(a.id) } })"
            >
              {{ $t('saved.viewDetail') }}
            </button>
          </article>
        </template>
        <article v-else class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.emptyAttraction') }}</h2>
          <p class="saved-card__route">{{ $t('saved.emptyAttractionHint') }}</p>
        </article>
      </template>

      <!-- 행사: 서버 user_saved_events -->
      <template v-else-if="activeTab === 'event'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.needLogin') }}</h2>
          <p class="saved-card__route">{{ $t('saved.eventNeedLoginDesc') }}</p>
        </div>
        <div v-else-if="serverEvents.loading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.loading') }}</h2>
        </div>
        <article v-else v-for="item in activeItems" :key="item.contentId" class="saved-card">
          <h2 class="saved-card__title">
            {{ item.title || $t('saved.eventFallbackTitle') }}
          </h2>
          <p class="saved-card__route">
            <CalendarDays :size="14" :stroke-width="2.2" />
            <span>{{ item.eventStartDate && item.eventEndDate ? `${item.eventStartDate} ~ ${item.eventEndDate}` : $t('saved.noPeriod') }}</span>
          </p>
          <p v-if="item.address" class="saved-card__route">
            <MapPin :size="14" :stroke-width="2.2" />
            <span>{{ item.address }}</span>
          </p>
          <button
            type="button"
            class="saved-card__cta saved-card__cta--secondary"
            @click="router.push({ name: 'event-detail', params: { id: String(item.contentId) } })"
          >
            {{ $t('saved.viewDetail') }}
          </button>
        </article>

        <article v-if="authStore.isAuthenticated && !serverEvents.loading && !activeItems.length" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">{{ $t('saved.emptyEvent') }}</h2>
          <p class="saved-card__route">{{ $t('saved.emptyEventHint') }}</p>
        </article>
      </template>
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
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.saved__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: 1px solid #efdfc6;
  background: #fff9ef;
  color: #8f6a2f;
  border-radius: 12px;
  padding: 8px 6px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  min-height: 48px;
}

.saved__tab--active {
  background: #fe9c00;
  border-color: #fe9c00;
  color: #fff;
}

.saved__tab-hint {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.85;
}

.saved__tab-label {
  line-height: 1.2;
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
  flex-wrap: wrap;
}

.saved__summary-item--accent {
  border-color: #ffe2b5;
  background: linear-gradient(135deg, #fffbf5 0%, #fff 100%);
}

.saved__summary-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
}

.saved__summary-badge--muted {
  background: #f4f4f5;
  color: #71717a;
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

.saved-card--course {
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.saved-card--course:hover {
  border-color: #ffd79a;
  box-shadow: 0 4px 14px rgba(254, 156, 0, 0.1);
}

.saved-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #222;
}

.saved-card__title-line {
  display: block;
  word-break: keep-all;
}

.saved-card__title-line + .saved-card__title-line {
  margin-top: 0.2em;
  font-size: 0.94em;
  font-weight: 750;
  color: #444;
}

.saved-card__local-row {
  margin: 8px 0 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 10px;
}

.saved-card__local-pct {
  font-size: 16px;
  font-weight: 800;
  color: #fe9c00;
  letter-spacing: -0.02em;
}

.saved-card__local-tier {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
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
  flex-wrap: nowrap;
  gap: 6px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.saved-card--empty {
  text-align: center;
}

.saved-card--error {
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
}

.saved-card__tag {
  font-size: 11px;
  color: #c97000;
  background: #fff6e7;
  border: 1px solid #ffe2b5;
  border-radius: 999px;
  padding: 3px 8px;
  font-weight: 700;
  white-space: nowrap;
}

.saved-card__note {
  margin: 10px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: #a1a1aa;
  line-height: 1.4;
}

.saved-card--plan {
  border-color: #ffe2b5;
}

.saved-card__plan-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.saved-card__plan-icon {
  flex-shrink: 0;
  color: #fe9c00;
  margin-top: 1px;
}

.saved-card__cta {
  margin-top: 12px;
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  background: #fe9c00;
  color: #fff;
}

.saved-card__cta:active {
  opacity: 0.92;
}

.saved-card__cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.saved-card__cta-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.saved-card__cta-row .saved-card__cta {
  margin-top: 0;
}

.saved-card--attract {
  border-color: #e8e4dc;
}

.saved-card__attract-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.saved-card__thumb-wrap {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  background: #f4f4f5;
}

.saved-card__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.saved-card__attract-main {
  flex: 1;
  min-width: 0;
}

.saved-card__attract-main .saved-card__title {
  font-size: 15px;
}

.saved-card__muted {
  margin: 6px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: #a1a1aa;
}

.saved-card__cta--secondary {
  background: #fff;
  color: #b45309;
  border: 1px solid #fcd34d;
}
</style>
