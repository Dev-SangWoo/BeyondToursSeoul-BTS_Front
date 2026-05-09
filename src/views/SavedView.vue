<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, Heart, MapPin, Sparkles } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/useAuthStore'
import { useServerSavedAttractionsStore } from '@/stores/useServerSavedAttractionsStore'
import { useServerSavedEventsStore } from '@/stores/useServerSavedEventsStore'
import { fetchSavedPlans } from '@/services/savedPlansService'
import { fetchSavedTourCourses } from '@/services/tourCourseService'

const authStore = useAuthStore()
const serverAttractions = useServerSavedAttractionsStore()
const serverEvents = useServerSavedEventsStore()
const router = useRouter()

/** 서버 저장 AI 일정 */
const activeTab = ref('plan')

const tabs = [
  { id: 'plan', label: '내 일정', hint: 'AI·계정' },
  { id: 'home_course', label: '추천 코스', hint: 'tour_courses' },
  { id: 'place', label: '관광지', hint: '찜·계정' },
  { id: 'event', label: '행사', hint: '' },
]

const savedPlansRemote = ref([])
const savedPlansLoading = ref(false)
const savedPlansError = ref(null)

const savedTourCourses = ref([])
const savedTourCoursesLoading = ref(false)
const savedTourCoursesError = ref(null)

