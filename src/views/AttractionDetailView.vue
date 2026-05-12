<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/useAuthStore'
import { useServerSavedAttractionsStore } from '@/stores/useServerSavedAttractionsStore'
import {
  ChevronLeft,
  Heart,
  Share2,
  MapPin,
  Phone,
  Clock,
  Star,
  Navigation,
  Globe,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-vue-next'
import { fetchAttractionById } from '@/services/attractionService'
import { isAuthExpiredError } from '@/utils/authFlow'

const { t, locale } = useI18n()

const props = defineProps({
  attractionId: { default: null },
})
const emit = defineEmits(['close'])

const router = useRouter()
const route  = useRoute()
const authStore = useAuthStore()
const serverAttractions = useServerSavedAttractionsStore()

const attraction   = ref(null)
const loading      = ref(true)
const error        = ref(null)
const isLiked      = ref(false)
const likeSaving   = ref(false)
const showAllDesc  = ref(false)

// props.attractionId 또는 route.params.id 중 유효한 값 사용
const resolvedId = computed(() => props.attractionId ?? route.params.id)

watch(
  resolvedId,
  async (id) => {
    if (!id) return
    loading.value = true
    error.value = null
    attraction.value = null
    isLiked.value = false
    showAllDesc.value = false
    try {
      attraction.value = await fetchAttractionById(id)
      if (authStore.accessToken) {
        if (serverAttractions.items.length === 0) {
          await serverAttractions.refresh(authStore.accessToken)
        }
        isLiked.value = serverAttractions.isSaved(id)
      }
    } catch (e) {
      if (isAuthExpiredError(e)) {
        await authStore.handleAuthExpired(router, route)
        return
      }
      error.value = e.message
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
    if (!id || !attraction.value) return
    if (token) {
      try {
        await serverAttractions.refresh(token)
        isLiked.value = serverAttractions.isSaved(id)
      } catch (e) {
        if (isAuthExpiredError(e)) {
          await authStore.handleAuthExpired(router, route)
          return
        }
      }
    } else {
      isLiked.value = false
    }
  },
)

watch(locale, async () => {
  const id = resolvedId.value
  if (!id) return
  loading.value = true
  error.value = null
  try {
    attraction.value = await fetchAttractionById(id)
    if (authStore.accessToken) {
      if (serverAttractions.items.length === 0) {
        await serverAttractions.refresh(authStore.accessToken)
      }
      isLiked.value = serverAttractions.isSaved(id)
    }
  } catch (e) {
    if (isAuthExpiredError(e)) {
      await authStore.handleAuthExpired(router, route)
      return
    }
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// ── 필드 정규화 ────────────────────────────────────────────────────────────
const d = computed(() => {
  const a = attraction.value
  if (!a) return null
  return {
    id:          a.id,
    name:        a.name ?? '',
    category:    [a.cat1Name, a.cat2Name, a.cat3Name].filter(Boolean).join(' > '),
    categoryColor: '#FE9C00',
    rating:      a.rating ?? null,
    reviewCount: a.reviewCount ?? null,
    description: a.overview ?? a.description ?? '',
    address:     a.address ?? '',
    phone:       a.tel ?? null,
    hours:       a.operatingHours ?? null,
    website:     a.website ?? a.url ?? null,
    lat:         a.lat ?? null,
    lng:         a.lng ?? null,
    tags:        a.tags ?? [],
    images:      buildImages(a),
  }
})

function buildImages(a) {
  if (Array.isArray(a.images) && a.images.length) return a.images
  const single = a.thumbnail ?? a.imageUrl ?? a.image_url ?? a.firstimage ?? null
  return single ? [single] : []
}

const heroImage     = computed(() => d.value?.images?.[0] ?? '')
const galleryImages = computed(() => d.value?.images?.slice(1) ?? [])

const shortDesc = computed(() => {
  const desc = d.value?.description ?? ''
  return desc.length > 120 ? desc.slice(0, 120) + '…' : desc
})

// ── 액션 ──────────────────────────────────────────────────────────────────
function goBack() {
  if (props.attractionId != null) {
    emit('close')
    return
  }
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

async function toggleLike() {
  const id = d.value?.id
  if (id == null) return
  if (!authStore.accessToken) {
    window.alert?.('로그인 후 찜할 수 있습니다.')
    router.push({ name: 'landing' })
    return
  }
  if (likeSaving.value) return
  likeSaving.value = true
  try {
    const saved = await serverAttractions.toggle(id, authStore.accessToken)
    isLiked.value = saved
  } catch (e) {
    if (isAuthExpiredError(e)) {
        await authStore.handleAuthExpired(router, route)
        return
    }
    window.alert?.(e?.message || '저장 처리에 실패했습니다.')
  } finally {
    likeSaving.value = false
  }
}

function openMap() {
  const { lat, lng, name, address } = d.value ?? {}
  const dname   = encodeURIComponent(name ?? address ?? '')
  const appname = encodeURIComponent(window.location.hostname || 'bts-seoul')
  const ua      = navigator.userAgent

  // userAgent + maxTouchPoints로 실제 모바일 기기 여부 판별
  const isAndroid = /Android/i.test(ua) && /Mobile|Tablet/i.test(ua)
  const isIOS     = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream
  const isMobile  = isAndroid || isIOS

  const webFallback = () => {
    const query = encodeURIComponent(name ?? address ?? '')
    window.open(`https://map.naver.com/v5/search/${query}`, '_blank', 'noopener')
  }

  // 데스크탑이거나 좌표 없으면 웹으로
  if (!isMobile || !lat || !lng) {
    webFallback()
    return
  }

  if (isAndroid) {
    // Android: Intent URL → 앱 미설치 시 Play Store 자동 이동
    window.location.href =
      `intent://navigation?dlat=${lat}&dlng=${lng}&dname=${dname}&appname=${appname}` +
      `#Intent;scheme=nmap;action=android.intent.action.VIEW;` +
      `category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;end`
  } else {
    // iOS: nmap:// 시도 후 1.5초 내 미반응 시 App Store로 이동
    const clickedAt = Date.now()
    window.location.href =
      `nmap://navigation?dlat=${lat}&dlng=${lng}&dname=${dname}&appname=${appname}`
    setTimeout(() => {
      if (Date.now() - clickedAt < 2000) {
        window.location.href = 'http://itunes.apple.com/app/id311867728?mt=8'
      }
    }, 1500)
  }
}

function callPhone() {
  if (d.value?.phone) window.location.href = `tel:${d.value.phone}`
}

function sharePlace() {
  if (navigator.share) {
    navigator.share({ title: d.value?.name, url: window.location.href })
  } else {
    navigator.clipboard?.writeText(window.location.href)
  }
}

function openWebsite() {
  if (d.value?.website) window.open(d.value.website, '_blank', 'noopener')
}

function formatRating(r) {
  return Number(r).toFixed(1)
}

function formatCount(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '만'
  if (n >= 1000)  return (n / 1000).toFixed(1)  + '천'
  return String(n)
}
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="pd-loading">
    <div class="pd-spinner" />
    <p>{{ $t('attraction.loading') }}</p>
  </div>

  <!-- Error -->
  <div v-else-if="error" class="pd-error">
    <p>{{ error }}</p>
    <button class="pd-error__back" @click="goBack">{{ $t('attraction.back') }}</button>
  </div>

  <!-- Content -->
  <div v-else-if="d" class="pd">

    <!-- ── Hero ──────────────────────────────────────────────────────── -->
    <div class="pd__hero">
      <img
        v-if="heroImage"
        class="pd__hero-img"
        :src="heroImage"
        :alt="d.name"
        @error="e => e.target.style.display = 'none'"
      />
      <div v-else class="pd__hero-placeholder" />
      <div class="pd__hero-overlay" />

      <!-- 상단 액션 버튼 -->
      <div class="pd__hero-actions">
        <button class="pd__icon-btn" @click="goBack" :aria-label="$t('attraction.back')">
          <ChevronLeft :size="22" :stroke-width="2.5" />
        </button>
        <div class="pd__hero-actions-right">
          <button
            class="pd__icon-btn"
            :class="{ 'pd__icon-btn--liked': isLiked }"
            type="button"
            :disabled="likeSaving"
            @click="toggleLike"
            :aria-label="isLiked ? $t('attraction.saved') : $t('attraction.save')"
          >
            <Heart :size="20" :stroke-width="2.2" :fill="isLiked ? '#FE9C00' : 'none'" />
          </button>
          <button class="pd__icon-btn" @click="sharePlace">
            <Share2 :size="20" :stroke-width="2.2" />
          </button>
        </div>
      </div>

      <!-- 이미지 인디케이터 -->
      <div class="pd__dots" v-if="d.images.length > 1">
        <span
          v-for="(_, i) in d.images"
          :key="i"
          class="pd__dot"
          :class="{ 'pd__dot--active': i === 0 }"
        />
      </div>
    </div>

    <!-- ── 메인 카드 ──────────────────────────────────────────────────── -->
    <div class="pd__card">

      <!-- 카테고리 + 이름 + 평점 -->
      <div class="pd__head">
        <div class="pd__meta">
          <span
            v-if="d.category"
            class="pd__category"
            :style="{ background: d.categoryColor + '18', color: d.categoryColor }"
          >
            {{ d.category }}
          </span>
          <div v-if="d.rating" class="pd__rating">
            <Star :size="13" fill="#FE9C00" color="#FE9C00" />
            <span class="pd__rating-num">{{ formatRating(d.rating) }}</span>
            <span v-if="d.reviewCount" class="pd__rating-count">({{ formatCount(d.reviewCount) }})</span>
          </div>
        </div>
        <h1 class="pd__name">{{ d.name }}</h1>

        <div v-if="d.tags?.length" class="pd__tags">
          <span v-for="tag in d.tags" :key="tag" class="pd__tag">#{{ tag }}</span>
        </div>
      </div>

      <!-- 빠른 액션 -->
      <div class="pd__quick-actions">
        <button class="pd__action-btn" @click="openMap">
          <span class="pd__action-icon"><Navigation :size="18" :stroke-width="2" /></span>
          <span>{{ $t('attraction.directions') }}</span>
        </button>
        <button
          class="pd__action-btn"
          :class="{ 'pd__action-btn--disabled': !d.phone }"
          :disabled="!d.phone"
          @click="callPhone"
        >
          <span class="pd__action-icon"><Phone :size="18" :stroke-width="2" /></span>
          <span>{{ $t('attraction.call') }}</span>
        </button>
        <button v-if="d.website" class="pd__action-btn" @click="openWebsite">
          <span class="pd__action-icon"><Globe :size="18" :stroke-width="2" /></span>
          <span>{{ $t('attraction.website') }}</span>
        </button>
        <button
          class="pd__action-btn"
          :class="{ 'pd__action-btn--liked': isLiked, 'pd__action-btn--disabled': likeSaving }"
          type="button"
          :disabled="likeSaving"
          @click="toggleLike"
        >
          <span class="pd__action-icon">
            <Heart :size="18" :stroke-width="2" :fill="isLiked ? '#FE9C00' : 'none'" />
          </span>
          <span>{{ isLiked ? $t('attraction.saved') : $t('attraction.save') }}</span>
        </button>
      </div>

      <div class="pd__divider" />

      <!-- 소개 -->
      <section v-if="d.description" class="pd__section">
        <h2 class="pd__section-title">{{ $t('attraction.about') }}</h2>
        <p class="pd__desc">{{ showAllDesc ? d.description : shortDesc }}</p>
        <button
          v-if="d.description.length > 120"
          class="pd__more-btn"
          @click="showAllDesc = !showAllDesc"
        >
          {{ showAllDesc ? $t('attraction.readLess') : $t('attraction.readMore') }}
          <ChevronRight
            :size="14"
            :style="{ transform: showAllDesc ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
          />
        </button>
      </section>

      <div class="pd__divider" />

      <!-- 기본 정보 -->
      <section class="pd__section">
        <h2 class="pd__section-title">{{ $t('attraction.info') }}</h2>
        <ul class="pd__info-list">
          <li v-if="d.address" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--primary">
              <MapPin :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">{{ $t('attraction.location') }}</span>
              <span class="pd__info-value">{{ d.address }}</span>
            </div>
          </li>
          <li class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--green">
              <Phone :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">{{ $t('attraction.phone') }}</span>
              <a v-if="d.phone" :href="`tel:${d.phone}`" class="pd__info-value pd__info-value--link">{{ d.phone }}</a>
              <span v-else class="pd__info-value pd__info-value--empty">{{ $t('attraction.noPhone') }}</span>
            </div>
          </li>
          <li v-if="d.hours" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--blue">
              <Clock :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">{{ $t('attraction.hours') }}</span>
              <span class="pd__info-value" v-html="d.hours.replace(/\n/g, '<br>')" />
            </div>
          </li>
          <li v-if="d.website" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--purple">
              <Globe :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">{{ $t('attraction.website') }}</span>
              <a :href="d.website" target="_blank" rel="noopener" class="pd__info-value pd__info-value--link">
                {{ d.website }}
              </a>
            </div>
          </li>
        </ul>
      </section>

      <!-- 사진 갤러리 -->
      <template v-if="galleryImages.length">
        <div class="pd__divider" />
        <section class="pd__section pd__section--no-pad-bottom">
          <div class="pd__gallery-header">
            <h2 class="pd__section-title">{{ $t('attraction.photos') }}</h2>
            <span class="pd__gallery-count">
              <ImageIcon :size="13" />
              {{ $t('attraction.photoCount', { n: d.images.length }) }}
            </span>
          </div>
        </section>
        <div class="pd__gallery">
          <div v-for="(img, i) in galleryImages" :key="i" class="pd__gallery-item">
            <img
              :src="img"
              :alt="`${d.name} 사진 ${i + 2}`"
              class="pd__gallery-img"
              @error="e => e.target.closest('.pd__gallery-item').style.display = 'none'"
            />
          </div>
        </div>
      </template>

      <div style="height: 80px;" />
    </div>
  </div>
</template>

<style scoped>
/* ── Loading / Error ─────────────────────────────────────────────────────── */
.pd-loading,
.pd-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  gap: 16px;
  color: #888;
  font-size: 14px;
  background: #fafaf8;
}

.pd-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #ffe3ba;
  border-top-color: #fe9c00;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pd-error__back {
  background: none;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  font-family: inherit;
}

/* ── Root ────────────────────────────────────────────────────────────────── */
.pd {
  min-height: 100dvh;
  background: #fafaf8;
  position: relative;
  overflow-x: hidden;
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
.pd__hero {
  position: relative;
  width: 100%;
  height: 310px;
  background: #e8e8e4;
  overflow: hidden;
}

.pd__hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pd__hero-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #2c2c3a 0%, #1a1a28 100%);
}

.pd__hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.28) 0%,
    transparent 40%,
    transparent 60%,
    rgba(0, 0, 0, 0.22) 100%
  );
  pointer-events: none;
}

.pd__hero-actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(52px, calc(env(safe-area-inset-top, 0px) + 16px)) 16px 12px;
}

