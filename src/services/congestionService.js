/**
 * 실시간 혼잡도 데이터 서비스
 * 백엔드 API(/api/v1/congestion)에서 실시간 데이터를 가져와
 * 권역(Zone)별로 집계하여 제공합니다.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── 권역 매핑 테이블 ──────────────────────────────────────────────
// 각 POI가 어느 권역에 속하는지, 권역의 대표 좌표(anchor)는 어디인지 정의
const ZONE_MAP = {
  // ── 강남/서초 ───────────────────────────────────────────────────
  POI001: { zone: '삼성/코엑스', isAnchor: true },
  POI034: { zone: '삼성/코엑스' },
  POI014: { zone: '강남역 일대', isAnchor: true },
  POI037: { zone: '강남역 일대' },
  POI042: { zone: '강남역 일대' },
  POI059: { zone: '신사/압구정', isAnchor: true },
  POI111: { zone: '신사/압구정' },
  POI071: { zone: '청담/압구정', isAnchor: true },
  POI080: { zone: '청담/압구정' },
  POI018: { zone: '서초/교대', isAnchor: true },
  POI098: { zone: '서초/교대' },
  POI017: { zone: '고속터미널/반포', isAnchor: true },
  POI095: { zone: '고속터미널/반포' },
  POI041: { zone: '양재/도곡', isAnchor: true },
  POI112: { zone: '양재/도곡' },
  POI029: { zone: '사당/이수', isAnchor: true },
  POI051: { zone: '사당/이수' },

  // ── 도심/종로 ───────────────────────────────────────────────────
  POI003: { zone: '명동', isAnchor: true },
  POI114: { zone: '명동' },
  POI115: { zone: '명동' },
  POI033: { zone: '서울역/시청', isAnchor: true },
  POI130: { zone: '서울역/시청' },
  POI131: { zone: '서울역/시청' },
  POI052: { zone: '서울역/시청' },
  POI064: { zone: '서울역/시청' },
  POI008: { zone: '광화문/경복궁', isAnchor: true },
  POI088: { zone: '광화문/경복궁' },
  POI009: { zone: '광화문/경복궁' },
  POI067: { zone: '광화문/경복궁' },
  POI124: { zone: '광화문/경복궁' },
  POI006: { zone: '종로/청계', isAnchor: true },
  POI010: { zone: '종로/청계' },
  POI060: { zone: '종로/청계' },
  POI012: { zone: '인사동/북촌', isAnchor: true },
  POI078: { zone: '인사동/북촌' },
  POI116: { zone: '인사동/북촌' },
  POI066: { zone: '인사동/북촌' },
  POI129: { zone: '인사동/북촌' },
  POI002: { zone: '동대문', isAnchor: true },
  POI024: { zone: '동대문' },
  POI083: { zone: '동대문' },
  POI054: { zone: '혜화/대학로', isAnchor: true },

  // ── 마포/용산 ───────────────────────────────────────────────────
  POI007: { zone: '홍대/합정', isAnchor: true },
  POI055: { zone: '홍대/합정' },
  POI053: { zone: '홍대/합정' },
  POI094: { zone: '홍대/합정' },
  POI073: { zone: '연남', isAnchor: true },
  POI040: { zone: '신촌/이대', isAnchor: true },
  POI122: { zone: '신촌/이대' },
  POI084: { zone: '상암/DMC', isAnchor: true },
  POI090: { zone: '상암/DMC' },
  POI106: { zone: '상암/DMC' },
  POI004: { zone: '이태원/한남', isAnchor: true },
  POI047: { zone: '이태원/한남' },
  POI077: { zone: '이태원/한남' },
  POI082: { zone: '이태원/한남' },
  POI091: { zone: '이태원/한남' },
  POI046: { zone: '용산', isAnchor: true },
  POI076: { zone: '용산' },
  POI030: { zone: '용산' },
  POI089: { zone: '용산' },
  POI108: { zone: '용산' },
  POI072: { zone: '여의도', isAnchor: true },
  POI105: { zone: '여의도' },
  POI126: { zone: '여의도' },
  POI063: { zone: '노량진/동작', isAnchor: true },
  POI092: { zone: '노량진/동작' },

  // ── 송파/강동 ───────────────────────────────────────────────────
  POI005: { zone: '잠실', isAnchor: true },
  POI119: { zone: '잠실' },
  POI118: { zone: '잠실' },
  POI120: { zone: '잠실' },
  POI121: { zone: '잠실' },
  POI127: { zone: '잠실' },
  POI110: { zone: '잠실' },
  POI109: { zone: '잠실' },
  POI058: { zone: '가락/장지', isAnchor: true },
  POI048: { zone: '가락/장지' },
  POI050: { zone: '강동/천호', isAnchor: true },
  POI016: { zone: '강동/천호' },
  POI011: { zone: '강동/천호' },
  POI087: { zone: '강동/천호' },

  // ── 성동/광진/중랑 ──────────────────────────────────────────────
  POI068: { zone: '성수/서울숲', isAnchor: true },
  POI025: { zone: '성수/서울숲' },
  POI101: { zone: '성수/서울숲' },
  POI107: { zone: '성수/서울숲' },
  POI015: { zone: '건대입구', isAnchor: true },
  POI093: { zone: '건대입구' },
  POI104: { zone: '광진/군자', isAnchor: true },
  POI021: { zone: '광진/군자' },
  POI102: { zone: '광진/군자' },
  POI045: { zone: '왕십리', isAnchor: true },
  POI049: { zone: '왕십리' },

  // ── 영등포/강서/양천 ─────────────────────────────────────────────
  POI074: { zone: '영등포/신도림', isAnchor: true },
  POI038: { zone: '영등포/신도림' },
  POI103: { zone: '영등포/신도림' },
  POI044: { zone: '목동', isAnchor: true },
  POI117: { zone: '목동' },
  POI125: { zone: '목동' },
  POI032: { zone: '마곡/발산', isAnchor: true },
  POI027: { zone: '마곡/발산' },
  POI061: { zone: '마곡/발산' },
  POI085: { zone: '마곡/발산' },

  // ── 관악/구로/금천 ─────────────────────────────────────────────
  POI039: { zone: '관악/신림', isAnchor: true },
  POI031: { zone: '관악/신림' },
  POI123: { zone: '관악/신림' },
  POI019: { zone: '구로/가산', isAnchor: true },
  POI013: { zone: '구로/가산' },
  POI020: { zone: '구로/가산' },
  POI023: { zone: '구로/가산' },
  POI086: { zone: '구로/가산' },

  // ── 강북/도봉/노원/은평 ──────────────────────────────────────────
  POI036: { zone: '강북/수유', isAnchor: true },
  POI026: { zone: '강북/수유' },
  POI096: { zone: '강북/수유' },
  POI079: { zone: '노원/창동', isAnchor: true },
  POI070: { zone: '노원/창동' },
  POI043: { zone: '은평/연신내', isAnchor: true },
  POI128: { zone: '은평/연신내' },

  // ── 성북/동대문/광진 ──────────────────────────────────────────────
  POI035: { zone: '성북', isAnchor: true },
  POI056: { zone: '청량리/회기', isAnchor: true },
  POI081: { zone: '청량리/회기' },

  // ── 외곽/기타 ───────────────────────────────────────────────────
  POI100: { zone: '과천/대공원', isAnchor: true },
};

// ── 혼잡도 텍스트 → 숫자 레벨 변환 ─────────────────────────────────
function mapStatusToLevel(status) {
  if (status === '여유') return 1;
  if (status === '보통') return 2;
  if (status === '약간 붐빔') return 3;
  if (status === '붐빔' || status === '매우 붐빔') return 4;
  return 2; // 기본값 보통
}

/**
 * 백엔드 API에서 실시간 혼잡도 데이터를 가져와 권역별로 집계합니다.
 * @returns {Promise<Array>} 권역별 혼잡도 데이터 배열
 */