function hashtagLineTags(hashtags) {
  if (hashtags == null || String(hashtags).trim() === '') return []
  return String(hashtags)
    .split(/[#\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12)
}

async function loadSavedTourCourses() {
  savedTourCoursesError.value = null
  if (!authStore.accessToken) {
    savedTourCourses.value = []
    return
  }
  savedTourCoursesLoading.value = true
  try {
    savedTourCourses.value = await fetchSavedTourCourses('KOR', authStore.accessToken)
  } catch (e) {
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
    savedPlansRemote.value = []
    savedPlansError.value = e?.message || String(e)
  } finally {
    savedPlansLoading.value = false
  }
}

watch(
  () => authStore.accessToken,
  () => {
    void loadSavedPlansRemote()
    void serverAttractions.refresh(authStore.accessToken)
    void serverEvents.refresh(authStore.accessToken)
    void loadSavedTourCourses()
  },
)

watch(activeTab, (tab) => {
  if (tab === 'place' && authStore.accessToken) {
    void serverAttractions.refresh(authStore.accessToken)
  }
  if (tab === 'home_course' && authStore.accessToken) {
    void loadSavedTourCourses()
  }
  if (tab === 'event' && authStore.accessToken) {
    void serverEvents.refresh(authStore.accessToken)
  }
})

onMounted(() => {
  void loadSavedPlansRemote()
  void serverAttractions.refresh(authStore.accessToken)
  void serverEvents.refresh(authStore.accessToken)
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
</script>

<template>
  <div class="saved">
    <header class="saved__header">
      <h1>저장함</h1>
      <p>내 일정·추천 코스·관광지·행사까지 계정(DB)에 저장됩니다.</p>
    </header>

    <section class="saved__summary">
      <div class="saved__summary-item saved__summary-item--accent">
        <Sparkles :size="16" :stroke-width="2.2" />
        <span>내 일정 {{ authStore.isAuthenticated ? savedPlansRemote.length : '—' }}개</span>
        <span class="saved__summary-badge">서버</span>
      </div>
      <div class="saved__summary-item">
        <Heart :size="16" :stroke-width="2.2" />
        <span>추천 코스 찜 {{ authStore.isAuthenticated ? savedTourCourses.length : '—' }}개</span>
        <span class="saved__summary-badge">서버</span>
      </div>
      <div class="saved__summary-item">
        <MapPin :size="16" :stroke-width="2.2" />
        <span>찜한 관광지 {{ authStore.isAuthenticated ? serverAttractions.items.length : '—' }}개</span>
        <span class="saved__summary-badge">서버</span>
      </div>
      <div class="saved__summary-item">
        <CalendarDays :size="16" :stroke-width="2.2" />
        <span>저장한 행사 {{ authStore.isAuthenticated ? serverEvents.items.length : '—' }}개</span>
        <span class="saved__summary-badge">서버</span>
      </div>
    </section>

    <section class="saved__tabs" role="tablist" aria-label="저장함 구분">
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
        <span v-if="tab.hint" class="saved__tab-hint">{{ tab.hint }}</span>
      </button>
    </section>

    <section class="saved__list">
      <!-- 내 일정: 서버 user_saved_plans -->
      <template v-if="activeTab === 'plan'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">로그인이 필요해요</h2>
          <p class="saved-card__route">AI로 만든 일정은 계정에 저장되며, 여기서 모아볼 수 있어요.</p>
        </div>
        <div v-else-if="savedPlansLoading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">불러오는 중…</h2>
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
              <h2 class="saved-card__title">{{ p.title || '저장 일정' }}</h2>
            </div>
            <p v-if="formatSavedPlanDate(p.savedAt)" class="saved-card__route">
              <CalendarDays :size="14" :stroke-width="2.2" />
              <span>저장 {{ formatSavedPlanDate(p.savedAt) }}</span>
            </p>
            <button type="button" class="saved-card__cta" @click="openSavedPlan(p.id)">
              일정 보기
            </button>
          </article>
        </template>
        <article v-else class="saved-card saved-card--empty">
          <h2 class="saved-card__title">아직 내 일정이 없어요</h2>
          <p class="saved-card__route">AI 일정 결과 화면에서 「코스 저장」으로 추가해 보세요.</p>
        </article>
      </template>

      <!-- 공식 추천 코스 찜: user_saved_courses → tour_courses -->
      <template v-else-if="activeTab === 'home_course'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">로그인이 필요해요</h2>
          <p class="saved-card__route">디스커버의 「추천 여행 코스」 찜은 user_saved_courses에 저장됩니다.</p>
        </div>
        <div v-else-if="savedTourCoursesLoading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">불러오는 중…</h2>
        </div>
        <p v-else-if="savedTourCoursesError" class="saved-card saved-card--error">
          {{ savedTourCoursesError }}
        </p>
        <template v-else-if="savedTourCourses.length">
          <article
            v-for="item in savedTourCourses"
            :key="item.id"
            class="saved-card"
          >
            <h2 class="saved-card__title">{{ item.title || '추천 코스' }}</h2>
            <p v-if="item.hashtags" class="saved-card__route">
              <Heart :size="14" :stroke-width="2.2" />
              <span>{{ item.hashtags }}</span>
            </p>
            <div v-if="hashtagLineTags(item.hashtags).length" class="saved-card__tags">
              <span
                v-for="tag in hashtagLineTags(item.hashtags)"
                :key="tag"
                class="saved-card__tag"
              >#{{ tag }}</span>
            </div>
          </article>
        </template>
        <article v-else class="saved-card saved-card--empty">
          <h2 class="saved-card__title">찜한 추천 코스가 없어요</h2>
          <p class="saved-card__route">디스커버에서 「추천 여행 코스」 카드의 하트를 눌러 보세요.</p>
        </article>
      </template>

      <!-- 관광지: 서버 user_saved_attractions -->
      <template v-else-if="activeTab === 'place'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">로그인이 필요해요</h2>
          <p class="saved-card__route">관광지 상세에서 하트(찜)를 누르면 계정에 저장됩니다.</p>
        </div>
        <div v-else-if="serverAttractions.loading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">불러오는 중…</h2>
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
                  저장 {{ formatSavedPlanDate(a.savedAt) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="saved-card__cta saved-card__cta--secondary"
              @click="router.push({ name: 'attraction-detail', params: { id: String(a.id) } })"
            >
              상세 보기
            </button>
          </article>
        </template>
        <article v-else class="saved-card saved-card--empty">
          <h2 class="saved-card__title">찜한 관광지가 없어요</h2>
          <p class="saved-card__route">관광지 상세 화면에서 하트를 눌러 저장해 보세요.</p>
        </article>
      </template>

      <!-- 행사: 서버 user_saved_events -->
      <template v-else-if="activeTab === 'event'">
        <div v-if="!authStore.isAuthenticated" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">로그인이 필요해요</h2>
          <p class="saved-card__route">행사 상세에서 하트(저장)를 누르면 계정에 저장됩니다.</p>
        </div>
        <div v-else-if="serverEvents.loading" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">불러오는 중…</h2>
        </div>
        <article v-else v-for="item in activeItems" :key="item.contentId" class="saved-card">
          <h2 class="saved-card__title">
            {{ item.title || '행사' }}
          </h2>
          <p class="saved-card__route">
            <CalendarDays :size="14" :stroke-width="2.2" />
            <span>{{ item.eventStartDate && item.eventEndDate ? `${item.eventStartDate} ~ ${item.eventEndDate}` : '기간 정보 없음' }}</span>
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
            상세 보기
          </button>
        </article>

        <article v-if="authStore.isAuthenticated && !serverEvents.loading && !activeItems.length" class="saved-card saved-card--empty">
          <h2 class="saved-card__title">아직 저장된 행사가 없어요</h2>
          <p class="saved-card__route">행사 상세에서 하트를 눌러 저장해 보세요.</p>
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
