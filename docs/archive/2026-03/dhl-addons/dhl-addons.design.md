# Carrier Add-on Services Design Document

> **Feature**: dhl-addons (DHL + UPS 부가서비스 통합)
> **Plan Reference**: `docs/01-plan/features/dhl-addons.plan.md`
> **Author**: jaehong
> **Date**: 2026-03-12
> **Status**: Design Phase

---

## 1. DHL 부가서비스 (구현 완료 - 참조용)

### 1.1 파일 구조

| 파일 | 역할 | 상태 |
|------|------|------|
| `src/config/dhl_addons.ts` | DHL 13종 요금 + 헬퍼 함수 | ✅ |
| `src/features/quote/components/DhlAddOnPanel.tsx` | DHL 부가서비스 UI | ✅ |
| `src/features/quote/services/calculationService.ts` | `calculateDhlAddOnCosts()` | ✅ |
| `src/features/quote/components/CostBreakdownCard.tsx` | DHL add-on 상세 표시 | ✅ |
| `src/types.ts` | `dhlAddOns`, `dhlDeclaredValue`, `dhlAddOnTotal`, `dhlAddOnDetails` | ✅ |

### 1.2 DHL 인터페이스 (기존)

```typescript
// QuoteInput 확장
dhlAddOns?: string[];       // ['SAT', 'RES', 'INS']
dhlDeclaredValue?: number;  // 보험용 신고가 (KRW)

// CostBreakdown 확장
dhlAddOnTotal?: number;
dhlAddOnDetails?: Array<{ code, nameKo, nameEn, amount, fscAmount }>;
```

---

## 2. UPS 부가서비스 설계 (신규)

### 2.1 요금표 (`src/config/ups_addons.ts`)

```typescript
export interface UpsAddOn {
  code: string;
  nameKo: string;
  nameEn: string;
  amount: number;              // KRW (고정 또는 계산 기본값)
  chargeType: 'fixed' | 'per_carton' | 'calculated';
  unit: 'shipment' | 'carton';
  fscApplicable: boolean;
  autoDetect?: boolean;        // AHS 자동감지
  selectable: boolean;         // 사용자 선택 가능 여부
  condition?: string;          // 특수 조건 (예: DDP only)
  description?: string;
}

export const UPS_ADDON_RATES: UpsAddOn[] = [
  {
    code: 'RES',
    nameKo: '주거지역 서비스',
    nameEn: 'Residential Delivery',
    amount: 4_600,
    chargeType: 'fixed',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
  },
  {
    code: 'RMT',
    nameKo: '외곽요금',
    nameEn: 'Remote Area Surcharge',
    amount: 31_400,           // max(31,400, kg당 570)
    chargeType: 'calculated',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
    description: '최소 31,400원 또는 KG당 570원 중 큰 값',
  },
  {
    code: 'EXT',
    nameKo: '원거리지역 서비스',
    nameEn: 'Extended Area Surcharge',
    amount: 34_200,           // max(34,200, kg당 640)
    chargeType: 'calculated',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
    description: '최소 34,200원 또는 KG당 640원 중 큰 값',
  },
  {
    code: 'AHS',
    nameKo: '비규격품부가요금',
    nameEn: 'Additional Handling',
    amount: 21_400,
    chargeType: 'per_carton',
    unit: 'carton',
    fscApplicable: true,
    autoDetect: true,          // 기존 SURGE_THRESHOLDS 기반 자동감지
    selectable: false,
    description: 'AHS Weight(>25kg) 또는 AHS Dim(L>122cm, W>76cm) 또는 특수포장',
  },
  {
    code: 'ADC',
    nameKo: '주소정정',
    nameEn: 'Address Correction',
    amount: 15_100,
    chargeType: 'per_carton',
    unit: 'carton',
    fscApplicable: false,
    selectable: true,
  },
  {
    code: 'DDP',
    nameKo: 'DDP 수수료',
    nameEn: 'DDP Service Fee',
    amount: 28_500,
    chargeType: 'fixed',
    unit: 'shipment',
    fscApplicable: false,
    selectable: false,         // incoterm=DDP일 때 자동 적용
    condition: 'DDP',
    description: 'DDP incoterm 선택 시 자동 부과',
  },
];
```

