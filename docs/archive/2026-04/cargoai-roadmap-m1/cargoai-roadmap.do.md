# CargoAI Roadmap — Do Phase (M1: Multi-Carrier UX)

> **Focus**: 장기 로드맵 중 **즉시 착수 가능한 M1 (Phase 1.5)** 에 집중
> **Reason**: Phase 1 (캐리어 API 실시간 연동) 선행 필요. Phase 3.5(CO2)는 Phase 1.5 완료 후 통합.
> **Design Doc**: [cargoai-roadmap.design.md](../../02-design/features/cargoai-roadmap.design.md)
> **Date**: 2026-04-05

---

## ⚠️ Pre-Implementation Checklist

로드맵은 1년+ 장기 계획이므로 단계별로 나누어 착수합니다.

### 즉시 착수 가능 (현재 인프라로 가능)
- [x] **M1: Phase 1.5 Multi-Carrier UX** — 기존 UPS/DHL 결과에 배지/정렬만 추가 (API 불필요)
- [ ] **M2: Phase 3.5 CO2 (읽기 전용 시뮬레이션)** — IATA emission factor 상수만 있으면 가능

### Phase 1 선행 대기
- [ ] **M3~M4**: AI Assistant — 기존 chat_controller 확장이므로 일부 착수 가능
- [ ] **M5**: API Suite — JWT 인증 재활용하여 Schedule API부터 시작 가능

### 결정 대기 (Open Questions 해소 필요)
- [ ] **M6**: Wallet — PG사 선정 후

---

## 🎯 M1: Phase 1.5 Multi-Carrier UX 구현 가이드

### Step 1: 타입 확장 (Foundation)

**파일**: `src/types.ts`

```typescript
// CarrierResult 신규 타입 추가
export type CarrierBadge = 'cheapest' | 'fastest' | 'greenest' | null;

export type CarrierSortKey = 'price' | 'transit' | 'co2' | 'quality';

export interface CarrierResult {
  carrier: 'UPS' | 'DHL' | 'FEDEX';
  revenueKrw: number;
  costKrw: number;
  marginPct: number;
  transitDaysMin: number;    // 신규
  transitDaysMax: number;    // 신규
  co2Kg: number | null;      // 신규 (M2 후 값 채워짐)
  qualityScore: number;      // 1-5 (현재는 상수)
  badges: CarrierBadge[];    // 신규
}
```

**체크**: `npx tsc --noEmit` 통과

---

### Step 2: 캐리어 랭킹 서비스 (신규)

**파일**: `src/features/quote/services/carrierRanker.ts` (신규 생성)

```typescript
import type { CarrierResult, CarrierBadge, CarrierSortKey } from '@/types';

/** 최저가/최단/친환경 배지 할당 */
export function assignBadges(carriers: CarrierResult[]): CarrierResult[] {
  if (carriers.length === 0) return carriers;

  const cheapestIdx = carriers.reduce((min, c, i) =>
    c.revenueKrw < carriers[min].revenueKrw ? i : min, 0);
  const fastestIdx = carriers.reduce((min, c, i) =>
    c.transitDaysMin < carriers[min].transitDaysMin ? i : min, 0);
  const greenestIdx = carriers
    .map((c, i) => ({ i, co2: c.co2Kg }))
    .filter(x => x.co2 !== null)
    .reduce((min, x) => x.co2! < (carriers[min]?.co2Kg ?? Infinity) ? x.i : min, -1);

  return carriers.map((c, i) => {
    const badges: CarrierBadge[] = [];
    if (i === cheapestIdx) badges.push('cheapest');
    if (i === fastestIdx) badges.push('fastest');
    if (i === greenestIdx && greenestIdx !== -1) badges.push('greenest');
    return { ...c, badges };
  });
}

/** 선택한 기준으로 정렬 */
export function rankCarriers(
  carriers: CarrierResult[],
  sortBy: CarrierSortKey
): CarrierResult[] {
  const withBadges = assignBadges(carriers);
  return [...withBadges].sort((a, b) => {
    switch (sortBy) {
      case 'price': return a.revenueKrw - b.revenueKrw;
      case 'transit': return a.transitDaysMin - b.transitDaysMin;
      case 'co2':
        if (a.co2Kg === null && b.co2Kg === null) return 0;
        if (a.co2Kg === null) return 1;
        if (b.co2Kg === null) return -1;
        return a.co2Kg - b.co2Kg;
      case 'quality': return b.qualityScore - a.qualityScore;
    }
  });
}
```

**테스트**: `src/features/quote/services/__tests__/carrierRanker.test.ts`
- `assignBadges` — 3개 캐리어 중 각 1개가 최저가/최단/친환경 배지 받는지
- `rankCarriers` — 각 sortKey별 정렬 순서
- `co2Kg: null` 처리 (정렬 시 맨 뒤로)

---

### Step 3: 캐리어 메타데이터 상수 (임시 고정값)

**파일**: `src/config/carrier_metadata.ts` (신규)

```typescript
/** 캐리어별 메타데이터 — M1 단계에서는 고정값, 추후 Phase 1 API 연동 시 동적 전환 */
export const CARRIER_METADATA = {
  UPS: {
    transitDaysMin: 2,
    transitDaysMax: 5,
    qualityScore: 4.5,
    emissionFactor: 0.602, // kg CO2 / tonne-km (IATA RP1678 placeholder)
  },
  DHL: {
    transitDaysMin: 2,
    transitDaysMax: 4,
    qualityScore: 4.7,
    emissionFactor: 0.520,
  },
  FEDEX: {
    transitDaysMin: 3,
    transitDaysMax: 6,
    qualityScore: 4.3,
    emissionFactor: 0.645,
  },
} as const;
```

