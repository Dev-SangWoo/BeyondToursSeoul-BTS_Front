import { getCurrentLocale, getApiLangCode } from '@/i18n';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const NEAREST_LOCKER_TTL_MS = 30_000;
const NEAREST_LOCKER_BACKOFF_MS = 15_000;
const nearestLockerCache = new Map();
const nearestLockerPending = new Map();
let nearestLockerBackoffUntil = 0;

function toTourLang(lang) {
  const value = String(lang || '')
    .trim()
    .toLowerCase();
  if (value === 'ko') return 'KOR';
  if (value === 'en') return 'ENG';
  if (value === 'ja') return 'JPN';
  if (value === 'zh') return 'CHS';
  if (value === 'kor' || value === 'eng' || value === 'jpn' || value === 'chs')
    return value.toUpperCase();
  return getApiLangCode();
}

/**
 * @param {{ category?: string, lang?: string, minScore?: number, maxScore?: number }} [opts]
 * @returns {Promise<Array>}
 */
export async function fetchAttractions(opts = {}) {
  const lang = toTourLang(opts.lang ?? getCurrentLocale());
  const params = new URLSearchParams({ lang });
  if (opts.category) params.set('category', opts.category);
  if (typeof opts.minScore === 'number')
    params.set('minScore', String(opts.minScore));
  if (typeof opts.maxScore === 'number')
    params.set('maxScore', String(opts.maxScore));

  // 캐시 방지를 위한 타임스탬프 추가
  params.set('_t', String(Date.now()));

  const res = await fetch(
    `${BASE_URL}/api/v1/attractions?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`관광지 목록 조회 실패: ${res.status}`);
  return res.json();
}

/**
 * 관광지 페이징 목록 조회
 * @param {{ category?: string, date?: string, timeSlot?: string, minScore?: number, maxScore?: number, page?: number, size?: number }} [opts]
 * @returns {Promise<Object>}
 */
export async function fetchAttractionsPage(opts = {}) {
  const params = new URLSearchParams();

  if (opts.category) params.set('category', opts.category);
  if (opts.date) params.set('date', opts.date);
  if (opts.timeSlot) params.set('timeSlot', opts.timeSlot);
  if (typeof opts.minScore === 'number')
    params.set('minScore', String(opts.minScore));
  if (typeof opts.maxScore === 'number')
    params.set('maxScore', String(opts.maxScore));
  if (typeof opts.page === 'number') params.set('page', String(opts.page));
  if (typeof opts.size === 'number') params.set('size', String(opts.size));

  const locale = getCurrentLocale() || 'ko';
  const res = await fetch(
    `${BASE_URL}/api/v1/attractions/page?${params.toString()}`,
    {
      headers: { 'Accept-Language': locale },
    },
  );
  if (!res.ok) throw new Error(`관광지 페이징 목록 조회 실패: ${res.status}`);
  return res.json();
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchAttractionById(id) {
  const locale = getCurrentLocale() || 'ko';
  const res = await fetch(`${BASE_URL}/api/v1/attractions/${id}`, {
    headers: { 'Accept-Language': locale },
  });
  if (!res.ok) throw new Error(`관광지 상세 조회 실패: ${res.status}`);
  return res.json();
}

/**
 * @returns {Promise<Array>}
 */
export async function fetchLockers() {
  const lang = getApiLangCode();
  const res = await fetch(`${BASE_URL}/api/v1/lockers?lang=${lang}`);
  if (!res.ok) throw new Error(`물품보관소 목록 조회 실패: ${res.status}`);
  return res.json();
}

/**
 * @param {string|number} id
 * @returns {Promise<Object>}
 */
export async function fetchLockerById(id) {
  const lang = getApiLangCode();
  const res = await fetch(`${BASE_URL}/api/v1/lockers/${id}?lang=${lang}`);
  if (!res.ok) throw new Error(`물품보관소 상세 조회 실패: ${res.status}`);
  return res.json();
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {{ limit?: number, lang?: string }} [opts]
 * @returns {Promise<Array<{ id: number, lockerId: string, lockerName: string, stationName?: string, detailLocation?: string, latitude: number, longitude: number, distanceMeters: number }>>}
 */
export async function fetchNearestLockers(lat, lng, opts = {}) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

  const limit = opts.limit ?? 1;
  const lang = toTourLang(opts.lang ?? 'KOR');
  const cacheKey = [
    latitude.toFixed(5),
    longitude.toFixed(5),
    String(limit),
    lang,
  ].join(':');
  const now = Date.now();

  if (nearestLockerBackoffUntil > now) return [];

  const cached = nearestLockerCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;

  const pending = nearestLockerPending.get(cacheKey);
  if (pending) return pending;

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    limit: String(limit),
    lang,
  });
  const request = (async () => {
    const res = await fetch(
      `${BASE_URL}/api/v1/lockers/nearest?${params.toString()}`,
    );

    if (!res.ok) {
      if (res.status >= 500) {
        nearestLockerBackoffUntil = Date.now() + NEAREST_LOCKER_BACKOFF_MS;
        return [];
      }
      throw new Error(`가까운 물품보관소 조회 실패: ${res.status}`);
    }

    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    nearestLockerCache.set(cacheKey, {
      data: list,
      expiresAt: Date.now() + NEAREST_LOCKER_TTL_MS,
    });
    return list;
  })();

  nearestLockerPending.set(cacheKey, request);
  try {
    return await request;
  } finally {
    nearestLockerPending.delete(cacheKey);
  }
}