### 2.2 헬퍼 함수

```typescript
/** UPS Remote Area: max(31,400, billableWeight * 570) */
export const calculateUpsRemoteAreaFee = (billableWeight: number): number =>
  Math.max(31_400, Math.ceil(billableWeight) * 570);

/** UPS Extended Area: max(34,200, billableWeight * 640) */
export const calculateUpsExtendedAreaFee = (billableWeight: number): number =>
  Math.max(34_200, Math.ceil(billableWeight) * 640);

/** UPS AHS 감지: 기존 SURGE_THRESHOLDS 기준 재사용 */
export const isUpsAdditionalHandling = (
  l: number, w: number, h: number, weight: number, packingType: PackingType
): boolean => {
  const sorted = [l, w, h].sort((a, b) => b - a);
  return (
    weight > 25 ||                    // AHS_WEIGHT_KG
    sorted[0] > 122 ||               // AHS_DIM_LONG_SIDE_CM
    sorted[1] > 76 ||                // AHS_DIM_SECOND_SIDE_CM
    ['WOODEN_BOX', 'SKID'].includes(packingType)
  );
};
```

### 2.3 Types 확장 (`src/types.ts`)

```typescript
// QuoteInput에 추가
upsAddOns?: string[];         // 선택형 UPS add-on codes ['RES', 'RMT']

// CostBreakdown에 추가 (DHL과 통합 또는 별도)
// → 기존 dhlAddOnTotal/dhlAddOnDetails를 carrier-agnostic으로 리네이밍 고려
// 결정: carrierAddOnTotal / carrierAddOnDetails로 통합
```

**설계 결정: 필드 통합**

기존 `dhlAddOnTotal` / `dhlAddOnDetails`를 **carrier-agnostic** 필드로 리네이밍:

```typescript
// Before (DHL-specific)
dhlAddOnTotal?: number;
dhlAddOnDetails?: Array<{ code, nameKo, nameEn, amount, fscAmount }>;

// After (carrier-agnostic) — 호환성을 위해 기존 필드 유지 + alias
// → 결정: 기존 dhl 필드를 유지하고 UPS도 동일 필드 사용
//   이유: CostBreakdown은 carrier 무관하게 add-on을 표시하므로 공통 필드가 적합
//   실행: dhlAddOnTotal/dhlAddOnDetails를 addOnTotal/addOnDetails로 변경
```

**최종 결정**: 코드 변경 최소화를 위해 **기존 `dhlAddOnTotal`/`dhlAddOnDetails` 필드를 DHL/UPS 공용으로 사용**. 필드명은 향후 리팩토링 시 변경 가능. 현재는 carrier가 DHL이면 DHL 계산, UPS면 UPS 계산 결과를 동일 필드에 저장.

---

## 3. UI 설계

### 3.1 UpsAddOnPanel 컴포넌트

**파일**: `src/features/quote/components/UpsAddOnPanel.tsx`

**Props** (DhlAddOnPanel과 동일 구조):

```typescript
interface Props {
  selectedAddOns: string[];
  onAddOnsChange: (codes: string[]) => void;
  items: CargoItem[];
  packingType: PackingType;
  billableWeight: number;
  fscPercent: number;
  isMobileView: boolean;
  incoterm: string;           // DDP 자동 적용 판단용
}
```

**렌더링 규칙**:

| 코드 | 표시 방식 |
|------|----------|
| RES | 체크박스 (선택형) |
| RMT | 체크박스 + 계산값 표시 `max(31,400, kg×570)` |
| EXT | 체크박스 + 계산값 표시 `max(34,200, kg×640)` |
| AHS | 자동감지 경고 배너 (주황색, DHL OSP/OWT와 동일 UX) |
| ADC | 체크박스 (선택형) |
| DDP | incoterm=DDP일 때 자동표시 (선택 불가, 정보 배너) |

**자동감지 배너**:
```
⚠️ Additional Handling (AHS) 자동 감지: 3개
  — 21,400 × 3 = 64,200 KRW (+FSC)
```

**DDP 자동 배너**:
```
ℹ️ DDP Service Fee 자동 적용: 28,500 KRW
```

### 3.2 ServiceSection 통합

```tsx
// ServiceSection.tsx 내 조건부 렌더링
{carrier === 'DHL' && <DhlAddOnPanel ... />}
{carrier === 'UPS' && <UpsAddOnPanel ... />}
// EMAX는 부가서비스 없음
```

### 3.3 CostBreakdownCard 표시

기존 DHL add-on 표시 로직을 그대로 활용. `dhlAddOnDetails` 필드에 UPS 데이터도 동일 형식으로 저장되므로 UI 변경 불필요. 단, 헤더 라벨을 carrier-aware로 변경:

```tsx
// Before
<span>DHL Add-ons</span>

// After
<span>{result.carrier} Add-ons</span>
```

---

## 4. 계산 엔진 설계

### 4.1 `calculateUpsAddOnCosts()` 함수

**파일**: `src/features/quote/services/calculationService.ts`

```typescript
const calculateUpsAddOnCosts = (
  input: QuoteInput,
  billableWeight: number,
  fscPercent: number
): { total: number; details: AddOnDetail[] } => {
  const fscRate = (fscPercent || 0) / 100;
  const details: AddOnDetail[] = [];
  let total = 0;

  // 1. 자동감지: AHS (Additional Handling)
  let ahsCount = 0;
  input.items.forEach((item) => {
    let l = item.length, w = item.width, h = item.height;
    let weight = item.weight;
    if (input.packingType !== PackingType.NONE) {
      l += 10; w += 10; h += 15;
      weight = weight * 1.1 + 10;
    }
    if (isUpsAdditionalHandling(l, w, h, weight, input.packingType)) {
      ahsCount += item.quantity;
    }
  });
  if (ahsCount > 0) {
    const rate = UPS_ADDON_RATES.find(a => a.code === 'AHS')!;
    const amount = rate.amount * ahsCount;
    const fsc = rate.fscApplicable ? amount * fscRate : 0;
    details.push({ code: 'AHS', nameKo: rate.nameKo, nameEn: rate.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  }

  // 2. 자동적용: DDP 수수료 (incoterm=DDP일 때)
  if (input.incoterm === Incoterm.DDP) {
    const ddpRate = UPS_ADDON_RATES.find(a => a.code === 'DDP')!;
    details.push({ code: 'DDP', nameKo: ddpRate.nameKo, nameEn: ddpRate.nameEn, amount: ddpRate.amount, fscAmount: 0 });
    total += ddpRate.amount;
  }

  // 3. 사용자 선택형
  const selectedCodes = input.upsAddOns || [];
  selectedCodes.forEach((code) => {
    const addon = UPS_ADDON_RATES.find(a => a.code === code);
    if (!addon) return;
    let amount = addon.amount;
    if (code === 'RMT') amount = calculateUpsRemoteAreaFee(billableWeight);
    if (code === 'EXT') amount = calculateUpsExtendedAreaFee(billableWeight);
    if (code === 'ADC') {
      const totalCartons = input.items.reduce((s, i) => s + i.quantity, 0);
      amount = addon.amount * totalCartons;
    }
    const fsc = addon.fscApplicable ? amount * fscRate : 0;
    details.push({ code, nameKo: addon.nameKo, nameEn: addon.nameEn, amount, fscAmount: fsc });
    total += amount + fsc;
  });

  return { total, details };
};
```

