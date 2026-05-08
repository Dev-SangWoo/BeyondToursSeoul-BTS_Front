<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
} from 'lucide-vue-next'
import { IsIcon } from '@ratoufa/iconsax-vue'
import AIInputSheet from '@/components/ai/AIInputSheet.vue'
import { useSavedStore } from '@/stores/useSavedStore'
import { fetchAttractions } from '@/services/attractionService'
import { fetchEvents } from '@/services/eventService'
import earthImage from '../../asset/earth.png'
import airplaneImage from '../../asset/airplane.png'

const router = useRouter()
const route = useRoute()
const savedStore = useSavedStore()
const showAISheet = ref(false)
const activeCategory = ref(null)
const courseDensityIndex = ref(2)
const courseTrackRef = ref(null)
const activeCourseIndex = ref(0)

const headerLiveInfo = [
  { id: 'weather', icon: 'sun-1', label: '날씨', value: '22℃ / 맑음 봄' },
  { id: 'crowd', icon: 'location', label: '혼잡도', value: '성수동 보통' },
  { id: 'fx', icon: 'dollar-circle', label: '환율', value: '1USD = 1,350₩' },
]

const realtimeHotPlaces = [
  { id: 1, name: '성수동', image: 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=500&q=80' },
  { id: 2, name: '망원동', image: 'https://images.unsplash.com/photo-1538485399081-7c8970b2f31f?auto=format&fit=crop&w=500&q=80' },
  { id: 3, name: '익선동', image: 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=500&q=80' },
  { id: 4, name: '을지로', image: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=500&q=80' },
  { id: 5, name: '연남동', image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=500&q=80' },
]

const categories = [
  { id: '음식',         icon: 'cup',             color: '#f97316', label: '음식' },
  { id: '쇼핑',         icon: 'shop',            color: '#ec4899', label: '쇼핑' },
  { id: '체험관광',      icon: 'people',          color: '#8b5cf6', label: '체험관광' },
  { id: '자연관광',      icon: 'tree',            color: '#16a34a', label: '자연관광' },
  { id: '문화관광',      icon: 'courthouse',      color: '#a16207', label: '문화관광' },
  { id: '역사관광',      icon: 'building',        color: '#78716c', label: '역사관광' },
  { id: '레저스포츠',    icon: 'activity',        color: '#2563eb', label: '레저스포츠' },
]

const densityModes = [
  { id: 'local0',      text: '유명 관광지 완전 위주', scoreMin: 0,    scoreMax: 0 },
  { id: 'local1-30',   text: '관광지 중심, 로컬 가미', scoreMin: 0.01, scoreMax: 0.30 },
  { id: 'local31-50',  text: '관광지 & 로컬 균형',    scoreMin: 0.31, scoreMax: 0.50 },
  { id: 'local51-70',  text: '로컬 핀 중심, 관광지 가미', scoreMin: 0.51, scoreMax: 0.70 },
  { id: 'local71-100', text: '완전 로컬 핀 위주',      scoreMin: 0.71, scoreMax: 1.0 },
]

const densityCourseMap = {
  'local0': [
    { id: 'm1', title: '서울 핵심 랜드마크 1일', route: '경복궁 → 북촌 → 명동 → 남산타워', tags: ['랜드마크', '사진', '첫 서울'] },
    { id: 'm2', title: '궁궐·한강 클래식 코스', route: '창덕궁 → 인사동 → 광화문 → 여의도 한강', tags: ['전통', '도심', '야경'] },
    { id: 'm3', title: '서울 하이라이트 2일', route: 'DDP → 청계천 → 홍대 → 잠실 롯데월드타워', tags: ['핫플', '쇼핑', '전망'] },
  ],
  'local1-30': [
    { id: 'g1', title: '관광지+로컬 골목 혼합 1일', route: '경복궁 → 통인시장 → 서촌 카페거리', tags: ['관광', '로컬', '미식'] },
    { id: 'g2', title: '한강 감성 데이', route: '남산 → 망원한강공원 → 망원시장', tags: ['산책', '시장', '감성'] },
    { id: 'g3', title: '도심+동네 탐방', route: '명동 → 을지로 골목 → 충무로', tags: ['도심', '카페', '로컬바'] },
  ],
  'local31-50': [
    { id: 'b1', title: '서울 밸런스 베스트', route: '북촌 → 익선동 → 성수 팝업', tags: ['균형', '핫플', '로컬'] },
    { id: 'b2', title: '문화·로컬 믹스 코스', route: '국립중앙박물관 → 용산 → 한남', tags: ['문화', '트렌디', '미식'] },
    { id: 'b3', title: '낮밤 완성 코스', route: '인사동 → 을지로 → 한강 야경', tags: ['전통', '힙지로', '야경'] },
  ],
  'local51-70': [
    { id: 'l1', title: '동네 바이브 투어', route: '망원 → 연남 → 연희동', tags: ['동네', '카페', '산책'] },
    { id: 'l2', title: '로컬 마켓 데이', route: '경동시장 → 청량리 → 회기', tags: ['시장', '현지식', '가성비'] },
    { id: 'l3', title: '서울 골목 깊게보기', route: '서촌 골목 → 부암동 → 평창동', tags: ['골목', '조용함', '뷰'] },
  ],
  'local71-100': [
    { id: 'p1', title: '찐로컬 하루 코스', route: '응암 → 불광천 → 연신내', tags: ['찐로컬', '산책', '먹거리'] },
    { id: 'p2', title: '서울 외곽 감성 루트', route: '우이동 → 수유 → 미아', tags: ['로컬', '힐링', '저밀도'] },
    { id: 'p3', title: '로컬 라이프 체험', route: '장위동 → 석계 → 월계', tags: ['생활권', '숨은맛집', '느긋함'] },
  ],
}

const coursePhotoGradients = [
  'linear-gradient(160deg, #2c1810 0%, #4a2c1a 40%, #1a0f08 100%)',
  'linear-gradient(160deg, #0d1f3a 0%, #1a3a5c 40%, #0a1525 100%)',
  'linear-gradient(160deg, #1a1208 0%, #3d2e12 40%, #0f0c05 100%)',
  'linear-gradient(160deg, #1c1c2e 0%, #2d2d44 40%, #0f0f1a 100%)',
]

const coursePhotos = [
  'https://images.unsplash.com/photo-1538485399081-7c8970b2f31f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
]
const currentCourses = computed(
  () => densityCourseMap[densityModes[courseDensityIndex.value].id] ?? [],
)

function getHomeCourseRefId(course) {
  return `course:${densityModes[courseDensityIndex.value].id}:${course.id}`
}

function isCourseSaved(course) {
  return savedStore.isSaved('course', getHomeCourseRefId(course))
}

function toggleSaveCourse(course) {
  savedStore.toggleCourseFromHome({
    course,
    densityModeId: densityModes[courseDensityIndex.value].id,
  })
}

function changeCourseDensity(delta) {
  const last = densityModes.length - 1
  const next = Math.max(0, Math.min(last, courseDensityIndex.value + delta))
  courseDensityIndex.value = next
}

function onCourseTrackScroll(e) {
  const el = e.target
  const card = el.querySelector('.discover-course-card')
  if (!card) return
  const style = window.getComputedStyle(el)
  const gap = parseFloat(style.columnGap || style.gap || '0') || 0
  const unit = card.clientWidth + gap
  if (!unit) return
  activeCourseIndex.value = Math.round(el.scrollLeft / unit)
}

function scrollToCourse(index) {
  const el = courseTrackRef.value
  if (!el) return
  const card = el.querySelector('.discover-course-card')
  if (!card) return
  const style = window.getComputedStyle(el)
  const gap = parseFloat(style.columnGap || style.gap || '0') || 0
  const unit = card.clientWidth + gap
  el.scrollTo({ left: unit * index, behavior: 'smooth' })
  activeCourseIndex.value = index
}

watch(courseDensityIndex, () => {
  activeCourseIndex.value = 0
  courseTrackRef.value?.scrollTo({ left: 0, behavior: 'auto' })
})

const attractions = ref([])
const attractionsLoading = ref(false)
const attractionsError = ref(null)

onMounted(async () => {
  attractionsLoading.value = true
  try {
    attractions.value = await fetchAttractions()
  } catch (e) {
    attractionsError.value = e.message
  } finally {
    attractionsLoading.value = false
  }
})

const filteredAttractions = computed(() => {
  const mode = densityModes[courseDensityIndex.value]
  let list = attractions.value

  if (mode.id === 'local0') {
    list = list.filter((a) => Number(a.score) === 0)
  } else {
    list = list.filter((a) => {
      const s = Number(a.score)
      return s >= mode.scoreMin && s <= mode.scoreMax
    })
  }

  if (activeCategory.value) {
    list = list.filter((a) => a.cat1Name === activeCategory.value)
  }

  return list
})

const PAGE_SIZE = 10
const attractionPage = ref(1)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAttractions.value.length / PAGE_SIZE)))

const pagedAttractions = computed(() => {
  const start = (attractionPage.value - 1) * PAGE_SIZE
  return filteredAttractions.value.slice(start, start + PAGE_SIZE)
})

// 1 ... 4 5 6 ... 12 형태로 표시할 페이지 번호 배열 (숫자 or '...')
const pageItems = computed(() => {
  const total = totalPages.value
  const cur = attractionPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const items = []
  const addPage = (p) => items.push(p)
  const addDot = () => { if (items[items.length - 1] !== '...') items.push('...') }

  addPage(1)
  if (cur > 3) addDot()
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) addPage(p)
  if (cur < total - 2) addDot()
  addPage(total)

  return items
})