export async function fetchCongestions() {
  const res = await fetch(`${BASE_URL}/api/v1/congestion`);
  if (!res.ok) throw new Error(`혼잡도 데이터 조회 실패: ${res.status}`);
  const rawData = await res.json();

  // 1. API 응답 데이터를 권역(Zone)별로 그룹화
  const zones = {};

  rawData.forEach((item) => {
    const mapping = ZONE_MAP[item.areaCode];
    if (!mapping) return; // 매핑에 없는 POI는 무시

    const zoneName = mapping.zone;
    const level = mapStatusToLevel(item.congestionLevel);

    if (!zones[zoneName]) {
      zones[zoneName] = {
        name: zoneName,
        sum: 0,
        count: 0,
        anchorLat: null,
        anchorLng: null,
        areas: [],
        latestTime: item.populationTime,
      };
    }

    zones[zoneName].sum += level;
    zones[zoneName].count++;
    if (!zones[zoneName].areas.includes(item.areaName)) {
      zones[zoneName].areas.push(item.areaName);
    }

    // Anchor POI의 좌표를 권역 대표 좌표로 사용
    if (mapping.isAnchor) {
      zones[zoneName].anchorLat = item.latitude;
      zones[zoneName].anchorLng = item.longitude;
    } else if (zones[zoneName].anchorLat === null) {
      zones[zoneName].anchorLat = item.latitude;
      zones[zoneName].anchorLng = item.longitude;
    }

    // 가장 최근 시간으로 갱신
    if (
      item.populationTime &&
      (!zones[zoneName].latestTime ||
        item.populationTime > zones[zoneName].latestTime)
    ) {
      zones[zoneName].latestTime = item.populationTime;
    }
  });

  // 2. 최종 권역 데이터 생성
  return Object.values(zones).map((z, idx) => ({
    id: `zone-${idx}`,
    area_name: z.name,
    congestion_level: Math.round(z.sum / z.count),
    latitude: z.anchorLat,
    longitude: z.anchorLng,
    population_time: z.latestTime
      ? z.latestTime.replace('T', ' ').slice(0, 16)
      : new Date().toISOString().slice(0, 16).replace('T', ' '),
    sub_areas: z.areas,
  }));
}
