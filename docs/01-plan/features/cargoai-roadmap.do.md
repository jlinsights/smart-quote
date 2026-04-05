# CargoAI Roadmap — Do Phase (M2: Phase 3.5 CO2 추적)

> **Focus**: M2 = Phase 3.5 CO2 배출량 추적 중 **프론트엔드 슬라이스 우선**
> **이유**: 백엔드 테이블/API 없이도 `CARRIER_METADATA.emissionFactor` + 국가쌍 거리 테이블로 즉시 CO2 계산 → M1 greenest 배지 활성화 가능
> **Design Doc**: [cargoai-roadmap.design.md §4 Phase 3.5](../../02-design/features/cargoai-roadmap.design.md)
> **Plan Doc**: [cargoai-inspired-roadmap.plan.md](cargoai-inspired-roadmap.plan.md)
> **Date**: 2026-04-05

---

## 🎯 M2 스코프 분할

### M2a — Frontend-only CO2 계산 (이번 사이클)
- 즉시 구현 가능, 백엔드 의존 없음
- IATA RP1678 공식 + 국가쌍 거리 상수 테이블
- `CarrierComparisonItem.co2Kg` 채워짐 → greenest 배지 자동 활성화

### M2b — PDF 견적서 CO2 섹션 (이번 사이클 또는 M2a 검증 후)
- `pdfService.ts` 에 CO2 라인 추가

### M2c — 백엔드 CO2 API + Dashboard (별도 사이클)
- `co2_emission_rates`, `od_distances` 테이블
- `GET /api/v1/co2/summary` 등 4개 엔드포인트
- `Co2Dashboard.tsx` 위젯 (4 컴포넌트)

---

## 📐 M2a 설계 (IATA RP1678 단순 공식)

```
CO2(kg) = ChargeableWeightKg × DistanceKm × EmissionFactor × LoadFactor

• ChargeableWeightKg — QuoteResult.billableWeight (이미 계산됨)
• DistanceKm — 국가쌍 고정 테이블 (초기 50국 하드코딩)
• EmissionFactor — CARRIER_METADATA.emissionFactor (M1에서 이미 존재, kg CO2/tonne-km)
• LoadFactor — 항공화물 평균 탑재율 0.7 (IATA 가이드)
```

**공식 단위 정리:**
- `(kg × km × (kg CO2 / tonne-km) × loadFactor) / 1000 = kg CO2`
- ChargeableWeight 가 kg 이므로 tonne 변환 위해 `/ 1000` 필요

---

## ✅ 구현 체크리스트 (M2a)

### Step 1: 국가쌍 거리 테이블 (신규)

**파일**: `src/config/route_distances.ts`

```typescript
/**
 * Great-circle distance between major origin-destination country pairs (km).
 * Origin fixed at KR (South Korea). Phase 3.5 backend will replace with
 * destination-specific airport pair distance (od_distances table).
 */
export const ROUTE_DISTANCES_FROM_KR: Record<string, number> = {
  US: 11000,  // ICN → JFK
  JP: 1160,   // ICN → NRT
  CN: 950,    // ICN → PVG
  HK: 2080,
  SG: 4670,
  GB: 9000,
  DE: 8500,
  FR: 9000,
  IT: 9000,
  ES: 10400,
  // ... (확장 50~80국 필요)
  _DEFAULT: 9000, // fallback
};

export function getDistanceKm(destinationCountry: string): number {
  return ROUTE_DISTANCES_FROM_KR[destinationCountry.toUpperCase()]
    ?? ROUTE_DISTANCES_FROM_KR._DEFAULT;
}
```

**테스트**: `route_distances.test.ts` — 주요 10개국 조회 + fallback 검증

---

### Step 2: CO2 계산 유틸 (신규)

**파일**: `src/lib/co2.ts`

```typescript
import { CARRIER_METADATA } from '@/config/carrier_metadata';
import { getDistanceKm } from '@/config/route_distances';

const LOAD_FACTOR = 0.7;

/**
 * IATA RP1678 단순화 공식으로 항공 화물 CO2 배출량(kg) 계산.
 * Returns null if carrier metadata unavailable.
 */
export function calculateCo2Kg(
  carrier: 'UPS' | 'DHL' | 'FEDEX',
  billableWeightKg: number,
  destinationCountry: string,
): number | null {
  const meta = CARRIER_METADATA[carrier];
  if (!meta) return null;
  const distanceKm = getDistanceKm(destinationCountry);
  const co2 =
    (billableWeightKg * distanceKm * meta.emissionFactor * LOAD_FACTOR) / 1000;
  return Math.round(co2 * 100) / 100; // 2 decimal places
}
```