function selectCategory(id) {
  activeCategory.value = activeCategory.value === id ? null : id
  attractionPage.value = 1
}

// density 바꿀 때도 1페이지로 리셋
watch(courseDensityIndex, () => {
  attractionPage.value = 1
})

const homeListTab = ref('attractions')
const events = ref([])
const eventsLoading = ref(false)
const eventsError = ref(null)
const eventsFetchAttempted = ref(false)
const eventPage = ref(1)

watch(homeListTab, (tab) => {
  if (tab === 'attractions') attractionPage.value = 1
  if (tab === 'events') {
    eventPage.value = 1
    ensureEventsLoaded()
  }
})

async function ensureEventsLoaded() {
  if (eventsFetchAttempted.value) return
  eventsFetchAttempted.value = true
  eventsLoading.value = true
  eventsError.value = null
  try {
    const data = await fetchEvents()
    events.value = Array.isArray(data) ? data : []
  } catch (e) {
    eventsError.value = e.message
    events.value = []
    eventsFetchAttempted.value = false
  } finally {
    eventsLoading.value = false
  }
}

function formatTourYmd(ymd) {
  const s = ymd != null ? String(ymd).trim() : ''
  if (s.length !== 8 || !/^\d{8}$/.test(s)) return s || '—'
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`
}

function eventDateLabel(ev) {
  const a = formatTourYmd(ev.eventStartDate)
  const b = formatTourYmd(ev.eventEndDate)
  if (a === b) return a
  return `${a} ~ ${b}`
}

const totalEventPages = computed(() => Math.max(1, Math.ceil(events.value.length / PAGE_SIZE)))

const pagedEvents = computed(() => {
  const start = (eventPage.value - 1) * PAGE_SIZE
  return events.value.slice(start, start + PAGE_SIZE)
})

const eventPageItems = computed(() => {
  const total = totalEventPages.value
  const cur = eventPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const items = []
  const addDot = () => {
    if (items[items.length - 1] !== '...') items.push('...')
  }

  items.push(1)
  if (cur > 3) addDot()
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) items.push(p)
  if (cur < total - 2) addDot()
  items.push(total)
  return items
})

function goToAttraction(id) {
  router.push({ name: 'attraction-detail', params: { id } })
}

function goToEvent(contentId) {
  const sid = contentId != null ? String(contentId).trim() : ''
  if (!sid) return
  router.push({ name: 'event-detail', params: { id: sid } })
}

function onCourseGenerated() {
  showAISheet.value = false
  router.push('/result')
}

function closeAISheet() {
  showAISheet.value = false
  if (route.path === '/ai') router.replace('/discover')
}

watch(
  () => route.path,
  (path) => {
    if (path === '/ai') showAISheet.value = true
  },
  { immediate: true },
)
</script>

<template>
  <div class="discover">

    <!-- ── Header ─────────────────────────────────────────────────────── -->
    <header class="discover__header">
      <div class="discover__header-bg" aria-hidden="true">
        <div class="discover-flight discover-flight--header">
          <div class="discover-flight__track">
            <img class="discover-flight__earth" :src="earthImage" alt="" />
            <img class="discover-flight__plane" :src="airplaneImage" alt="" />
          </div>
        </div>
      </div>
      <div class="discover__header-content">
        <div class="discover__brand">
          <span class="discover__brand-bts">BTS</span>
          <span class="discover__brand-sub">Beyond Tours Seoul</span>
        </div>
        <div class="discover__header-right">
          <button class="discover__icon-btn" aria-label="알림">
            <Bell :size="20" :stroke-width="2" />
            <span class="discover__notif-dot"></span>
          </button>
          <div class="discover__avatar">
            <IsIcon name="profile-circle" variant="twotone" :size="18" />
          </div>
        </div>
      </div>
    </header>

    <!-- ── Greeting ───────────────────────────────────────────────────── -->
    <div class="discover__greeting">
      <div class="discover__greeting-row">
        <div class="discover__greeting-copy">
          <h2 class="discover__greeting-title">Hi, Explorer! 🔥</h2>
          <p class="discover__greeting-sub">오늘 서울은 어디가 핫할까요?</p>
        </div>
        <aside class="discover__live-brief" aria-label="실시간 핵심 정보">
          <IsIcon
            name="wifi"
            variant="bulk"
            class="discover__live-brief-icon"
            :size="12"
            aria-hidden="true"
          />
          <div class="discover__live-list">
            <p
              v-for="item in headerLiveInfo"
              :key="item.id"
              class="discover__live-line"
            >
              <IsIcon :name="item.icon" variant="bulk" class="discover__live-item-icon" :size="10" />
              <span class="discover__live-label">{{ item.label }}</span>
              <span class="discover__live-value">{{ item.value }}</span>
            </p>
          </div>
        </aside>
      </div>
    </div>

    <!-- ── Density Selector ──────────────────────────────────────────── -->
    <div class="discover__density-bar">
      <p class="discover__density-bar-label">여행 스타일</p>
      <div class="discover__density-bar-control">
        <button
          class="discover__density-arrow"
          :disabled="courseDensityIndex === 0"
          aria-label="이전"
          @click="changeCourseDensity(-1)"
        >
          <ChevronLeft :size="16" :stroke-width="2.5" />
        </button>
        <div class="discover__density-bar-track">
          <button
            v-for="(mode, i) in densityModes"
            :key="mode.id"
            class="discover__density-pip"
            :class="{ 'discover__density-pip--active': courseDensityIndex === i }"
            :aria-label="mode.text"
            @click="courseDensityIndex = i"
          />
        </div>
        <button
          class="discover__density-arrow"
          :disabled="courseDensityIndex === densityModes.length - 1"
          aria-label="다음"
          @click="changeCourseDensity(1)"
        >
          <ChevronRight :size="16" :stroke-width="2.5" />
        </button>
      </div>
      <p class="discover__density-bar-text">{{ densityModes[courseDensityIndex].text }}</p>
    </div>

    <!-- ── Hot Areas ──────────────────────────────────────────────────── -->
    <section class="discover__section">
      <h3 class="discover__section-title">추천 여행 코스</h3>
      <div
        ref="courseTrackRef"
        class="discover__course-carousel"
        @scroll.passive="onCourseTrackScroll"
      >
        <article
          v-for="(course, i) in currentCourses"
          :key="course.id"
          class="discover-course-card"
          :style="{
            backgroundImage: `${coursePhotoGradients[i % coursePhotoGradients.length]}, url(${coursePhotos[i % coursePhotos.length]})`,
          }"
        >
          <div class="discover-course-card__photo-overlay"></div>
          <button
            class="discover-course-card__save-btn"
            :class="{ 'discover-course-card__save-btn--active': isCourseSaved(course) }"
            type="button"
            :aria-label="isCourseSaved(course) ? '저장 해제' : '저장하기'"
            @click.stop="toggleSaveCourse(course)"
          >
            <Heart :size="14" :stroke-width="2.3" />
          </button>
          <p class="discover-course-card__title">{{ course.title }}</p>
          <p class="discover-course-card__route">{{ course.route }}</p>
          <div class="discover-course-card__tags">
            <span
              v-for="tag in course.tags"
              :key="tag"
              class="discover-course-card__tag"
            >
              #{{ tag }}
            </span>
          </div>
        </article>
      </div>
      <div class="discover__course-dots">
        <button
          v-for="(_, i) in currentCourses"
          :key="i"
          class="discover__course-dot"
          :class="{ 'discover__course-dot--active': activeCourseIndex === i }"
          :aria-label="`${i + 1}번 코스로 이동`"
          @click="scrollToCourse(i)"
        />
      </div>
    </section>

    <!-- ── Real-time Hot Places ───────────────────────────────────────── -->
    <section class="discover__section">
      <h3 class="discover__section-title">실시간 핫플레이스 순위</h3>
      <div class="discover__hot-rank-row">
        <article
          v-for="place in realtimeHotPlaces"
          :key="place.id"
          class="hot-rank-item"
        >
          <div class="hot-rank-item__thumb-wrap">
            <img class="hot-rank-item__thumb" :src="place.image" alt="" />
            <span class="hot-rank-item__badge">{{ place.id }}</span>
          </div>
          <p class="hot-rank-item__name">{{ place.name }}</p>
        </article>
      </div>
    </section>

    <!-- ── Theme Categories & listings ──────────────────────────────── -->
    <section class="discover__section discover__section--last">
      <div class="discover__list-heading">
        <h3 class="discover__section-title">
          {{ homeListTab === 'attractions' ? '테마별 추천' : '축제 · 행사' }}
        </h3>
        <div class="discover__home-tabs" role="tablist" aria-label="목록 유형">
          <button
            type="button"
            role="tab"
            class="discover__home-tab"
            :class="{ 'discover__home-tab--active': homeListTab === 'attractions' }"
            :aria-selected="homeListTab === 'attractions'"
            @click="homeListTab = 'attractions'"
          >
            관광지
          </button>
          <button
            type="button"
            role="tab"
            class="discover__home-tab"
            :class="{ 'discover__home-tab--active': homeListTab === 'events' }"
            :aria-selected="homeListTab === 'events'"
            @click="homeListTab = 'events'"
          >
            행사
          </button>
        </div>
      </div>

      <div v-show="homeListTab === 'attractions'" class="discover__category-row">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="cat-btn"
          :class="{ 'cat-btn--active': activeCategory === cat.id }"
          @click="selectCategory(cat.id)"
        >
          <IsIcon
            :name="cat.icon"
            class="cat-btn__icon"
            :variant="activeCategory === cat.id ? 'bulk' : 'twotone'"
            :size="22"
            :color="cat.color"
          />
          <span class="cat-btn__label">{{ cat.label }}</span>
        </button>
      </div>

      <div class="discover__attractions">
        <template v-if="homeListTab === 'attractions'">
          <div v-if="attractionsLoading" class="discover__attractions-loading">
            <div class="discover__attractions-spinner"></div>
            <span>관광지 목록 불러오는 중...</span>
          </div>

          <p v-else-if="attractionsError" class="discover__attractions-error">
            {{ attractionsError }}
          </p>

          <p v-else-if="filteredAttractions.length === 0" class="discover__attractions-empty">
            해당 카테고리의 관광지가 없습니다.
          </p>

          <template v-else>
            <button
              v-for="attraction in pagedAttractions"
              :key="attraction.id"
              type="button"
              class="attraction-card"
              @click="goToAttraction(attraction.id)"
            >
              <div class="attraction-card__thumb-wrap">
                <img
                  v-if="attraction.imageUrl || attraction.image_url || attraction.thumbnail"
                  class="attraction-card__thumb"
                  :src="attraction.imageUrl || attraction.image_url || attraction.thumbnail"
                  :alt="attraction.name"
                />
                <div v-else class="attraction-card__thumb-placeholder"></div>
              </div>
              <div class="attraction-card__info">
                <p class="attraction-card__name">{{ attraction.name }}</p>
                <p v-if="attraction.address" class="attraction-card__address">
                  <MapPin :size="11" :stroke-width="2" class="attraction-card__pin" />
                  {{ attraction.address }}
                </p>
                <div class="attraction-card__meta">
                  <span v-if="attraction.cat1Name" class="attraction-card__cat">
                    {{ attraction.cat1Name }}
                  </span>
                </div>
              </div>
              <ChevronRight :size="16" :stroke-width="2.2" class="attraction-card__arrow" />
            </button>

            <div v-if="totalPages > 1" class="discover__pagination">
              <button
                type="button"
                class="discover__pg-arrow"
                :disabled="attractionPage === 1"
                aria-label="이전"
                @click="attractionPage--"
              >
                <ChevronLeft :size="14" :stroke-width="2.5" />
              </button>

              <template v-for="(item, pi) in pageItems" :key="'a-' + pi + '-' + item">
                <span v-if="item === '...'" class="discover__pg-ellipsis">…</span>
                <button
                  v-else
                  type="button"
                  class="discover__pg-num"
                  :class="{ 'discover__pg-num--active': attractionPage === item }"
                  @click="attractionPage = item"
                >
                  {{ item }}
                </button>
              </template>

              <button
                type="button"
                class="discover__pg-arrow"
                :disabled="attractionPage === totalPages"
                aria-label="다음"
                @click="attractionPage++"
              >
                <ChevronRight :size="14" :stroke-width="2.5" />
              </button>
            </div>
          </template>
        </template>

        <template v-else>
          <div v-if="eventsLoading" class="discover__attractions-loading">
            <div class="discover__attractions-spinner"></div>
            <span>행사 목록 불러오는 중...</span>
          </div>

          <p v-else-if="eventsError" class="discover__attractions-error">
            {{ eventsError }}
          </p>

          <p v-else-if="events.length === 0" class="discover__attractions-empty">
            표시할 행사가 없습니다.
          </p>

          <template v-else>
            <button
              v-for="ev in pagedEvents"
              :key="ev.contentId"
              type="button"
              class="attraction-card attraction-card--event"
              @click="goToEvent(ev.contentId)"
            >
              <div class="attraction-card__thumb-wrap">
                <img
                  v-if="ev.firstImage && String(ev.firstImage).trim()"
                  class="attraction-card__thumb"
                  :src="ev.firstImage"
                  :alt="ev.title"
                />
                <div v-else class="attraction-card__thumb-placeholder"></div>
              </div>
              <div class="attraction-card__info">
                <p class="attraction-card__name">{{ ev.title }}</p>
                <p v-if="ev.address" class="attraction-card__address">
                  <MapPin :size="11" :stroke-width="2" class="attraction-card__pin" />
                  {{ ev.address }}
                </p>
                <div class="attraction-card__meta">
                  <span class="attraction-card__cat attraction-card__cat--muted">
                    {{ eventDateLabel(ev) }}
                  </span>
                </div>
              </div>
              <ChevronRight :size="16" :stroke-width="2.2" class="attraction-card__arrow" />
            </button>

            <div v-if="totalEventPages > 1" class="discover__pagination">
              <button
                type="button"
                class="discover__pg-arrow"
                :disabled="eventPage === 1"
                aria-label="이전"
                @click="eventPage--"
              >
                <ChevronLeft :size="14" :stroke-width="2.5" />
              </button>

              <template v-for="(item, ei) in eventPageItems" :key="'e-' + ei + '-' + item">
                <span v-if="item === '...'" class="discover__pg-ellipsis">…</span>
                <button
                  v-else
                  type="button"
                  class="discover__pg-num"
                  :class="{ 'discover__pg-num--active': eventPage === item }"
                  @click="eventPage = item"
                >
                  {{ item }}
                </button>
              </template>

              <button
                type="button"
                class="discover__pg-arrow"
                :disabled="eventPage === totalEventPages"
                aria-label="다음"
                @click="eventPage++"
              >
                <ChevronRight :size="14" :stroke-width="2.5" />
              </button>
            </div>
          </template>
        </template>
      </div>
    </section>

    <!-- ── Bottom Nav (4 items) ───────────────────────────────────────── -->
    <nav class="discover__nav">
      <button class="nav-btn nav-btn--active" aria-label="홈">
        <span class="nav-btn__icon-wrap">
          <IsIcon name="home" class="nav-btn__icon" variant="bulk" :size="19" />
        </span>
        <span>홈</span>
      </button>

      <button class="nav-btn" aria-label="지도">
        <span class="nav-btn__icon-wrap">
          <IsIcon name="map" class="nav-btn__icon" variant="twotone" :size="19" />
        </span>
        <span>지도</span>
      </button>

      <button class="nav-btn nav-btn--center" aria-label="AI 여행 코스 짜기" @click="showAISheet = true">
        <span class="nav-btn__icon-wrap">
          <IsIcon name="magic-star" class="nav-btn__icon" variant="bulk" :size="19" />
        </span>
        <span>AI 코스</span>
      </button>

      <button class="nav-btn" aria-label="저장함">
        <span class="nav-btn__icon-wrap">
          <IsIcon name="bookmark" class="nav-btn__icon" variant="twotone" :size="19" />
        </span>
        <span>저장함</span>
      </button>

      <button class="nav-btn" aria-label="마이">
        <span class="nav-btn__icon-wrap">
          <IsIcon name="profile-circle" class="nav-btn__icon" variant="twotone" :size="19" />
        </span>
        <span>마이</span>
      </button>
    </nav>

    <!-- ── AI Sheet ───────────────────────────────────────────────────── -->
    <AIInputSheet
      v-if="showAISheet"
      @close="closeAISheet"
      @generated="onCourseGenerated"
    />
  </div>
</template>

<style scoped>
/* ─── Root ───────────────────────────────────────────────────────────────── */
.discover {
  min-height: 100dvh;
  background: #f5f4f0;
  padding-bottom: 80px;
  position: relative;
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.discover__header {
  position: sticky;
  top: 0;
  z-index: 30;
  overflow: hidden;
  background: linear-gradient(110deg, #ffb23f 0%, #fe9c00 48%, #ff8f00 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.28);
}

.discover__header-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
}

.discover__header-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 10%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 48%),
    linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
}

.discover__brand { display: flex; flex-direction: column; line-height: 1.1; }

.discover__brand-bts {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.14);
}

.discover__brand-sub {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.88);
  letter-spacing: 0.02em;
}

.discover__header-right { display: flex; align-items: center; gap: 12px; }

.discover__icon-btn {
  position: relative;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.discover__notif-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
  border: 1.5px solid #fff;
}

.discover__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  border: 2px solid rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* ─── Greeting ───────────────────────────────────────────────────────────── */
.discover__greeting {
  padding: 18px 20px 12px;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;
}

.discover__greeting-row {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 12px;
}

.discover__greeting-copy {
  flex: 1;
  min-width: 0;
}

.discover__greeting-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0 0 3px;
}

.discover__greeting-sub {
  font-size: 14px;
  color: #888;
  margin: 0;
}

.discover__live-brief {
  width: min(41vw, 176px);
  min-width: 138px;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 6px 8px;
  border-radius: 10px;
  background: linear-gradient(180deg, #fffaf1 0%, #fff 100%);
  border: 1px solid #ffe6bc;
  margin-left: auto;
}

.discover__live-brief-icon {
  font-size: 12px;
  line-height: 1;
  color: #9a9a9a;
  margin-top: 2px;
}

.discover__live-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.discover__live-label {
  font-size: 9px;
  color: #9a9a9a;
  font-weight: 700;
  margin-right: 5px;
  flex-shrink: 0;
}

.discover__live-value {
  font-size: 10px;
  color: #444;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.discover__live-line {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  line-height: 1.2;
}

.discover__live-item-icon {
  color: #8f8f8f;
  flex-shrink: 0;
  margin-right: 2px;
}

.discover-flight {
  width: 120px;
  height: 56px;
  border-radius: 10px;
  background: linear-gradient(180deg, #fff8ec 0%, #fff 100%);
  border: 1px solid #ffe2b0;
  overflow: hidden;
}

.discover-flight--header {
  position: absolute;
  right: -8px;
  top: -12px;
  width: 180px;
  height: 86px;
  border-radius: 0;
  background: transparent;
  border: none;
  opacity: 0.96;
}

.discover-flight__track {
  position: relative;
  width: 100%;
  height: 100%;
}

.discover-flight__earth {
  position: absolute;
  width: 108px;
  height: 108px;
  left: -32px;
  top: 18px;
  object-fit: contain;
  animation: discover-earth-rotate 16s linear infinite;
}

.discover-flight--header .discover-flight__earth {
  width: 136px;
  height: 136px;
  left: 22px;
  top: -24px;
  opacity: 0.92;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.12));
}

.discover-flight__plane {
  position: absolute;
  width: 32px;
  height: 32px;
  left: 10px;
  top: 12px;
  object-fit: contain;
  animation: discover-plane-fly 2.2s ease-in-out infinite;
}

.discover-flight--header .discover-flight__plane {
  width: 34px;
  height: 34px;
  left: 42px;
  top: 16px;
}

@keyframes discover-earth-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes discover-plane-fly {
  0% { transform: translateX(0) translateY(2px) rotate(-8deg); opacity: 0.9; }
  50% { transform: translateX(44px) translateY(-8px) rotate(2deg); opacity: 1; }
  100% { transform: translateX(82px) translateY(2px) rotate(8deg); opacity: 0.95; }
}

/* ─── Sections ───────────────────────────────────────────────────────────── */
.discover__section {
  padding: 20px 20px 0;
  background: #fff;
  margin-top: 8px;
}

.discover__section--last {
  padding-bottom: 20px;
}

.discover__section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 10px;
}

.discover__section-title {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0 0 14px;
}

.discover__list-heading {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.discover__list-heading .discover__section-title {
  margin-bottom: 0;
}

.discover__home-tabs {
  display: flex;
  padding: 3px;
  background: #efefed;
  border-radius: 12px;
  gap: 2px;
}

.discover__home-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #666;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.discover__home-tab--active {
  background: #fff;
  color: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.discover__home-tab:focus-visible {
  outline: 2px solid #fe9c00;
  outline-offset: 2px;
}

/* ─── Density bar (standalone) ───────────────────────────────────────────── */
.discover__density-bar {
  background: linear-gradient(110deg, #ffb23f 0%, #fe9c00 48%, #ff8f00 100%);
  padding: 14px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.discover__density-bar-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.discover__density-bar-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.discover__density-arrow {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  backdrop-filter: blur(4px);
}

.discover__density-arrow:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.3);
}

.discover__density-arrow:not(:disabled):active {
  transform: scale(0.92);
}

.discover__density-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.discover__density-bar-track {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  position: relative;
  padding: 8px 0;
}

.discover__density-bar-track::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.discover__density-pip {
  position: relative;
  z-index: 1;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s, border-color 0.15s, transform 0.12s;
  flex-shrink: 0;
}

.discover__density-pip:hover {
  background: rgba(255, 255, 255, 0.55);
}

.discover__density-pip--active {
  width: 18px;
  height: 18px;
  background: #fff;
  border-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.discover__density-bar-text {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  letter-spacing: -0.2px;
}

.discover__course-carousel {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding-bottom: 4px;
  touch-action: pan-x;
}

.discover__course-carousel::-webkit-scrollbar { display: none; }

.discover__course-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
}

.discover__course-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: none;
  background: #ddd;
  cursor: pointer;
  padding: 0;
  transition: width 0.2s ease, background 0.2s ease;
}

.discover__course-dot--active {
  width: 18px;
  border-radius: 3px;
  background: #fe9c00;
}

.discover-course-card {
  position: relative;
  min-width: min(58vw, 220px);
  height: 262px;
  scroll-snap-align: start;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  overflow: hidden;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-blend-mode: soft-light;
}

.discover-course-card__photo-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.12) 0%,
    rgba(0, 0, 0, 0.08) 35%,
    rgba(0, 0, 0, 0.58) 74%,
    rgba(0, 0, 0, 0.84) 100%
  );
  pointer-events: none;
}

.discover-course-card__save-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.38);
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
}

.discover-course-card__save-btn:active {
  transform: scale(0.93);
}

.discover-course-card__save-btn--active {
  background: rgba(254, 156, 0, 0.94);
  border-color: rgba(255, 233, 194, 0.95);
}

.discover-course-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.45);
  position: relative;
  z-index: 1;
}

.discover-course-card__route {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.45;
  position: relative;
  z-index: 1;
}

.discover-course-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.discover-course-card__tag {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 4px 8px;
  backdrop-filter: blur(2px);
}

/* ─── Real-time hot places ─────────────────────────────────────────────── */
.discover__hot-rank-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 20px;
}

.hot-rank-item {
  width: calc((100% - 32px) / 5);
  min-width: 0;
}

.hot-rank-item__thumb-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
}

.hot-rank-item__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid #ffe3ba;
}

.hot-rank-item__badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #fe9c00;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(254, 156, 0, 0.45);
}

.hot-rank-item__name {
  margin: 0;
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #4a4a4a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Category row ───────────────────────────────────────────────────────── */
.discover__category-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}

.discover__category-row::-webkit-scrollbar { display: none; }

.cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 14px 16px 12px;
  background: #fafaf8;
  border: 1.5px solid #efefed;
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
  min-width: 68px;
}

.cat-btn:active { transform: scale(0.93); }

.cat-btn--active {
  border-color: #FE9C00;
  background: #fff8ec;
}

.cat-btn__icon {
  color: currentColor;
  flex-shrink: 0;
}

.cat-btn__label {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

.cat-btn--active .cat-btn__label { color: #c97000; }

/* ─── Attractions list ───────────────────────────────────────────────────── */
.discover__attractions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.discover__attractions-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px 0;
  color: #888;
  font-size: 13px;
}

.discover__attractions-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffe3ba;
  border-top-color: #fe9c00;
  border-radius: 50%;
  animation: discover-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes discover-spin {
  to { transform: rotate(360deg); }
}

.discover__attractions-error,
.discover__attractions-empty {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: #aaa;
}

.discover__attractions-error {
  color: #ef4444;
}

.attraction-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fafaf8;
  border: 1.5px solid #efefed;
  border-radius: 14px;
  padding: 12px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.attraction-card:active {
  transform: scale(0.98);
  background: #fff8ec;
  border-color: #ffe3ba;
}

.attraction-card--event {
  margin: 0;
  width: 100%;
  box-sizing: border-box;
}

.attraction-card__thumb-wrap {
  flex-shrink: 0;
  width: 68px;
  height: 68px;
  border-radius: 10px;
  overflow: hidden;
  background: #efefed;
}

.attraction-card__thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attraction-card__thumb-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e8e6e0 0%, #d4d0c8 100%);
}

.attraction-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attraction-card__name {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attraction-card__address {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attraction-card__pin {
  color: #fe9c00;
  flex-shrink: 0;
}

.attraction-card__meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.attraction-card__cat {
  font-size: 10px;
  font-weight: 700;
  color: #a36b18;
  background: #fff3df;
  border: 1px solid #ffe3ba;
  border-radius: 999px;
  padding: 2px 8px;
}

.attraction-card__cat--muted {
  color: #4b5563;
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.attraction-card__arrow {
  color: #ccc;
  flex-shrink: 0;
}

/* ─── Pagination ─────────────────────────────────────────────────────────── */
.discover__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 0 4px;
}

.discover__pg-arrow {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px solid #e8e6e0;
  background: #fafaf8;
  color: #777;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.discover__pg-arrow:not(:disabled):hover {
  border-color: #ffe3ba;
  background: #fff8ec;
  color: #c97000;
}

.discover__pg-arrow:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.discover__pg-num {
  min-width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1.5px solid #e8e6e0;
  background: #fafaf8;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0 6px;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.discover__pg-num:hover {
  border-color: #ffe3ba;
  background: #fff8ec;
  color: #c97000;
}

.discover__pg-num--active {
  border-color: #fe9c00;
  background: #fe9c00;
  color: #fff;
  font-weight: 800;
}

.discover__pg-ellipsis {
  width: 24px;
  text-align: center;
  font-size: 13px;
  color: #bbb;
  user-select: none;
  line-height: 34px;
}

/* ─── Bottom Nav ─────────────────────────────────────────────────────────── */
.discover__nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  height: 64px;
  background: #fff;
  border-top: 1px solid #efefef;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: max(0px, env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: #c0bdb8;
  padding: 4px 10px;
  transition: color 0.15s ease;
  flex: 1;
}

.nav-btn__icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f4f2ee;
}

.nav-btn__icon {
  display: block;
}

.nav-btn span {
  font-size: 10px;
  font-weight: 600;
}

.nav-btn--active {
  color: #fe9c00;
}

.nav-btn--active .nav-btn__icon-wrap {
  background: #fff1dc;
  box-shadow: inset 0 0 0 1px #ffdca9;
}

.nav-btn--center {
  color: #fe9c00;
}

.nav-btn--center .nav-btn__icon-wrap {
  background: #fe9c00;
  color: #fff;
  box-shadow: 0 4px 10px rgba(254, 156, 0, 0.35);
}
</style>