.pd__hero-actions-right {
  display: flex;
  gap: 8px;
}

.pd__icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.18s, transform 0.12s;
}

.pd__icon-btn:active { transform: scale(0.92); }

.pd__icon-btn--liked { background: rgba(254, 156, 0, 0.3); }

.pd__icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pd__icon-btn:disabled:active {
  transform: none;
}

.pd__dots {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
}

.pd__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.2s;
}

.pd__dot--active {
  width: 16px;
  border-radius: 3px;
  background: #fff;
}

/* ── Main Card ───────────────────────────────────────────────────────────── */
.pd__card {
  background: #fafaf8;
  border-radius: 24px 24px 0 0;
  margin-top: -22px;
  position: relative;
  z-index: 1;
  padding: 24px 20px 0;
}

/* ── Head ────────────────────────────────────────────────────────────────── */
.pd__head { margin-bottom: 20px; }

.pd__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pd__category {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}

.pd__rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pd__rating-num {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a;
}

.pd__rating-count {
  font-size: 12px;
  color: #aaa;
}

.pd__name {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: -0.02em;
  margin-bottom: 10px;
  line-height: 1.25;
}

.pd__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pd__tag {
  font-size: 12px;
  color: #888;
  background: #f0f0ec;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

/* ── Quick Actions ───────────────────────────────────────────────────────── */
.pd__quick-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 22px;
}