**테스트**: `co2.test.ts`
- UPS/DHL/FEDEX 3개 캐리어 × 3개 국가 = 9 케이스
- null billableWeight 0 → 0 반환
- unknown carrier → null
- 고정 시나리오: `UPS, 5kg, US → ≈ 23.2 kg CO2` 정확도 검증

---

### Step 3: CarrierComparisonCard에 CO2 통합

**파일 수정**: `src/features/quote/components/CarrierComparisonCard.tsx`

```tsx
import { calculateCo2Kg } from '@/lib/co2';

// buildItem 내부 수정 (현재 co2Kg: null)
const buildItem = (carrier, result): CarrierComparisonItem => {
  const meta = CARRIER_METADATA[carrier];
  return {
    carrier,
    // ... 기존 필드
    co2Kg: calculateCo2Kg(
      carrier,
      result.billableWeight,
      input.destinationCountry, // QuoteInput 필드 확인
    ),
    // ...
  };
};
```

**효과**: `assignBadges()` 의 greenest 인덱스 산출 로직이 null 아닌 실제 값 기반 작동 → 🌱 배지 활성화

**QuoteInput 필드 확인**: `destinationCountry` 혹은 `destCountry` 실제 이름 확인 필요 (src/types.ts)

---

### Step 4: UI 표시 (Co2Row 추가)

**파일 수정**: `src/features/quote/components/CarrierComparisonCard.tsx` — `CarrierColumn` 내부

```tsx
{co2Kg !== null && (
  <div>
    <span className="text-gray-500 dark:text-gray-400">{t('co2.label')}</span>
    <p className="font-semibold text-gray-800 dark:text-gray-200">
      {co2Kg.toFixed(1)} kg CO₂
    </p>
  </div>
)}
```

**Props 확장**: `CarrierColumnProps` 에 `co2Kg?: number | null` 추가.

---

### Step 5: i18n 키 추가 (4 언어)

**파일 수정**: `src/i18n/translations.ts`

```typescript
'co2.label': {
  ko: 'CO₂ 배출량',
  en: 'CO₂ Emissions',
  cn: 'CO₂排放',
  ja: 'CO₂排出量',
},
'co2.disclaimer': {
  ko: 'IATA RP1678 기준 추정치',
  en: 'Estimate per IATA RP1678',
  cn: '基于IATA RP1678的估算',
  ja: 'IATA RP1678準拠の推定値',
},
```

---

### Step 6: 검증

```bash
npx tsc --noEmit   # 타입 체크
npm run lint       # ESLint
npx vitest run     # 테스트 (기존 1208 + 신규 ~15)
```

**수동 QA**:
- Dashboard `/dashboard` 또는 `/quote` → 비교 카드에 CO2 값 노출 확인
- 견적 UPS vs DHL 전환 시 DHL(0.520 factor)이 greenest 배지 받는지 확인
- 4개 언어 전환 시 라벨 번역 확인

---

## 🚫 M2a 범위 밖 (M2b / M2c)

- ❌ PDF 견적서 CO2 섹션 → **M2b**
- ❌ Co2Dashboard 위젯 (월별 추이, 경로 Top 10) → **M2c (backend 선행)**
- ❌ `co2_emission_rates`, `od_distances` Rails 테이블 → **M2c**
- ❌ Admin Emission Factor CRUD → **M2c**
- ❌ 정확한 공항쌍 거리 (ICN → JFK 등) → **M2c** (현재는 국가 수도 대략치)

---

## 📋 Dependencies

신규 npm 패키지: **없음**

---

## ⏭️ After M2a Completion

```bash
/pdca analyze cargoai-roadmap   # Gap 검증
/pdca report cargoai-roadmap    # M2a 완료 보고서
```

이후:
- **M2b**: `pdfService.ts` 에 CO2 라인 (30분 작업 예상)
- **M2c**: 별도 PDCA 사이클 (backend 작업 포함, 2-3일)
- **M3**: Phase 4.5 AI 어시스턴트 (chat_controller 확장)