### 4.2 `calculateQuote()` 통합

```typescript
// 기존 DHL 블록 확장
let addOnTotal = 0;
let addOnDetails: AddOnDetail[] | undefined;

if (carrier === 'DHL') {
  const result = calculateDhlAddOnCosts(input, billableWeight, fscPercent);
  addOnTotal = result.total;
  addOnDetails = result.details.length > 0 ? result.details : undefined;
} else if (carrier === 'UPS') {
  const result = calculateUpsAddOnCosts(input, billableWeight, fscPercent);
  addOnTotal = result.total;
  addOnDetails = result.details.length > 0 ? result.details : undefined;
}
// EMAX: no add-ons

// breakdown에 저장
breakdown.dhlAddOnTotal = addOnTotal || undefined;
breakdown.dhlAddOnDetails = addOnDetails;
```

---

## 5. 기존 Surge와의 관계

### 5.1 현재 구조

| 시스템 | 적용 대상 | 소스 |
|--------|----------|------|
| `appliedSurcharges` | DB 기반 자동 할증료 (SurchargeResolver) | Supabase surcharges 테이블 |
| `manualSurgeCost` | 수동 입력 할증 | 사용자 직접 입력 |
| `dhlAddOnTotal` | DHL/UPS 부가서비스 | config 파일 기반 |

### 5.2 충돌 방지

- DB surcharges (V1/V2)는 carrier-route 기반 자동 할증 → **별도 필드** `intlSurge`
- Carrier add-ons는 서비스별 선택/자동감지 → **별도 필드** `dhlAddOnTotal`
- 양쪽 모두 `totalCostAmount`에 합산되지만 breakdown에서 별도 표시
- **UPS AHS**: 기존 `calculateItemSurge()`의 AHS 로직과 중복될 수 있으나, 현재 surge auto-calc이 비활성화 상태이므로 충돌 없음

---

## 6. 구현 순서

| # | 작업 | 파일 | 의존성 |
|---|------|------|--------|
| 1 | UPS 요금표 config 생성 | `src/config/ups_addons.ts` | 없음 |
| 2 | Types 확장 (upsAddOns) | `src/types.ts` | #1 |
| 3 | UpsAddOnPanel UI | `src/features/quote/components/UpsAddOnPanel.tsx` | #1 |
| 4 | ServiceSection 통합 | `ServiceSection.tsx` | #3 |
| 5 | `calculateUpsAddOnCosts()` | `calculationService.ts` | #1 |
| 6 | `calculateQuote()` UPS 분기 | `calculationService.ts` | #5 |
| 7 | CostBreakdownCard 라벨 수정 | `CostBreakdownCard.tsx` | #6 |
| 8 | 스냅샷 테스트 업데이트 | `calculationParity.test.ts` | #6 |
| 9 | PDF 출력 통합 | `pdfService.ts` | #6 |
| 10 | Backend 동기화 (Rails) | `quote_calculator.rb` 등 | #6 |

---

## 7. 검증 체크리스트

- [ ] UPS 선택 시 UpsAddOnPanel 표시
- [ ] AHS 자동감지 (weight>25kg, dim>122/76cm, wood/skid)
- [ ] DDP incoterm일 때 DDP 수수료 자동 적용
- [ ] RMT 계산: max(31,400, kg×570)
- [ ] EXT 계산: max(34,200, kg×640)
- [ ] ADC: 카톤수 × 15,100
- [ ] FSC 적용 항목 정확성 (RES, RMT, EXT, AHS만 FSC)
- [ ] CostBreakdown에 UPS add-on 상세 표시
- [ ] carrier 전환 시 add-on 상태 초기화
- [ ] DHL 기존 기능 정상 동작 (regression 없음)
- [ ] 모바일 뷰 정상 표시
- [ ] 모든 기존 테스트 통과
