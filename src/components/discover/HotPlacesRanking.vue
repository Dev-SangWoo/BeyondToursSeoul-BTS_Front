<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { fetchCongestions } from '@/services/congestionService';
import { translateAreaName } from '@/constants/areaNameMap';

const { t, locale } = useI18n();

// ── 권역별 대표 이미지 (Unsplash) ────────────────────────────────────────
const ZONE_IMAGES = {
  // 강남권
  '삼성/코엑스': '/placeImages/Samsung:COEX.jpg',

  '강남역 일대': '/placeImages/Gangnam.jpg',

  '신사/압구정': '/placeImages/Sinsa.jpg',

  '청담/압구정': '/placeImages/Cheongdam:Apgujeong.jpg',

  '서초/교대': '/placeImages/Seocho:Gyodae.jpg',

  '고속터미널/반포': '/placeImages/Banpo.jpg',

  '양재/도곡': '/placeImages/Yangjae.jpg',

  '사당/이수':
    'https://images.unsplash.com/photo-1529421306624-54a5e29e4f3d?auto=format&fit=crop&w=1200&q=80',

  // 종로/중구권
  '명동': '/placeImages/Myeongdong.jpg',

  '서울역/시청': '/placeImages/Seoul Station.jpg',

  '광화문/경복궁': '/placeImages/Gyeongbokgung.jpg',

  '종로/청계': '/placeImages/Cheonggye.jpg',

  '인사동/북촌': '/placeImages/Bukchon.jpg',

  '동대문': '/placeImages/Dongdaemun.jpg',

  '혜화/대학로': '/placeImages/Daehakro.jpg',

  // 마포/용산권
  '홍대/합정': '/placeImages/Hongdae.jpg',

  '연남': '/placeImages/Yeonnam.jpg',

  '신촌/이대': '/placeImages/Sinchon.jpg',

  '상암/DMC': '/placeImages/Sangam.jpg',

  '이태원/한남': '/placeImages/Itaewon.jpg',

  '용산': '/placeImages/Yongsan.jpg',

  '여의도': '/placeImages/Yeouido.jpg',

  '노량진/동작': '/placeImages/Noryangjin.jpg',

  // 동남권
  '잠실': '/placeImages/Jamsil.jpg',

  '가락/장지': '/placeImages/Garak.jpg',

  '강동/천호': '/placeImages/Gangdong.jpg',

  '성수/서울숲': '/placeImages/Seongsu.jpg',

  '건대입구': '/placeImages/Konkuk.jpg',

  '광진/군자': '/placeImages/Gwangjin.jpg',

  '왕십리': '/placeImages/Wangsimni.jpg',

  // 서남권
  '영등포/신도림':
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',

  '목동':
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',

  '마곡/발산':
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',

  '관악/신림':
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',

  '구로/가산':
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',

  // 북부권
  '강북/수유':
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',

  '노원/창동':
    'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',

  '은평/연신내':
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',

  '성북':
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',

  '청량리/회기':
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',

  // 외곽
  '과천/대공원': '/placeImages/Gwacheon.jpg',
}
const ZONE_IMAGE_DEFAULT =
  'https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?auto=format&fit=crop&w=500&q=80';

const CONGESTION_COLOR = { 1: '#22c55e', 2: '#eab308', 3: '#f97316', 4: '#ef4444' };

function congestionLabel(level) {
  return t(`map.congestion.shortLabel.${level}`);
}

const places = ref([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const zones = await fetchCongestions();
    places.value = zones
      .sort((a, b) => b.congestion_level - a.congestion_level)
      .slice(0, 5)
      .map((z, idx) => ({
        id: idx + 1,
        name: z.area_name,
        congestionLevel: z.congestion_level,
        image: ZONE_IMAGES[z.area_name] ?? ZONE_IMAGE_DEFAULT,
      }));
  } catch (e) {
    console.error('[HotPlacesRanking] 혼잡도 로드 실패:', e.message);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="discover__section">
    <h3 class="discover__section-title">{{ t('discover.hotPlaces') }}</h3>

    <!-- 로딩 스켈레톤 -->
    <div v-if="loading" class="hot-rank-row">
      <div
        v-for="n in 5"
        :key="n"
        class="hot-rank-item hot-rank-item--skeleton"
      >
        <div class="hot-rank-item__thumb-wrap hot-rank-item__thumb-wrap--skeleton"></div>
        <div class="hot-rank-item__name hot-rank-item__name--skeleton"></div>
      </div>
    </div>

    <!-- 데이터 -->
    <div v-else class="hot-rank-row">
      <article
        v-for="place in places"
        :key="place.id"
        class="hot-rank-item"
      >
        <div class="hot-rank-item__thumb-wrap">
          <img class="hot-rank-item__thumb" :src="place.image" :alt="translateAreaName(place.name, locale)" />
          <span class="hot-rank-item__badge">{{ place.id }}</span>
          <span
            class="hot-rank-item__cong-badge"
            :style="{ background: CONGESTION_COLOR[place.congestionLevel] }"
          >{{ congestionLabel(place.congestionLevel) }}</span>
        </div>
        <p class="hot-rank-item__name">{{ translateAreaName(place.name, locale) }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.hot-rank-row {
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

.hot-rank-item__cong-badge {
  position: absolute;
  left: -2px;
  top: -2px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  letter-spacing: -0.2px;
}

/* 스켈레톤 */
.hot-rank-item--skeleton .hot-rank-item__thumb-wrap--skeleton {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s infinite;
}

.hot-rank-item--skeleton .hot-rank-item__name--skeleton {
  margin-top: 8px;
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s infinite;
}

@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
