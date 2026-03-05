import type { LogisticsNews } from '@/types/dashboard';

// Static logistics news/insights — updated periodically.
// Replace with a real API endpoint when backend is ready.
const STATIC_NOTICES: LogisticsNews[] = [
  {
    title: 'UPS 2025 공휴일 서비스 일정 안내',
    link: 'https://www.ups.com/kr/ko/support/shipping-support/shipping-holiday.page',
    pubDate: '2025-01-02T09:00:00Z',
    source: 'UPS Korea',
  },
  {
    title: 'DHL Express 연료할증료(FSC) 업데이트 — 2025년 3월',
    link: 'https://www.dhl.com/kr-ko/home/our-divisions/express/news-and-media.html',
    pubDate: '2025-03-01T09:00:00Z',
    source: 'DHL Express',
  },
  {
    title: '관세청: 2025년 특송물품 간이통관 기준 변경 안내',
    link: 'https://www.customs.go.kr',
    pubDate: '2025-02-15T09:00:00Z',
    source: '관세청',
  },
  {
    title: '글로벌 항공화물 운임 동향 — 1분기 시황 리포트',
    link: 'https://www.worldacd.com',
    pubDate: '2025-03-03T09:00:00Z',
    source: 'WorldACD',
  },
  {
    title: 'IATA: 2025년 항공화물 성장률 전망 발표',
    link: 'https://www.iata.org',
    pubDate: '2025-02-20T09:00:00Z',
    source: 'IATA',
  },
  {
    title: 'J-Ways 서비스 안내: 화물 픽업 예약 시스템 업데이트',
    link: 'https://jways.co.kr',
    pubDate: '2025-03-04T09:00:00Z',
    source: 'J-Ways',
  },
  {
    title: '인천공항 특송 입고 마감 시간 변경 (2025.03)',
    link: 'https://www.airport.kr',
    pubDate: '2025-03-01T09:00:00Z',
    source: '인천국제공항공사',
  },
  {
    title: 'UPS Peak Season Surcharge 적용 안내 — 2025 하반기',
    link: 'https://www.ups.com',
    pubDate: '2025-02-28T09:00:00Z',
    source: 'UPS',
  },
];

export async function fetchLogisticsNews(): Promise<LogisticsNews[]> {
  // Simulate async to keep the hook interface consistent
  return Promise.resolve(STATIC_NOTICES);
}

