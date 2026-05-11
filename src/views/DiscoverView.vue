<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Sparkles,
} from 'lucide-vue-next';
import { IsIcon } from '@ratoufa/iconsax-vue';
import AIInputSheet from '@/components/ai/AIInputSheet.vue';
import AttractionDetailView from '@/views/AttractionDetailView.vue';
import EventDetailView from '@/views/EventDetailView.vue';
import { useAuthStore } from '@/stores/useAuthStore';
import { clearAiSheetSession } from '@/utils/aiSheetSession';
import { fetchAttractionsPage } from '@/services/attractionService';
import { fetchEvents } from '@/services/eventService';
import HotPlacesRanking from '@/components/discover/HotPlacesRanking.vue';
import { fetchSavedPlans } from '@/services/savedPlansService';
import {
  fetchTourCourses,
  toggleTourCourseSave,
} from '@/services/tourCourseService';
import { getApiLangCode } from '@/i18n';
import earthImage from '../../asset/earth.png';
import airplaneImage from '../../asset/airplane.png';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const showAISheet = ref(false);
const selectedAttractionId = ref(null);
const selectedEventId = ref(null);
const activeCategory = ref(null);
const courseDensityIndex = ref(2);
const courseTrackRef = ref(null);
const activeCourseIndex = ref(0);

const categories = computed(() => [
  {
    id: null,
    icon: 'element-4',
    color: '#fe9c00',
    label: t('discover.category.all'),
  },
  {
    id: '음식',
    icon: 'cup',
    color: '#f97316',
    label: t('discover.category.food'),
  },
  {
    id: '쇼핑',
    icon: 'shop',
    color: '#ec4899',
    label: t('discover.category.shopping'),
  },
  {
    id: '체험관광',
    icon: 'people',
    color: '#8b5cf6',
    label: t('discover.category.experience'),
  },
  {
    id: '자연관광',
    icon: 'tree',
    color: '#16a34a',
    label: t('discover.category.nature'),
  },
  {
    id: '문화관광',
    icon: 'courthouse',
    color: '#a16207',
    label: t('discover.category.culture'),
  },
  {
    id: '역사관광',
    icon: 'building',
    color: '#78716c',
    label: t('discover.category.history'),
  },
  {
    id: '레저스포츠',
    icon: 'activity',
    color: '#2563eb',
    label: t('discover.category.leisure'),
  },
]);

const densityModes = computed(() => [
  {
    id: 'local0',
    text: t('discover.densityMode.local0'),
    scoreMin: 0,
    scoreMax: 0,
  },
  {
    id: 'local1-30',
    text: t('discover.densityMode.local1-30'),
    scoreMin: 0.01,
    scoreMax: 0.3,
  },
  {
    id: 'local31-50',
    text: t('discover.densityMode.local31-50'),
    scoreMin: 0.31,
    scoreMax: 0.5,
  },
  {
    id: 'local51-70',
    text: t('discover.densityMode.local51-70'),
    scoreMin: 0.51,
    scoreMax: 0.7,
  },
  {
    id: 'local71-100',
    text: t('discover.densityMode.local71-100'),
    scoreMin: 0.71,
    scoreMax: 1.0,
  },
]);

const personaDensityIndexMap = {
  main100: 0,
  main70: 1,
  balanced: 2,
  local70: 3,
  local100: 4,
};

function applyInitialDensityFromPersona() {
  const pref = authStore.user?.localPreference;
  if (!pref || !(pref in personaDensityIndexMap)) return;
  courseDensityIndex.value = personaDensityIndexMap[pref];
}

const coursePhotoGradients = [
  'linear-gradient(160deg, #2c1810 0%, #4a2c1a 40%, #1a0f08 100%)',
  'linear-gradient(160deg, #0d1f3a 0%, #1a3a5c 40%, #0a1525 100%)',
  'linear-gradient(160deg, #1a1208 0%, #3d2e12 40%, #0f0c05 100%)',
  'linear-gradient(160deg, #1c1c2e 0%, #2d2d44 40%, #0f0f1a 100%)',
];

const coursePhotos = [
  'https://images.unsplash.com/photo-1538485399081-7c8970b2f31f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
];
const tourCourses = ref([]);
const tourCoursesLoading = ref(false);
const tourCoursesError = ref(null);
const savingTourCourseId = ref(null);

