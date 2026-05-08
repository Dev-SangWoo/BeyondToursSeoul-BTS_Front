<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ChevronLeft,
  Heart,
  Share2,
  MapPin,
  Phone,
  Clock,
  Navigation,
  Globe,
  Image as ImageIcon,
  ChevronRight,
  Calendar,
  Users,
  Banknote,
} from 'lucide-vue-next'
import { fetchEventById } from '@/services/eventService'

const router = useRouter()
const route = useRoute()

const eventDetail = ref(null)
const loading = ref(true)
const error = ref(null)
const isLiked = ref(false)
const showAllDesc = ref(false)
const showAllProgram = ref(false)

const resolvedId = computed(() => route.params.id)

watch(
  resolvedId,
  async (id) => {
    error.value = null
    eventDetail.value = null
    isLiked.value = false
    showAllDesc.value = false
    showAllProgram.value = false

    const sid = id != null ? String(id).trim() : ''
    if (!sid) {
      loading.value = false
      error.value = '행사 번호가 없습니다.'
      return
    }

    loading.value = true
    try {
      eventDetail.value = await fetchEventById(sid)
    } catch (e) {
      error.value = e.message || '행사 정보를 불러오지 못했습니다.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

function extractFirstUrl(text) {
  if (text == null || typeof text !== 'string') return null
  const m = text.trim().match(/https?:\/\/[^\s]+/i)
  return m ? m[0] : null
}

function normalizeTel(t) {
  if (t == null || String(t).trim() === '') return null
  return String(t).trim()
}

function formatYmd(ymd) {
  const s = ymd != null ? String(ymd).trim() : ''
  if (s.length !== 8 || !/^\d{8}$/.test(s)) return s || '—'
  return `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`
}

function formatPeriod(start, end) {
  const a = formatYmd(start)
  const b = formatYmd(end)
  if (a === b) return a
  return `${a} ~ ${b}`
}

const d = computed(() => {
  const e = eventDetail.value
  if (!e) return null
  const images = Array.isArray(e.images) && e.images.length ? [...e.images] : []
  return {
    contentId: e.contentId,
    title: e.title ?? '',
    categoryBadge: '축제 · 행사',
    overview: e.overview ?? '',
    address: e.address ?? '',
    eventPlace: e.eventPlace ?? '',
    eventStartDate: e.eventStartDate,
    eventEndDate: e.eventEndDate,
    periodLabel: formatPeriod(e.eventStartDate, e.eventEndDate),
    playTime: e.playTime ?? '',
    program: e.program ?? '',
    useTimeFestival: e.useTimeFestival ?? '',
    ageLimit: e.ageLimit ?? '',
    homepageUrl: extractFirstUrl(e.homepage),
    tel: normalizeTel(e.tel),
    telName: e.telName ?? '',
    bookingPlace: e.bookingPlace ?? '',
    sponsor1: e.sponsor1 ?? '',
    sponsor1tel: normalizeTel(e.sponsor1tel),
    sponsor2: e.sponsor2 ?? '',
    sponsor2tel: normalizeTel(e.sponsor2tel),
    discountInfoFestival: e.discountInfoFestival ?? '',
    festivalGrade: e.festivalGrade ?? '',
    subEvent: e.subEvent ?? '',
    spendTimeFestival: e.spendTimeFestival ?? '',
    lat: e.mapY != null ? Number(e.mapY) : null,
    lng: e.mapX != null ? Number(e.mapX) : null,
    images,
  }
})

const heroImage = computed(() => d.value?.images?.[0] ?? '')
const galleryImages = computed(() => d.value?.images?.slice(1) ?? [])

const shortDesc = computed(() => {
  const desc = d.value?.overview ?? ''
  return desc.length > 120 ? desc.slice(0, 120) + '…' : desc
})

const shortProgram = computed(() => {
  const p = d.value?.program ?? ''
  return p.length > 160 ? p.slice(0, 160) + '…' : p
})

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/discover')
}

function toggleLike() {
  isLiked.value = !isLiked.value
}

function openMap() {
  const lat = d.value?.lat
  const lng = d.value?.lng
  const name = d.value?.title
  const address = d.value?.address ?? d.value?.eventPlace ?? ''
  const dname = encodeURIComponent(name ?? address ?? '')
  const appname = encodeURIComponent(window.location.hostname || 'bts-seoul')
  const ua = navigator.userAgent

  const isAndroid = /Android/i.test(ua) && /Mobile|Tablet/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua) && !window.MSStream
  const isMobile = isAndroid || isIOS

  const webFallback = () => {
    const query = encodeURIComponent(name ?? address ?? '')
    window.open(`https://map.naver.com/v5/search/${query}`, '_blank', 'noopener')
  }

  if (!isMobile || lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    webFallback()
    return
  }

  if (isAndroid) {
    window.location.href =
      `intent://navigation?dlat=${lat}&dlng=${lng}&dname=${dname}&appname=${appname}` +
      '#Intent;scheme=nmap;action=android.intent.action.VIEW;' +
      'category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;end'
  } else {
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

function callPhone(num) {
  const n = num ?? d.value?.tel
  if (n) window.location.href = `tel:${String(n).replace(/\s/g, '')}`
}

function shareEvent() {
  if (navigator.share) {
    navigator.share({ title: d.value?.title, url: window.location.href })
  } else {
    navigator.clipboard?.writeText(window.location.href)
  }
}

function openWebsite() {
  const url = d.value?.homepageUrl
  if (url) window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <div v-if="loading" class="pd-loading">
    <div class="pd-spinner" />
    <p>불러오는 중...</p>
  </div>

  <div v-else-if="error" class="pd-error">
    <p>{{ error }}</p>
    <button class="pd-error__back" type="button" @click="goBack">돌아가기</button>
  </div>

  <div v-else-if="d" class="pd">
    <div class="pd__hero">
      <img
        v-if="heroImage"
        class="pd__hero-img"
        :src="heroImage"
        :alt="d.title"
        @error="(e) => (e.target.style.display = 'none')"
      />
      <div v-else class="pd__hero-placeholder" />
      <div class="pd__hero-overlay" />

      <div class="pd__hero-actions">
        <button type="button" class="pd__icon-btn" aria-label="뒤로가기" @click="goBack">
          <ChevronLeft :size="22" :stroke-width="2.5" />
        </button>
        <div class="pd__hero-actions-right">
          <button
            type="button"
            class="pd__icon-btn"
            :class="{ 'pd__icon-btn--liked': isLiked }"
            aria-label="찜하기"
            @click="toggleLike"
          >
            <Heart :size="20" :stroke-width="2.2" :fill="isLiked ? '#FE9C00' : 'none'" />
          </button>
          <button type="button" class="pd__icon-btn" aria-label="공유" @click="shareEvent">
            <Share2 :size="20" :stroke-width="2.2" />
          </button>
        </div>
      </div>

      <div v-if="d.images.length > 1" class="pd__dots">
        <span
          v-for="(_, i) in d.images"
          :key="i"
          class="pd__dot"
          :class="{ 'pd__dot--active': i === 0 }"
        />
      </div>
    </div>

    <div class="pd__card">
      <div class="pd__head">
        <div class="pd__meta">
          <span class="pd__category pd__category--event">
            {{ d.categoryBadge }}
          </span>
        </div>
        <h1 class="pd__name">{{ d.title }}</h1>
        <p v-if="d.periodLabel && d.periodLabel !== '— ~ —'" class="pd__period-chip">
          <Calendar :size="14" :stroke-width="2" />
          {{ d.periodLabel }}
        </p>
      </div>

      <div class="pd__quick-actions">
        <button type="button" class="pd__action-btn" @click="openMap">
          <span class="pd__action-icon"><Navigation :size="18" :stroke-width="2" /></span>
          <span>길찾기</span>
        </button>
        <button
          type="button"
          class="pd__action-btn"
          :class="{ 'pd__action-btn--disabled': !d.tel }"
          :disabled="!d.tel"
          @click="callPhone()"
        >
          <span class="pd__action-icon"><Phone :size="18" :stroke-width="2" /></span>
          <span>전화</span>
        </button>
        <button v-if="d.homepageUrl" type="button" class="pd__action-btn" @click="openWebsite">
          <span class="pd__action-icon"><Globe :size="18" :stroke-width="2" /></span>
          <span>홈페이지</span>
        </button>
        <button
          type="button"
          class="pd__action-btn"
          :class="{ 'pd__action-btn--liked': isLiked }"
          @click="toggleLike"
        >
          <span class="pd__action-icon">
            <Heart :size="18" :stroke-width="2" :fill="isLiked ? '#FE9C00' : 'none'" />
          </span>
          <span>{{ isLiked ? '저장됨' : '저장' }}</span>
        </button>
      </div>

      <div class="pd__divider" />

      <section v-if="d.overview" class="pd__section">
        <h2 class="pd__section-title">소개</h2>
        <p class="pd__desc">{{ showAllDesc ? d.overview : shortDesc }}</p>
        <button
          v-if="d.overview.length > 120"
          type="button"
          class="pd__more-btn"
          @click="showAllDesc = !showAllDesc"
        >
          {{ showAllDesc ? '접기' : '더 보기' }}
          <ChevronRight
            :size="14"
            :style="{ transform: showAllDesc ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
          />
        </button>
      </section>

      <div v-if="d.overview" class="pd__divider" />

      <section v-if="d.program" class="pd__section">
        <h2 class="pd__section-title">프로그램</h2>
        <p class="pd__desc pd__desc--pre">{{ showAllProgram ? d.program : shortProgram }}</p>
        <button
          v-if="d.program.length > 160"
          type="button"
          class="pd__more-btn"
          @click="showAllProgram = !showAllProgram"
        >
          {{ showAllProgram ? '접기' : '더 보기' }}
          <ChevronRight
            :size="14"
            :style="{ transform: showAllProgram ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
          />
        </button>
      </section>

      <div v-if="d.program" class="pd__divider" />

      <section class="pd__section">
        <h2 class="pd__section-title">행사 정보</h2>
        <ul class="pd__info-list">
          <li v-if="d.eventPlace" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--primary">
              <MapPin :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">개최 장소</span>
              <span class="pd__info-value">{{ d.eventPlace }}</span>
            </div>
          </li>
          <li v-if="d.address" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--primary">
              <MapPin :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">주소</span>
              <span class="pd__info-value">{{ d.address }}</span>
            </div>
          </li>
          <li v-if="d.periodLabel && d.periodLabel !== '— ~ —'" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--blue">
              <Calendar :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">기간</span>
              <span class="pd__info-value">{{ d.periodLabel }}</span>
            </div>
          </li>
          <li v-if="d.playTime" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--blue">
              <Clock :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">공연 · 운영 시간</span>
              <span class="pd__info-value" v-html="d.playTime.replace(/\n/g, '<br>')" />
            </div>
          </li>
          <li v-if="d.useTimeFestival" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--green">
              <Banknote :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">이용 요금</span>
              <span class="pd__info-value">{{ d.useTimeFestival }}</span>
            </div>
          </li>
          <li v-if="d.ageLimit" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--purple">
              <Users :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">관람 연령</span>
              <span class="pd__info-value">{{ d.ageLimit }}</span>
            </div>
          </li>
          <li class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--green">
              <Phone :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">문의 {{ d.telName ? `(${d.telName})` : '' }}</span>
              <a v-if="d.tel" :href="`tel:${d.tel.replace(/\s/g, '')}`" class="pd__info-value pd__info-value--link">
                {{ d.tel }}
              </a>
              <span v-else class="pd__info-value pd__info-value--empty">연락처 정보가 없습니다.</span>
            </div>
          </li>
          <li v-if="d.homepageUrl" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--purple">
              <Globe :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">홈페이지</span>
              <a :href="d.homepageUrl" target="_blank" rel="noopener" class="pd__info-value pd__info-value--link">
                {{ d.homepageUrl }}
              </a>
            </div>
          </li>
          <li v-if="d.bookingPlace" class="pd__info-item">
            <span class="pd__info-icon pd__info-icon--blue">
              <Globe :size="16" :stroke-width="2.2" />
            </span>
            <div class="pd__info-body">
              <span class="pd__info-label">예매</span>
              <span class="pd__info-value pd__desc--pre">{{ d.bookingPlace }}</span>
            </div>
          </li>
        </ul>
      </section>

      <template
        v-if="
          d.sponsor1 ||
          d.sponsor1tel ||
          d.sponsor2 ||
          d.sponsor2tel ||
          d.discountInfoFestival ||
          d.festivalGrade ||
          d.subEvent ||
          d.spendTimeFestival
        "
      >
        <div class="pd__divider" />
        <section class="pd__section">
          <h2 class="pd__section-title">주최 · 기타</h2>
          <ul class="pd__info-list">
            <li v-if="d.sponsor1 || d.sponsor1tel" class="pd__info-item">
              <div class="pd__info-body pd__info-body--full">
                <span class="pd__info-label">주최 · 주관</span>
                <span class="pd__info-value">{{ d.sponsor1 || '—' }}</span>
                <a
                  v-if="d.sponsor1tel"
                  :href="`tel:${d.sponsor1tel.replace(/\s/g, '')}`"
                  class="pd__info-value pd__info-value--link"
                >
                  {{ d.sponsor1tel }}
                </a>
              </div>
            </li>
            <li v-if="d.sponsor2 || d.sponsor2tel" class="pd__info-item">
              <div class="pd__info-body pd__info-body--full">
                <span class="pd__info-label">후원 등</span>
                <span class="pd__info-value">{{ d.sponsor2 || '—' }}</span>
                <a
                  v-if="d.sponsor2tel"
                  :href="`tel:${d.sponsor2tel.replace(/\s/g, '')}`"
                  class="pd__info-value pd__info-value--link"
                >
                  {{ d.sponsor2tel }}
                </a>
              </div>
            </li>
            <li v-if="d.discountInfoFestival" class="pd__info-item">
              <div class="pd__info-body pd__info-body--full">
                <span class="pd__info-label">할인 정보</span>
                <span class="pd__info-value">{{ d.discountInfoFestival }}</span>
              </div>
            </li>
            <li v-if="d.festivalGrade" class="pd__info-item">
              <div class="pd__info-body pd__info-body--full">
                <span class="pd__info-label">행사 규모</span>
                <span class="pd__info-value">{{ d.festivalGrade }}</span>
              </div>
            </li>
            <li v-if="d.subEvent" class="pd__info-item">
              <div class="pd__info-body pd__info-body--full">
                <span class="pd__info-label">부대 행사</span>
                <span class="pd__info-value pd__desc--pre">{{ d.subEvent }}</span>
              </div>
            </li>
            <li v-if="d.spendTimeFestival" class="pd__info-item">
              <div class="pd__info-body pd__info-body--full">
                <span class="pd__info-label">체류 시간</span>
                <span class="pd__info-value">{{ d.spendTimeFestival }}</span>
              </div>
            </li>
          </ul>
        </section>
      </template>

      <template v-if="galleryImages.length">
        <div class="pd__divider" />
        <section class="pd__section pd__section--no-pad-bottom">
          <div class="pd__gallery-header">
            <h2 class="pd__section-title">사진</h2>
            <span class="pd__gallery-count">
              <ImageIcon :size="13" />
              {{ d.images.length }}장
            </span>
          </div>
        </section>
        <div class="pd__gallery">
          <div v-for="(img, i) in galleryImages" :key="i" class="pd__gallery-item">
            <img
              :src="img"
              :alt="`${d.title} 사진 ${i + 2}`"
              class="pd__gallery-img"
              @error="(e) => (e.target.closest('.pd__gallery-item').style.display = 'none')"
            />
          </div>
        </div>
      </template>

      <div style="height: 80px;" />
    </div>
  </div>

  <div v-else class="pd-error">
    <p>표시할 행사 정보가 없습니다.</p>
    <button type="button" class="pd-error__back" @click="goBack">돌아가기</button>
  </div>
</template>

<style scoped>
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

.pd {
  min-height: 100dvh;
  background: #fafaf8;
  position: relative;
  overflow-x: hidden;
}

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
  background: linear-gradient(160deg, #3d1f4a 0%, #1a1a28 100%);
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

.pd__card {
  background: #fafaf8;
  border-radius: 24px 24px 0 0;
  margin-top: -22px;
  position: relative;
  z-index: 1;
  padding: 24px 20px 0;
}

.pd__head { margin-bottom: 20px; }

.pd__meta {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 8px;
}

.pd__category {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
}

.pd__category--event {
  background: rgba(225, 29, 72, 0.12);
  color: #be123c;
}

.pd__name {
  font-size: 24px;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: -0.02em;
  margin: 0 0 10px;
  line-height: 1.25;
}

.pd__period-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  background: #f0f0ec;
  padding: 8px 12px;
  border-radius: 12px;
}

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
  min-width: 0;
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
  border-color: #fe9c00;
  color: #fe9c00;
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
  color: #fe9c00;
  flex-shrink: 0;
}

.pd__action-btn--liked .pd__action-icon {
  background: #fff0d6;
}

.pd__divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0 22px;
}

.pd__section { margin-bottom: 22px; }

.pd__section--no-pad-bottom { margin-bottom: 12px; }

.pd__section-title {
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}

.pd__desc {
  font-size: 14px;
  line-height: 1.75;
  color: #555;
  word-break: keep-all;
  margin: 0;
}

.pd__desc--pre {
  white-space: pre-wrap;
}

.pd__more-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fe9c00;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

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

.pd__info-icon--primary { background: #fff3e0; color: #fe9c00; }
.pd__info-icon--green { background: #e8f5e9; color: #2e7d32; }
.pd__info-icon--blue { background: #e3f2fd; color: #1565c0; }
.pd__info-icon--purple { background: #f3e8ff; color: #7c3aed; }

.pd__info-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.pd__info-body--full {
  flex: 1;
  padding-top: 0;
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
  line-height: 1.45;
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
}

.pd__gallery-item:active .pd__gallery-img { transform: scale(1.04); }

</style>
