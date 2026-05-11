/**
 * Maps Korean API area names (from the Seoul real-time population API) to
 * localised display names for supported locales.
 * Falls back to the original Korean name when a translation is unavailable.
 */
export const AREA_NAME_MAP = {
  en: {
    // 강남권
    '삼성/코엑스': 'Samsung/COEX',
    '강남역 일대': 'Gangnam Station Area',
    '신사/압구정': 'Sinsa/Apgujeong',
    '청담/압구정': 'Cheongdam/Apgujeong',
    '서초/교대': 'Seocho/Gyodae',
    '고속터미널/반포': 'Express Terminal/Banpo',
    '양재/도곡': 'Yangjae/Dogok',
    '사당/이수': 'Sadang/Isu',
    // 종로/중구권
    '명동': 'Myeongdong',
    '서울역/시청': 'Seoul Station/City Hall',
    '광화문/경복궁': 'Gwanghwamun/Gyeongbokgung',
    '종로/청계': 'Jongno/Cheonggye',
    '인사동/북촌': 'Insadong/Bukchon',
    '동대문': 'Dongdaemun',
    '혜화/대학로': 'Hyehwa/Daehakro',
    // 마포/용산권
    '홍대/합정': 'Hongdae/Hapjeong',
    '연남': 'Yeonnam',
    '신촌/이대': 'Sinchon/Ewha',
    '상암/DMC': 'Sangam/DMC',
    '이태원/한남': 'Itaewon/Hannam',
    '용산': 'Yongsan',
    '여의도': 'Yeouido',
    '노량진/동작': 'Noryangjin/Dongjak',
    // 동남권
    '잠실': 'Jamsil',
    '가락/장지': 'Garak/Jangji',
    '강동/천호': 'Gangdong/Cheonho',
    '성수/서울숲': 'Seongsu/Seoul Forest',
    '건대입구': 'Konkuk Univ. Area',
    '광진/군자': 'Gwangjin/Gunja',
    '왕십리': 'Wangsimni',
    // 서남권
    '영등포/신도림': 'Yeongdeungpo/Sindorim',
    '목동': 'Mokdong',
    '마곡/발산': 'Magok/Balsan',
    '관악/신림': 'Gwanak/Sillim',
    '구로/가산': 'Guro/Gasan',
    // 북부권
    '강북/수유': 'Gangbuk/Suyu',
    '노원/창동': 'Nowon/Changdong',
    '은평/연신내': 'Eunpyeong/Yeonsinnae',
    '성북': 'Seongbuk',
    '청량리/회기': 'Cheongnyangni/Hoegi',
    // 외곽
    '과천/대공원': 'Gwacheon/Grand Park',
  },
  ja: {
    // 강남권
    '삼성/코엑스': 'サムスン/COEX',
    '강남역 일대': '江南駅周辺',
    '신사/압구정': '新沙/狎鴎亭',
    '청담/압구정': '清潭/狎鴎亭',
    '서초/교대': '瑞草/教大',
    '고속터미널/반포': '高速バスターミナル/盤浦',
    '양재/도곡': '良才/道谷',
    '사당/이수': '舎堂/梨水',
    // 종로/중구권
    '명동': '明洞',
    '서울역/시청': 'ソウル駅/市庁',
    '광화문/경복궁': '光化門/景福宮',
    '종로/청계': '鍾路/清渓',
    '인사동/북촌': '仁寺洞/北村',
    '동대문': '東大門',
    '혜화/대학로': '恵化/大学路',
    // 마포/용산권
    '홍대/합정': '弘大/合井',
    '연남': '延南',
    '신촌/이대': '新村/梨大',
    '상암/DMC': '上岩/DMC',
    '이태원/한남': '梨泰院/漢南',
    '용산': '龍山',
    '여의도': '汝矣島',
    '노량진/동작': '鷺梁津/銅雀',
    // 동남권
    '잠실': '蚕室',
    '가락/장지': '可楽/長旨',
    '강동/천호': '江東/千戸',
    '성수/서울숲': '聖水/ソウルの森',
    '건대입구': '建大入口',
    '광진/군자': '広津/君子',
    '왕십리': '往十里',
    // 서남권
    '영등포/신도림': '永登浦/新道林',
    '목동': '木洞',
    '마곡/발산': '麻谷/発山',
    '관악/신림': '冠岳/新林',
    '구로/가산': '九老/加山',
    // 북부권
    '강북/수유': '江北/水踰',
    '노원/창동': '蘆原/倉洞',
    '은평/연신내': '恩平/延新内',
    '성북': '城北',
    '청량리/회기': '清涼里/回基',
    // 외곽
    '과천/대공원': '果川/大公園',
  },
  zh: {
    // 강남권
    '삼성/코엑스': '三星/COEX',
    '강남역 일대': '江南站一带',
    '신사/압구정': '新沙/狎鸥亭',
    '청담/압구정': '清潭/狎鸥亭',
    '서초/교대': '瑞草/教大',
    '고속터미널/반포': '高速客运站/盘浦',
    '양재/도곡': '良才/道谷',
    '사당/이수': '舍堂/梨水',
    // 종로/중구권
    '명동': '明洞',
    '서울역/시청': '首尔站/市政厅',
    '광화문/경복궁': '光化门/景福宫',
    '종로/청계': '钟路/清溪',
    '인사동/북촌': '仁寺洞/北村',
    '동대문': '东大门',
    '혜화/대학로': '惠化/大学路',
    // 마포/용산권
    '홍대/합정': '弘大/合井',
    '연남': '延南',
    '신촌/이대': '新村/梨大',
    '상암/DMC': '上岩/DMC',
    '이태원/한남': '梨泰院/汉南',
    '용산': '龙山',
    '여의도': '汝矣岛',
    '노량진/동작': '鹭梁津/铜雀',
    // 동남권
    '잠실': '蚕室',
    '가락/장지': '可乐/长旨',
    '강동/천호': '江东/千户',
    '성수/서울숲': '圣水/首尔林',
    '건대입구': '建大入口',
    '광진/군자': '广津/君子',
    '왕십리': '往十里',
    // 서남권
    '영등포/신도림': '永登浦/新道林',
    '목동': '木洞',
    '마곡/발산': '麻谷/发山',
    '관악/신림': '冠岳/新林',
    '구로/가산': '九老/加山',
    // 북부권
    '강북/수유': '江北/水踰',
    '노원/창동': '芦原/仓洞',
    '은평/연신내': '恩平/延新内',
    '성북': '城北',
    '청량리/회기': '清凉里/回基',
    // 외곽
    '과천/대공원': '果川/大公园',
  },
}

/**
 * Returns the localised name for a given Korean area name.
 * Falls back to the original Korean name if no translation exists.
 *
 * @param {string} koreanName - Korean area name as returned by the API
 * @param {string} locale     - Current i18n locale (e.g. 'ko', 'en', 'ja', 'zh')
 * @returns {string}
 */
export function translateAreaName(koreanName, locale) {
  if (!koreanName) return ''
  if (locale === 'ko') return koreanName
  return AREA_NAME_MAP[locale]?.[koreanName] ?? koreanName
}
