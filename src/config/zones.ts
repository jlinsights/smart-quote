import { DomesticRegionCode } from "@/types";

export const DEFAULT_COUNTRY_ZONES: Record<string, string> = {
  'JP': 'Zone 1',
  'CN': 'Zone 2', // Default to North
  'VN': 'Zone 3',
  'SG': 'Zone 3',
  'US': 'Zone 7', // Default to East (Expensive)
  'DE': 'Zone 7',
  'GB': 'Zone 7',
};

export const CN_SOUTH_ZIP_RANGES = [
    { start: 350000, end: 369999 }, // Fujian
    { start: 510000, end: 539999 }, // Guangdong / Guangxi
    { start: 570000, end: 579999 }, // Hainan
    { start: 650000, end: 679999 }, // Yunnan (Requested)
];

export const DOMESTIC_REGIONS: { code: DomesticRegionCode; label: string; cities: string }[] = [
    { code: 'A', label: 'Region A', cities: '서인천, 주안, 부평, 연안부두, 남동, 방화, 공항, 등촌, 가양' },
    { code: 'B', label: 'Region B', cities: '김포, 구로, 마포, 합정, 신월, 부천' },
    { code: 'C', label: 'Region C', cities: '서대문, 용산, 광명, 안산, 시흥, 일산, 영등포, 문래' },
    { code: 'D', label: 'Region D', cities: '강남, 역삼, 양재, 동대문, 안양, 군포, 종로, 을지로, 은평, 신림, 통진, 성수' },
    { code: 'E', label: 'Region E', cities: '송파, 잠실, 천호, 면목, 성남, 수원, 의정부, 수유, 상계, 태능, 파주, 분당' },
    { code: 'F', label: 'Region F', cities: '하남, 구리, 양주, 남양주, 문산' },
    { code: 'G', label: 'Region G', cities: '용인, 동두천, 포천, 오산, 화성, 광주, 강화' },
    { code: 'H', label: 'Region H', cities: '송탄, 평택, 이천, 곤지암' },
    { code: 'I', label: 'Region I', cities: '천안, 입장, 장호원, 안성, 일죽' },
    { code: 'J', label: 'Region J', cities: '음성, 진천, 증평, 아산, 여주' },
    { code: 'K', label: 'Region K', cities: '청주, 조치원, 문막, 오창' },
    { code: 'L', label: 'Region L', cities: '양평, 가평, 원주, 당진, 세종' },
    { code: 'M', label: 'Region M', cities: '대전, 신탄진, 공주, 청원, 춘천, 서산' },
    { code: 'N', label: 'Region N', cities: '충주, 제천, 예산, 홍성, 보령, 연천, 철원' },
    { code: 'O', label: 'Region O', cities: '옥천, 대천, 논산, 부여, 홍천, 전주, 익산, 괴산, 금산, 진안, 평창, 군산' },
    { code: 'P', label: 'Region P', cities: '문경, 광주, 무주, 정읍, 고창, 영월, 단양, 영주' },
    { code: 'Q', label: 'Region Q', cities: '장수, 나주, 무안, 영광' },
    { code: 'R', label: 'Region R', cities: '삼척, 양양, 속초, 동해, 강릉' },
    { code: 'S', label: 'Region S', cities: '목포' },
    { code: 'T', label: 'Region T', cities: '거제도, 통영, 해남, 태백, 여수, 울진' },
];