function hashtagTags(hashtags) {
  if (hashtags == null || String(hashtags).trim() === '') return [];
  return String(hashtags)
    .split(/[#\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function courseCardBackground(course, index) {
  const grad = coursePhotoGradients[index % coursePhotoGradients.length];
  const img =
    course.featuredImage && String(course.featuredImage).trim()
      ? String(course.featuredImage).trim()
      : coursePhotos[index % coursePhotos.length];
  return `${grad}, url(${img})`;
}

function isTourCourseSaved(course) {
  return course.isSaved === true;
}

async function loadTourCourses() {
  tourCoursesError.value = null;
  tourCoursesLoading.value = true;
  try {
    tourCourses.value = await fetchTourCourses(
      getApiLangCode(),
      authStore.accessToken || null,
    );
  } catch (e) {
    tourCourses.value = [];
    tourCoursesError.value = e?.message || String(e);
  } finally {
    tourCoursesLoading.value = false;
  }
}

async function toggleSaveCourse(course) {
  if (!authStore.accessToken) {
    window.alert?.(t('discover.alert.loginToFavorite'));
    router.push({ name: 'landing' });
    return;
  }
  const cid = course?.id;
  if (cid == null || savingTourCourseId.value != null) return;
  savingTourCourseId.value = cid;
  try {
    const saved = await toggleTourCourseSave(cid, authStore.accessToken);
    const row = tourCourses.value.find((c) => c.id === cid);
    if (row) row.isSaved = saved;
  } catch (e) {
    window.alert?.(e?.message || t('discover.alert.saveFailed'));
  } finally {
    savingTourCourseId.value = null;
  }
}

const savedPlansRemote = ref([]);
const savedPlansLoading = ref(false);
const savedPlansError = ref(null);

function formatSavedPlanDate(iso) {
  if (iso == null || String(iso).trim() === '') return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

async function loadSavedPlansRemote() {
  savedPlansError.value = null;
  if (!authStore.isAuthenticated || !authStore.accessToken) {
    savedPlansRemote.value = [];
    return;
  }
  savedPlansLoading.value = true;
  try {
    savedPlansRemote.value = await fetchSavedPlans(authStore.accessToken);
  } catch (e) {
    savedPlansRemote.value = [];
    savedPlansError.value = e?.message || String(e);
  } finally {
    savedPlansLoading.value = false;
  }
}

watch(
  () => authStore.accessToken,
  () => {
    loadSavedPlansRemote();
    loadTourCourses();
  },
);

watch(locale, () => {
  void loadTourCourses();
});

function openSavedPlan(planId) {
  const sid = planId != null ? String(planId).trim() : '';
  if (!sid) return;
  router.push({ name: 'result', query: { planId: sid } });
}

function onCourseTrackScroll(e) {
  const el = e.target;
  const cards = Array.from(el.querySelectorAll('.discover-course-card'));
  if (!cards.length) return;

  const viewportCenter = el.scrollLeft + el.clientWidth / 2;

  let nearestIndex = 0;
  let nearestDistance = Infinity;

  cards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.clientWidth / 2;
    const distance = Math.abs(cardCenter - viewportCenter);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  activeCourseIndex.value = nearestIndex;
}

function scrollToCourse(index) {
  const el = courseTrackRef.value;
  if (!el) return;
  const card = el.querySelector('.discover-course-card');
  if (!card) return;
  const style = window.getComputedStyle(el);
  const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
  const unit = card.clientWidth + gap;
  el.scrollTo({ left: unit * index, behavior: 'smooth' });
  activeCourseIndex.value = index;
}

const PAGE_SIZE = 10;
const attractions = ref([]);
const attractionsLoading = ref(false);
const attractionsError = ref(null);
const totalAttractionPages = ref(1);
const attractionPage = ref(1);

async function loadAttractions() {
  attractionsLoading.value = true;
  attractionsError.value = null;
  const mode = densityModes.value[courseDensityIndex.value];
  try {
    const response = await fetchAttractionsPage({
      category: activeCategory.value,
      minScore: mode.scoreMin,
      maxScore: mode.scoreMax,
      page: attractionPage.value - 1,
      size: PAGE_SIZE,
    });
    attractions.value = response.content || [];
    totalAttractionPages.value = response.totalPages || 1;
  } catch (e) {
    attractionsError.value = e.message;
    attractions.value = [];
    totalAttractionPages.value = 1;
  } finally {
    attractionsLoading.value = false;
  }
}

onMounted(async () => {
  applyInitialDensityFromPersona();
  await loadAttractions();
  void loadSavedPlansRemote();
  void loadTourCourses();
});

// 1 ... 4 5 6 ... 12 형태로 표시할 페이지 번호 배열 (숫자 or '...')
const pageItems = computed(() => {
  const total = totalAttractionPages.value;
  const cur = attractionPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items = [];
  const addPage = (p) => items.push(p);
  const addDot = () => {
    if (items[items.length - 1] !== '...') items.push('...');
  };

  addPage(1);
  if (cur > 3) addDot();
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++)
    addPage(p);
  if (cur < total - 2) addDot();
  addPage(total);

  return items;
});

function selectCategory(id) {
  activeCategory.value = id;
  if (attractionPage.value === 1) {
    void loadAttractions();
  } else {
    attractionPage.value = 1;
  }
}

watch(attractionPage, () => {
  void loadAttractions();
});

const homeListTab = ref('attractions');
const events = ref([]);
const eventsLoading = ref(false);
const eventsError = ref(null);
const eventsFetchAttempted = ref(false);
const eventPage = ref(1);

watch(homeListTab, (tab) => {
  if (tab === 'attractions') attractionPage.value = 1;
  if (tab === 'events') {
    eventPage.value = 1;
    ensureEventsLoaded();
  }
});

async function ensureEventsLoaded() {
  if (eventsFetchAttempted.value) return;
  eventsFetchAttempted.value = true;
  eventsLoading.value = true;
  eventsError.value = null;
  try {
    const data = await fetchEvents();
    events.value = Array.isArray(data) ? data : [];
  } catch (e) {
    eventsError.value = e.message;
    events.value = [];
    eventsFetchAttempted.value = false;
  } finally {
    eventsLoading.value = false;
  }
}

function formatTourYmd(ymd) {
  const s = ymd != null ? String(ymd).trim() : '';
  if (s.length !== 8 || !/^\d{8}$/.test(s)) return s || '—';
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`;
}

function eventDateLabel(ev) {
  const a = formatTourYmd(ev.eventStartDate);
  const b = formatTourYmd(ev.eventEndDate);
  if (a === b) return a;
  return `${a} ~ ${b}`;
}

const totalEventPages = computed(() =>
  Math.max(1, Math.ceil(events.value.length / PAGE_SIZE)),
);

const pagedEvents = computed(() => {
  const start = (eventPage.value - 1) * PAGE_SIZE;
  return events.value.slice(start, start + PAGE_SIZE);
});

const eventPageItems = computed(() => {
  const total = totalEventPages.value;
  const cur = eventPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items = [];
  const addDot = () => {
    if (items[items.length - 1] !== '...') items.push('...');
  };

  items.push(1);
  if (cur > 3) addDot();
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++)
    items.push(p);
  if (cur < total - 2) addDot();
  items.push(total);
  return items;
});

function goToAttraction(id) {
  selectedAttractionId.value = String(id);
}

function goToEvent(contentId) {
  const sid = contentId != null ? String(contentId).trim() : '';
  if (!sid) return;
  selectedEventId.value = sid;
}

function closeDetailSheet() {
  selectedAttractionId.value = null;
  selectedEventId.value = null;
}

function onCourseGenerated() {
  showAISheet.value = false;
  router.push('/result');
}

function closeAISheet() {
  showAISheet.value = false;
  clearAiSheetSession();
  if (route.path === '/ai') router.replace('/discover');
}

watch(
  () => route.path,
  (path) => {
    if (path === '/ai') showAISheet.value = true;
  },
  { immediate: true },
);
</script>

<template>
  <div class="discover">
    <!-- ── Header ─────────────────────────────────────────────────────── -->
    <header class="discover__header">
      <div class="discover__header-bg" aria-hidden="true">
        <div class="discover-flight discover-flight--header">
          <div class="discover-flight__track">
            <img class="discover-flight__earth" :src="earthImage" alt="" />
            <div class="discover-flight__plane-wrap">
              <img class="discover-flight__plane" :src="airplaneImage" alt="" />
            </div>
          </div>
        </div>
      </div>
      <div class="discover__header-content">
        <div class="discover__brand">
          <span class="discover__brand-bts">BTS</span>
          <span class="discover__brand-sub">Beyond Tours Seoul</span>
        </div>
      </div>
    </header>

    <!-- ── Greeting ───────────────────────────────────────────────────── -->
    <div class="discover__greeting">
      <div class="discover__greeting-row">
        <div class="discover__greeting-copy">
          <h2 class="discover__greeting-title">Hi, Explorer! 🔥</h2>
          <p class="discover__greeting-sub">{{ $t('discover.greeting') }}</p>
        </div>
      </div>
    </div>

    <!-- ── My saved itineraries (서버 user_saved_plans) ─────────────────── -->
    <section
      v-if="authStore.isAuthenticated && (savedPlansLoading || savedPlansError || savedPlansRemote.length)"
      class="discover__section discover__saved-plans"
    >
      <div class="discover__saved-plans-heading">
        <Sparkles
          :size="16"
          :stroke-width="2.4"
          class="discover__saved-plans-heading-icon"
        />
        <h3 class="discover__section-title discover__saved-plans-title">
          {{ $t('discover.mySavedPlans') }}
        </h3>
      </div>
      <div v-if="savedPlansLoading" class="discover__saved-plans-msg">
        {{ $t('discover.loadingCourses') }}
      </div>
      <p
        v-else-if="savedPlansError"
        class="discover__saved-plans-msg discover__saved-plans-msg--error"
      >
        {{ savedPlansError }}
      </p>
      <p v-else-if="!savedPlansRemote.length" class="discover__saved-plans-msg">
        {{ $t('discover.savedPlansEmptyHint') }}
      </p>
      <div
        v-else
        class="discover__course-carousel discover__saved-plans-scroll"
      >
        <button
          v-for="p in savedPlansRemote"
          :key="p.id"
          type="button"
          class="discover-saved-plan-card"
          @click="openSavedPlan(p.id)"
        >
          <Sparkles
            :size="18"
            :stroke-width="2.2"
            class="discover-saved-plan-card__icon"
            aria-hidden="true"
          />
          <p class="discover-saved-plan-card__title">
            {{ p.title || $t('discover.savedPlanFallbackTitle') }}
          </p>
          <p
            v-if="formatSavedPlanDate(p.savedAt)"
            class="discover-saved-plan-card__date"
          >
            {{ $t('discover.savedAtPrefix') }} {{ formatSavedPlanDate(p.savedAt) }}
          </p>
          <span class="discover-saved-plan-card__cta">{{ $t('discover.viewSchedule') }}</span>
        </button>
      </div>
    </section>

    <!-- ── 공식 추천 코스 (tour_courses) ─────────────────────────────── -->
    <section class="discover__section">
      <h3 class="discover__section-title">{{ $t('discover.recommendedCourse') }}</h3>
      <p class="discover__section-sub">
        {{ $t('discover.officialCoursesHint') }}
      </p>
      <div v-if="tourCoursesLoading" class="discover__tour-courses-msg">
        {{ $t('discover.loadingCourses') }}
      </div>
      <p
        v-else-if="tourCoursesError"
        class="discover__tour-courses-msg discover__tour-courses-msg--error"
      >
        {{ tourCoursesError }}
      </p>
      <p v-else-if="!tourCourses.length" class="discover__tour-courses-msg">
        {{ $t('discover.noOfficialCourses') }}
      </p>
      <template v-else>
        <div
          ref="courseTrackRef"
          class="discover__course-carousel"
          @scroll.passive="onCourseTrackScroll"
        >
          <article
            v-for="(course, i) in tourCourses"
            :key="course.id"
            class="discover-course-card"
            :style="{ backgroundImage: courseCardBackground(course, i) }"
          >
            <div class="discover-course-card__photo-overlay"></div>
            <button
              class="discover-course-card__save-btn"
              :class="{
                'discover-course-card__save-btn--active':
                  isTourCourseSaved(course),
              }"
              type="button"
              :disabled="savingTourCourseId === course.id"
              :aria-label="isTourCourseSaved(course) ? $t('discover.unsaveCourse') : $t('discover.saveCourse')"
              @click.stop="toggleSaveCourse(course)"
            >
              <Heart :size="14" :stroke-width="2.3" />
            </button>
            <p class="discover-course-card__title">{{ course.title }}</p>
            <p v-if="course.hashtags" class="discover-course-card__route">
              {{ course.hashtags }}
            </p>
            <div
              v-if="hashtagTags(course.hashtags).length"
              class="discover-course-card__tags"
            >
              <span
                v-for="tag in hashtagTags(course.hashtags)"
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
            v-for="(_, i) in tourCourses"
            :key="i"
            class="discover__course-dot"
            :class="{ 'discover__course-dot--active': activeCourseIndex === i }"
            :aria-label="$t('discover.goToCourseNth', { n: i + 1 })"
            @click="scrollToCourse(i)"
          />
        </div>
      </template>
    </section>

    <!-- ── Real-time Hot Places ───────────────────────────────────────── -->
    <HotPlacesRanking />

    <!-- ── Theme Categories & listings ──────────────────────────────── -->
    <section class="discover__section discover__section--last">
      <div class="discover__list-heading">
        <h3 class="discover__section-title">
          {{
            homeListTab === 'attractions'
              ? $t('discover.themeRecommend')
              : $t('discover.festival')
          }}
        </h3>
        <div
          class="discover__home-tabs"
          role="tablist"
          :aria-label="$t('discover.listType')"
        >
          <button
            type="button"
            role="tab"
            class="discover__home-tab"
            :class="{
              'discover__home-tab--active': homeListTab === 'attractions',
            }"
            :aria-selected="homeListTab === 'attractions'"
            @click="homeListTab = 'attractions'"
          >
            {{ $t('discover.attractions') }}
          </button>
          <button
            type="button"
            role="tab"
            class="discover__home-tab"
            :class="{ 'discover__home-tab--active': homeListTab === 'events' }"
            :aria-selected="homeListTab === 'events'"
            @click="homeListTab = 'events'"
          >
            {{ $t('discover.events') }}
          </button>
        </div>
      </div>

      <div
        v-show="homeListTab === 'attractions'"
        class="discover__category-row"
      >
        <button
          v-for="cat in categories"
          :key="cat.id ?? '__all__'"
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
            <span>{{ $t('discover.loadingAttractions') }}</span>
          </div>

          <p v-else-if="attractionsError" class="discover__attractions-error">
            {{ attractionsError }}
          </p>

          <p
            v-else-if="attractions.length === 0"
            class="discover__attractions-empty"
          >
            {{ $t('discover.noAttractions') }}
          </p>

          <template v-else>
            <button
              v-for="attraction in attractions"
              :key="attraction.id"
              type="button"
              class="attraction-card"
              @click="goToAttraction(attraction.id)"
            >
              <div class="attraction-card__thumb-wrap">
                <img
                  v-if="
                    attraction.imageUrl ||
                    attraction.image_url ||
                    attraction.thumbnail
                  "
                  class="attraction-card__thumb"
                  :src="
                    attraction.imageUrl ||
                    attraction.image_url ||
                    attraction.thumbnail
                  "
                  :alt="attraction.name"
                />
                <div v-else class="attraction-card__thumb-placeholder"></div>
              </div>
              <div class="attraction-card__info">
                <p class="attraction-card__name">{{ attraction.name }}</p>
                <p v-if="attraction.address" class="attraction-card__address">
                  <MapPin
                    :size="11"
                    :stroke-width="2"
                    class="attraction-card__pin"
                  />
                  {{ attraction.address }}
                </p>
                <div class="attraction-card__meta">
                  <span v-if="attraction.cat1Name" class="attraction-card__cat">
                    {{ attraction.cat1Name }}
                  </span>
                </div>
              </div>
              <ChevronRight
                :size="16"
                :stroke-width="2.2"
                class="attraction-card__arrow"
              />
            </button>

            <div v-if="totalAttractionPages > 1" class="discover__pagination">
              <button
                type="button"
                class="discover__pg-arrow"
                :disabled="attractionPage === 1"
                :aria-label="$t('discover.prevPage')"
                @click="attractionPage--"
              >
                <ChevronLeft :size="14" :stroke-width="2.5" />
              </button>

              <template
                v-for="(item, pi) in pageItems"
                :key="'a-' + pi + '-' + item"
              >
                <span v-if="item === '...'" class="discover__pg-ellipsis"
                  >…</span
                >
                <button
                  v-else
                  type="button"
                  class="discover__pg-num"
                  :class="{
                    'discover__pg-num--active': attractionPage === item,
                  }"
                  @click="attractionPage = item"
                >
                  {{ item }}
                </button>
              </template>

              <button
                type="button"
                class="discover__pg-arrow"
                :disabled="attractionPage === totalAttractionPages"
                :aria-label="$t('discover.nextPage')"
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
            <span>{{ $t('discover.loadingEvents') }}</span>
          </div>

          <p v-else-if="eventsError" class="discover__attractions-error">
            {{ eventsError }}
          </p>

          <p
            v-else-if="events.length === 0"
            class="discover__attractions-empty"
          >
            {{ $t('discover.noEvents') }}
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
                  <MapPin
                    :size="11"
                    :stroke-width="2"
                    class="attraction-card__pin"
                  />
                  {{ ev.address }}
                </p>
                <div class="attraction-card__meta">
                  <span
                    class="attraction-card__cat attraction-card__cat--muted"
                  >
                    {{ eventDateLabel(ev) }}
                  </span>
                </div>
              </div>
              <ChevronRight
                :size="16"
                :stroke-width="2.2"
                class="attraction-card__arrow"
              />
            </button>

            <div v-if="totalEventPages > 1" class="discover__pagination">
              <button
                type="button"
                class="discover__pg-arrow"
                :disabled="eventPage === 1"
                :aria-label="$t('discover.prevPage')"
                @click="eventPage--"
              >
                <ChevronLeft :size="14" :stroke-width="2.5" />
              </button>

              <template
                v-for="(item, ei) in eventPageItems"
                :key="'e-' + ei + '-' + item"
              >
                <span v-if="item === '...'" class="discover__pg-ellipsis"
                  >…</span
                >
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
                :aria-label="$t('discover.nextPage')"
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
      <button class="nav-btn nav-btn--active" :aria-label="$t('nav.home')">
        <span class="nav-btn__icon-wrap">
          <IsIcon name="home" class="nav-btn__icon" variant="bulk" :size="19" />
        </span>
        <span>{{ $t('nav.home') }}</span>
      </button>

      <button class="nav-btn" :aria-label="$t('nav.map')">
        <span class="nav-btn__icon-wrap">
          <IsIcon
            name="map"
            class="nav-btn__icon"
            variant="twotone"
            :size="19"
          />
        </span>
        <span>{{ $t('nav.map') }}</span>
      </button>

      <button
        class="nav-btn nav-btn--center"
        :aria-label="$t('nav.aiCourse')"
        @click="showAISheet = true"
      >
        <span class="nav-btn__icon-wrap">
          <IsIcon
            name="magic-star"
            class="nav-btn__icon"
            variant="bulk"
            :size="19"
          />
        </span>
        <span>{{ $t('nav.aiCourse') }}</span>
      </button>

      <button class="nav-btn" :aria-label="$t('nav.saved')">
        <span class="nav-btn__icon-wrap">
          <IsIcon
            name="bookmark"
            class="nav-btn__icon"
            variant="twotone"
            :size="19"
          />
        </span>
        <span>{{ $t('nav.saved') }}</span>
      </button>

      <button class="nav-btn" :aria-label="$t('nav.my')">
        <span class="nav-btn__icon-wrap">
          <IsIcon
            name="profile-circle"
            class="nav-btn__icon"
            variant="twotone"
            :size="19"
          />
        </span>
        <span>{{ $t('nav.my') }}</span>
      </button>
    </nav>

    <!-- ── AI Sheet ───────────────────────────────────────────────────── -->
    <AIInputSheet
      v-if="showAISheet"
      @close="closeAISheet"
      @generated="onCourseGenerated"
    />

    <!-- ── Detail Overlay (관광지 / 행사) ────────────────────────────── -->
    <Transition name="discover-page">
      <div
        v-if="selectedAttractionId || selectedEventId"
        class="discover-detail-overlay"
      >
        <AttractionDetailView
          v-if="selectedAttractionId"
          :attraction-id="selectedAttractionId"
          @close="closeDetailSheet"
        />
        <EventDetailView
          v-else-if="selectedEventId"
          :event-id="selectedEventId"
          @close="closeDetailSheet"
        />
      </div>
    </Transition>
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
    radial-gradient(
      circle at 18% 10%,
      rgba(255, 255, 255, 0.32) 0%,
      rgba(255, 255, 255, 0) 48%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
}

.discover__brand {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

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

.discover-flight__plane-wrap {
  position: absolute;
  width: 32px;
  height: 32px;
  left: 10px;
  top: 12px;
  animation: discover-plane-fly 2.2s ease-in-out infinite;
}

.discover-flight__plane {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scaleX(-1);
}

.discover-flight--header .discover-flight__plane-wrap {
  width: 34px;
  height: 34px;
  left: 25px;
  top: 16px;
}

@keyframes discover-earth-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes discover-plane-fly {
  0% {
    transform: translateX(0) translateY(2px) rotate(-8deg);
    opacity: 0.9;
  }
  50% {
    transform: translateX(48px) translateY(-8px) rotate(2deg);
    opacity: 1;
  }
  100% {
    transform: translateX(94px) translateY(2px) rotate(8deg);
    opacity: 0.95;
  }
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

.discover__section-sub {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 600;
  color: #737373;
  line-height: 1.45;
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
  transition:
    background 0.15s,
    color 0.15s;
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
  transition:
    background 0.15s,
    transform 0.1s;
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
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.12s;
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

.discover__saved-plans-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.discover__saved-plans-heading-icon {
  flex-shrink: 0;
  color: #fe9c00;
}

.discover__saved-plans-title {
  margin-bottom: 0 !important;
}

.discover__saved-plans-msg {
  margin: 0 4px;
  padding: 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: #78716c;
  line-height: 1.45;
}

.discover__tour-courses-msg {
  margin: 0 4px 12px;
  padding: 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: #78716c;
  line-height: 1.45;
}

.discover__tour-courses-msg--error {
  color: #b91c1c;
}

.discover__saved-plans-msg--error {
  color: #b91c1c;
}

.discover__saved-plans-scroll {
  margin-top: 4px;
}

.discover-saved-plan-card {
  position: relative;
  min-width: min(72vw, 240px);
  scroll-snap-align: start;
  border-radius: 14px;
  padding: 16px 14px 44px;
  border: none;
  cursor: pointer;
  text-align: left;
  background: linear-gradient(155deg, #fffbeb 0%, #fff 55%, #f0fdf4 100%);
  box-shadow:
    0 2px 14px rgba(254, 156, 0, 0.12),
    0 0 0 1px rgba(251, 191, 36, 0.22);
  transition:
    transform 0.14s ease,
    box-shadow 0.14s ease;
}

.discover-saved-plan-card:active {
  transform: scale(0.98);
}

.discover-saved-plan-card__icon {
  display: block;
  color: #ea580c;
  margin-bottom: 8px;
}

.discover-saved-plan-card__title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 800;
  color: #1c1917;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.discover-saved-plan-card__date {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: #78716c;
}

.discover-saved-plan-card__cta {
  position: absolute;
  right: 12px;
  bottom: 12px;
  font-size: 12px;
  font-weight: 800;
  color: #d97706;
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

.discover__course-carousel::-webkit-scrollbar {
  display: none;
}

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
  transition:
    width 0.2s ease,
    background 0.2s ease;
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
  transition:
    transform 0.12s ease,
    background 0.15s ease,
    border-color 0.15s ease;
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

/* ─── Category row ───────────────────────────────────────────────────────── */
.discover__category-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}

.discover__category-row::-webkit-scrollbar {
  display: none;
}

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
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.1s;
  min-width: 68px;
}

.cat-btn:active {
  transform: scale(0.93);
}

.cat-btn--active {
  border-color: #fe9c00;
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

.cat-btn--active .cat-btn__label {
  color: #c97000;
}

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
  to {
    transform: rotate(360deg);
  }
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
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.1s;
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
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
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
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
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

/* ── Detail Overlay ─────────────────────────────────────────────────────── */
/*
 * MainLayout가 max-width: 430px / margin: 0 auto 로 앱 폭을 제한하므로
 * fixed 오버레이도 동일한 폭·위치로 맞춤.
 * left/right = max(0px, 50vw - 215px) → 뷰포트 중앙 430px 영역에 정확히 고정.
 */
.discover-detail-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: max(0px, calc(50% - 215px));
  right: max(0px, calc(50% - 215px));
  z-index: 200;
  background: #fafaf8;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* Transition: 오른쪽에서 슬라이드인 (일반 페이지 전환처럼) */
.discover-page-enter-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.discover-page-leave-active {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.discover-page-enter-from {
  transform: translateX(100%);
}

.discover-page-leave-to {
  transform: translateX(100%);
}
</style>