.pd__action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: #fff;
  border: 1.5px solid #f0f0f0;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #444;
  font-family: inherit;
  transition: all 0.15s;
}

.pd__action-btn:active {
  transform: scale(0.96);
  background: #fdf6e8;
}

.pd__action-btn--disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.pd__action-btn--disabled:active {
  transform: none;
  background: #fff;
}

.pd__action-btn--liked {
  border-color: #FE9C00;
  color: #FE9C00;
  background: #fff9f0;
}

.pd__action-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #fdf6e8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FE9C00;
}

.pd__action-btn--liked .pd__action-icon { background: #fff0d6; }

/* ── Divider ─────────────────────────────────────────────────────────────── */
.pd__divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0 22px;
}

/* ── Section ─────────────────────────────────────────────────────────────── */
.pd__section { margin-bottom: 22px; }

.pd__section--no-pad-bottom { margin-bottom: 12px; }

.pd__section-title {
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}

/* ── Description ─────────────────────────────────────────────────────────── */
.pd__desc {
  font-size: 14px;
  line-height: 1.75;
  color: #555;
  word-break: keep-all;
  margin: 0;
}

.pd__more-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #FE9C00;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

/* ── Info List ───────────────────────────────────────────────────────────── */
.pd__info-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
}

.pd__info-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.pd__info-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pd__info-icon--primary { background: #fff3e0; color: #FE9C00; }
.pd__info-icon--green   { background: #e8f5e9; color: #2e7d32; }
.pd__info-icon--blue    { background: #e3f2fd; color: #1565c0; }
.pd__info-icon--purple  { background: #f3e8ff; color: #7c3aed; }

.pd__info-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.pd__info-label {
  font-size: 11px;
  font-weight: 600;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pd__info-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
  word-break: keep-all;
}

.pd__info-value--empty {
  color: #bbb;
  font-style: italic;
}

.pd__info-value--link {
  color: #1565c0;
  text-decoration: none;
  word-break: break-all;
}

/* ── Gallery ─────────────────────────────────────────────────────────────── */
.pd__gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.pd__gallery-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aaa;
  font-weight: 500;
}

.pd__gallery {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 0 20px 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.pd__gallery::-webkit-scrollbar { display: none; }

.pd__gallery-item {
  flex-shrink: 0;
  width: 140px;
  height: 140px;
  border-radius: 16px;
  overflow: hidden;
  background: #e8e8e4;
}

.pd__gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s;
}

.pd__gallery-item:active .pd__gallery-img { transform: scale(1.04); }
</style>