**주의**: 실제 소요일은 목적지별로 달라지므로 M1은 "대략치" 표시, Phase 1 API 연동 시 정확한 값으로 교체.

---

### Step 4: calculationService 통합

**파일**: `src/features/quote/services/calculationService.ts` 수정

기존 `calculateQuote()` 결과에 `carriers: CarrierResult[]` 필드 추가:

```typescript
import { CARRIER_METADATA } from '@/config/carrier_metadata';
import { assignBadges } from './carrierRanker';

// 기존 UPS/DHL 계산 후:
const carriers: CarrierResult[] = [
  {
    carrier: 'UPS',
    revenueKrw: upsResult.revenueKrw,
    costKrw: upsResult.costKrw,
    marginPct: upsResult.marginPct,
    transitDaysMin: CARRIER_METADATA.UPS.transitDaysMin,
    transitDaysMax: CARRIER_METADATA.UPS.transitDaysMax,
    co2Kg: null, // M2에서 채움
    qualityScore: CARRIER_METADATA.UPS.qualityScore,
    badges: [],
  },
  // DHL도 동일
];

const rankedCarriers = assignBadges(carriers);
```

---

### Step 5: UI 컴포넌트 업데이트

**파일**: `src/features/quote/components/CarrierComparisonCard.tsx` 수정

```tsx
// 1. 정렬 드롭다운 추가
const [sortBy, setSortBy] = useState<CarrierSortKey>('price');
const sorted = useMemo(() => rankCarriers(carriers, sortBy), [carriers, sortBy]);

// 2. 배지 컴포넌트 신규
const BadgeIcon = ({ badge }: { badge: CarrierBadge }) => {
  if (badge === 'cheapest') return <span title={t('badge.cheapest')}>💰</span>;
  if (badge === 'fastest') return <span title={t('badge.fastest')}>⚡</span>;
  if (badge === 'greenest') return <span title={t('badge.greenest')}>🌱</span>;
  return null;
};

// 3. TransitDaysRow, Co2Row 추가 (Co2는 M2 후 활성화)
```

---

### Step 6: i18n 키 추가

**파일**: `src/i18n/translations.ts`

```typescript
// en/ko/cn/ja 4개 언어 모두 추가
{
  'comparison.sortBy': { en: 'Sort by', ko: '정렬 기준', cn: '排序', ja: '並べ替え' },
  'comparison.sort.price': { en: 'Price', ko: '가격', cn: '价格', ja: '価格' },
  'comparison.sort.transit': { en: 'Transit Time', ko: '소요일', cn: '运输时间', ja: '配送日数' },
  'comparison.sort.co2': { en: 'CO2 Emissions', ko: 'CO2 배출량', cn: 'CO2排放', ja: 'CO2排出量' },
  'comparison.sort.quality': { en: 'Quality', ko: '품질', cn: '质量', ja: '品質' },
  'badge.cheapest': { en: 'Cheapest', ko: '최저가', cn: '最低价', ja: '最安' },
  'badge.fastest': { en: 'Fastest', ko: '최단', cn: '最快', ja: '最速' },
  'badge.greenest': { en: 'Eco-friendly', ko: '친환경', cn: '环保', ja: 'エコ' },
  'transit.days': { en: '{min}-{max} days', ko: '{min}~{max}일', cn: '{min}-{max}天', ja: '{min}〜{max}日' },
}
```

---

## ✅ Implementation Checklist (M1)

### 코드 변경
- [ ] Step 1: `src/types.ts` — CarrierResult 타입 확장
- [ ] Step 2: `src/features/quote/services/carrierRanker.ts` 생성
- [ ] Step 3: `src/config/carrier_metadata.ts` 생성
- [ ] Step 4: `calculationService.ts` — carriers 필드 통합
- [ ] Step 5: `CarrierComparisonCard.tsx` — 정렬/배지 UI 추가
- [ ] Step 6: `translations.ts` — i18n 키 추가 (4개 언어)

### 테스트
- [ ] `carrierRanker.test.ts` 신규 (8~10개 테스트)
- [ ] 기존 `calculationService.test.ts` 스냅샷 업데이트
- [ ] 기존 `ResultSection.test.tsx` 업데이트 (신규 필드 대응)

### 검증
- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run lint` 통과
- [ ] `npx vitest run` 모두 통과 (기존 1188개 + 신규)
- [ ] 수동 QA: 정렬 드롭다운 작동, 배지 표시 확인

### 문서
- [ ] `CLAUDE.md` — CarrierComparisonCard 설명 업데이트
- [ ] `USER_GUIDE_MEMBER.md` — 배지/정렬 기능 스크린샷 추가

---

## 🚫 M1 범위 밖 (다음 단계)

- ❌ 캐리어 실시간 API 연동 → Phase 1 (별도 설계 필요)
- ❌ CO2 실제 계산 → M2
- ❌ qualityScore 자동 산출 (과거 예약 데이터 기반) → Phase 2 완료 후
- ❌ FEDEX 실제 견적 계산 → 타입에만 추가, 계산 로직은 추후

---

## 📋 Dependencies

신규 npm 패키지: **없음** (기존 스택으로 충분)

---

## ⏭️ After M1 Completion

`/pdca analyze cargoai-roadmap` 실행 → Gap 분석

이후 순차 진행:
- M2: Phase 3.5 CO2 Dashboard (emission factor × distance 단순 공식부터)
- M3: Phase 4.5 AI — chat_controller 확장으로 NL 검색 우선 구현
