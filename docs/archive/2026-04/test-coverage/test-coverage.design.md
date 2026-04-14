# Design: test-coverage

## 목표

6개 서브모듈 전용 Vitest 단위 테스트 파일 작성 — 각 파일당 10+ 케이스, 총 60+ 케이스.

---

## 아키텍처 결정

### 모킹 전략

| 파일 | 전략 | 이유 |
|------|------|------|
| `carrierRateEngine.test.ts` | 인라인 mock 요금표 | 순수 함수, 파라미터로 테이블 주입 → 모킹 필요 없음 |
| `itemCalculation.test.ts` | 실제 상수 import | `FUMIGATION_FEE`, `PACKING_MATERIAL_BASE_COST` 등 직접 참조 |
| `upsCalculation.test.ts` | 실제 tariff + zone | 실제 국가 코드 → 실제 zone → 실제 요금표 조회 (end-to-end) |
| `dhlCalculation.test.ts` | 실제 tariff + zone | 위와 동일 |
| `upsAddonCalculator.test.ts` | 실제 addon 상수, QuoteInput mock | config 상수 직접 사용, QuoteInput은 테스트별 구성 |
| `dhlAddonCalculator.test.ts` | 실제 addon 상수, QuoteInput mock | 위와 동일 |

### import 규칙

- Vitest globals 모드 → `describe`, `it`, `expect`, `vi` 글로벌, import 불필요
- 필요 시 타입만 import: `import type { QuoteInput } from '@/types'`
- 실제 상수 직접 import: `import { FUMIGATION_FEE } from '@/config/rates'`

---

## 출력 경로

```
src/features/quote/services/__tests__/
├── carrierRateEngine.test.ts
├── itemCalculation.test.ts
├── upsCalculation.test.ts
├── dhlCalculation.test.ts
├── upsAddonCalculator.test.ts
└── dhlAddonCalculator.test.ts
```

---

## 파일별 테스트 케이스 명세

---

### 1. `carrierRateEngine.test.ts`

**대상**: `lookupCarrierRate` (+ 내부 `roundToHalf` 간접 검증)

**mock 요금표 구조** (파일 상단 상수로 정의):

```typescript
// 인라인 mock — 실제 tariff 불필요
const MOCK_EXACT: ExactRateTable = {
  Z1: { 0.5: 10000, 1.0: 15000, 1.5: 20000, 2.0: 25000 },
  Z2: { 0.5: 12000, 1.0: 18000 },
}
const MOCK_RANGE: RangeRateEntry[] = [
  { min: 20.1, max: 70, rates: { Z1: 500, Z2: 700 } },
  { min: 70.1, max: 300, rates: { Z1: 450, Z2: 650 } },
]
```

**테스트 케이스 (14개)**:

| # | describe | it | 입력 | 기대값 |
|---|----------|----|------|--------|
| 1 | roundToHalf (via lookup) | 1.3 → 1.5로 반올림 | weight=1.3, zone=Z1 | 20000 (exactRates[Z1][1.5]) |
| 2 | roundToHalf (via lookup) | 1.0 → 1.0 그대로 | weight=1.0, zone=Z1 | 15000 |
| 3 | roundToHalf (via lookup) | 0.3 → 0.5로 반올림 | weight=0.3, zone=Z1 | 10000 |
| 4 | roundToHalf (via lookup) | 1.1 → 1.5로 반올림 | weight=1.1, zone=Z1 | 20000 |
| 5 | exactRates 직접 명중 | 정확한 키 존재 시 | weight=2.0, zone=Z1 | 25000 |
| 6 | exactRates 직접 명중 | Z2 zone 정확 명중 | weight=1.0, zone=Z2 | 18000 |
| 7 | rangeRates 명중 | 범위 내 무게 | weight=25.0, zone=Z1 | Math.ceil(25.0) * 500 = 12500 |
| 8 | rangeRates 명중 | 범위 내 무게 Z2 | weight=30.0, zone=Z2 | Math.ceil(30.0) * 700 = 21000 |
| 9 | rangeRates 명중 | 경계 min 값 | weight=20.1, zone=Z1 | Math.ceil(20.1) * 500 = 10500 |
| 10 | rangeRates 명중 | 2번째 범위 | weight=100.0, zone=Z1 | 100 * 450 = 45000 |
| 11 | fallback (exact 다음 키) | 정확 키 없음, rangeRates 안에도 없음 → 다음 키 fallback | weight=1.7 (→1.5 없음→2.0 fallback), zone=Z1 | 25000 |
| 12 | 에러 throw | 존재하지 않는 zone | weight=1.0, zone=Z99 | throw "Rate not found: zone=Z99" |
| 13 | 에러 throw | exactRates/rangeRates 모두 해당 없음 | weight=500, zone=Z1 (range max=300) | throw "Rate not found" |
| 14 | 타입 안전성 | 반환값 number | weight=1.0, zone=Z1 | typeof result === 'number' |

---

### 2. `itemCalculation.test.ts`

**대상**: `calculateVolumetricWeight`, `calculateItemCosts`, `computePackingTotal`

**필요 import**:
```typescript
import { calculateVolumetricWeight, calculateItemCosts, computePackingTotal } from '../itemCalculation'
import { PackingType } from '@/types'
import { FUMIGATION_FEE, PACKING_MATERIAL_BASE_COST, PACKING_LABOR_UNIT_COST } from '@/config/rates'
```

**테스트 케이스 (15개)**:

| # | describe | it | 입력 | 기대값 |
|---|----------|----|------|--------|
| 1 | calculateVolumetricWeight | 기본 divisor=5000 | l=10,w=10,h=10 | 10*10*10/5000 = 0.2 |
| 2 | calculateVolumetricWeight | 소수 올림 후 계산 | l=10.1,w=10.1,h=10.1 | Math.ceil(10.1)^3/5000 = 11^3/5000 = 0.266... |
| 3 | calculateVolumetricWeight | 큰 박스 | l=100,w=80,h=60 | 100*80*60/5000 = 96 |
| 4 | calculateVolumetricWeight | custom divisor | l=10,w=10,h=10, divisor=6000 | 1000/6000 ≈ 0.167 |
| 5 | calculateItemCosts | STANDARD packing, 1개 아이템 | items=[{l:50,w:40,h:30,qty:1}], STANDARD | surfaceArea=(2*(50*40+50*30+40*30))/10000*PACKING_MATERIAL_BASE_COST*1 + PACKING_LABOR_UNIT_COST*1 |
| 6 | calculateItemCosts | VACUUM packing 1.5x 노동비 | items=[{l:30,w:20,h:10,qty:1}], VACUUM | laborCost = PACKING_LABOR_UNIT_COST * 1.5 |
| 7 | calculateItemCosts | manualPackingCost override → material+labor 대체 | items=[{...}], STANDARD, manualPackingCost=50000 | packingMaterialCost=0, packingLaborCost=0, manualPackingCost 반영 |
| 8 | calculateItemCosts | qty=3 아이템 | items=[{l:20,w:20,h:20,qty:3}] | materialCost * 3, laborCost * 3 |
| 9 | calculateItemCosts | 여러 아이템 합산 | items=[{...qty:1},{...qty:2}] | 각 아이템 비용 합산 |
| 10 | computePackingTotal | STANDARD packing → fumigationCost=FUMIGATION_FEE | material=10000, labor=20000, STANDARD | total = 10000+20000+FUMIGATION_FEE |
| 11 | computePackingTotal | NONE packing → fumigationCost=0 | material=10000, labor=5000, NONE | total = 10000+5000+0 |
| 12 | computePackingTotal | manualPackingCost 있으면 fumigation=0 | material=0, labor=0, STANDARD, manual=50000 | fumigationCost=0, total=50000 |
| 13 | computePackingTotal | WOODEN_BOX packing → fumigation 부과 | material=20000, labor=30000, WOODEN_BOX | total = 20000+30000+FUMIGATION_FEE |
| 14 | computePackingTotal | VACUUM packing → fumigation 부과 | material=15000, labor=37500, VACUUM | total = 15000+37500+FUMIGATION_FEE |
| 15 | calculateItemCosts | 반환 구조 확인 | any valid input | { packingMaterialCost, packingLaborCost, fumigationCost } |

---

### 3. `upsCalculation.test.ts`

**대상**: `calculateUpsCosts`

**필요 import**:
```typescript
import { calculateUpsCosts } from '../upsCalculation'
import { WAR_RISK_SURCHARGE_RATE } from '@/config/rates'
```

**테스트 케이스 (10개)**:

| # | describe | it | 입력 | 기대값 |
|---|----------|----|------|--------|
| 1 | 구조 검증 | 반환 필드 확인 | weight=5, country='US' | { intlBase, intlFsc, intlWarRisk, appliedZone, transitTime } 모두 존재 |
| 2 | 구조 검증 | intlFsc는 항상 0 | weight=5, country='US' | intlFsc === 0 |
| 3 | 구조 검증 | WAR_RISK_SURCHARGE_RATE=0이므로 intlWarRisk=0 | weight=10, country='JP' | intlWarRisk === 0 |
| 4 | zone 매핑 | US → Z5 zone | weight=5, country='US' | appliedZone 포함 'Z5' 또는 zone5 label |
| 5 | zone 매핑 | JP → Z2 zone | weight=5, country='JP' | appliedZone Z2 label |
| 6 | zone 매핑 | SG → Z1 zone | weight=5, country='SG' | appliedZone Z1 label |
| 7 | zone 매핑 | IL → Z9 zone | weight=5, country='IL' | appliedZone Z9 label |
| 8 | 요금 단조증가 | 무게 증가 시 요금 증가 | country='US', weight 5→10 | rate(10) >= rate(5) |
| 9 | 요금 > 0 | 유효한 국가/무게 | weight=1.0, country='US' | intlBase > 0 |
| 10 | transitTime | transitTime 존재 | weight=5, country='US' | typeof transitTime === 'string' 또는 number |

---

### 4. `dhlCalculation.test.ts`

**대상**: `calculateDhlCosts`

**필요 import**:
```typescript
import { calculateDhlCosts } from '../dhlCalculation'
import { WAR_RISK_SURCHARGE_RATE } from '@/config/rates'
```

**테스트 케이스 (10개)**:

| # | describe | it | 입력 | 기대값 |
|---|----------|----|------|--------|
| 1 | 구조 검증 | 반환 필드 확인 | weight=5, country='US' | { intlBase, intlFsc, intlWarRisk, appliedZone, transitTime } |
| 2 | 구조 검증 | intlFsc는 항상 0 | weight=5, country='US' | intlFsc === 0 |
| 3 | 구조 검증 | intlWarRisk=0 (WAR_RISK=0) | weight=10, country='JP' | intlWarRisk === 0 |
| 4 | zone 매핑 | JP → DHL 해당 zone | weight=5, country='JP' | appliedZone 유효 |
| 5 | zone 매핑 | US → DHL 해당 zone | weight=5, country='US' | appliedZone 유효 |
| 6 | zone 매핑 | SG → DHL zone | weight=5, country='SG' | appliedZone 유효 |
| 7 | zone 매핑 | CN → DHL zone | weight=5, country='CN' | appliedZone 유효 |
| 8 | 요금 단조증가 | 무게 증가 시 요금 증가 | country='US', weight 5→20 | rate(20) >= rate(5) |
| 9 | 요금 > 0 | 유효한 국가/무게 | weight=1.0, country='US' | intlBase > 0 |
| 10 | UPS vs DHL 비교 | 동일 국가/무게 요금이 다름 | weight=5, country='US' | upsBase !== dhlBase (다른 요금표) |

---

### 5. `upsAddonCalculator.test.ts`

**대상**: `calculateUpsAddOnCosts`

**필요 import**:
```typescript
import { calculateUpsAddOnCosts } from '../upsAddonCalculator'
import { Incoterm, PackingType } from '@/types'
import { UPS_ADDON_RATES } from '@/config/ups_addons'
```

**헬퍼**: `baseInput` — 최소 유효 QuoteInput 구성 함수 (스프레드로 오버라이드)

```typescript
const baseInput = (overrides = {}): QuoteInput => ({
  destinationCountry: 'US',
  incoterm: Incoterm.DAP,
  packingType: PackingType.STANDARD,
  items: [{ length: 30, width: 20, height: 15, weight: 5, quantity: 1 }],
  requestedAddons: [],
  ...overrides,
})
```

**테스트 케이스 (17개)**:

| # | describe | it | 입력 | 기대값 |
|---|----------|----|------|--------|
| 1 | AHS 자동감지 | weight>25kg → AHS 부과 | weight=26, packingType=STANDARD | additionalHandling.amount > 0 |
| 2 | AHS 자동감지 | 정확히 25kg → AHS 없음 | weight=25 | additionalHandling === undefined 또는 0 |
| 3 | AHS 자동감지 | longest>122cm → AHS 부과 | items[0].length=130 | AHS 부과 |
| 4 | AHS 자동감지 | 2nd longest>76cm → AHS 부과 | items[0]: 100×80×50 (2nd=80) | AHS 부과 |
| 5 | AHS 자동감지 | WOODEN_BOX packing → AHS 부과 | packingType=WOODEN_BOX, weight=10 | AHS 부과 |
| 6 | AHS 자동감지 | SKID packing → AHS 부과 | packingType=SKID, weight=10 | AHS 부과 |
| 7 | DDP 자동감지 | Incoterm.DDP → 28500 추가 | incoterm=DDP | ddp.amount === UPS_ADDON_RATES.DDP (28500) |
| 8 | DDP 자동감지 | DDP는 FSC 미적용 | incoterm=DDP, fscPercent=48.5 | ddp FSC 없음 |
| 9 | Surge Fee | IL → 4722/kg + FSC | country='IL', weight=10, fsc=48.5 | surgeFee = Math.ceil(10) * 4722 * (1 + 48.5/100) |
| 10 | Surge Fee | ME 국가(AE) → 2004/kg + FSC | country='AE', weight=5, fsc=48.5 | surgeFee = Math.ceil(5) * 2004 * (1 + 48.5/100) |
| 11 | Surge Fee | 일반 국가(US) → Surge 없음 | country='US' | surgeFee === undefined 또는 0 |
| 12 | RMT 선택 | max(31400, ceil(wt)*570) | requestedAddons=['RMT'], weight=60 | max(31400, 60*570) = 34200 |
| 13 | RMT 선택 | 최소값 적용 | requestedAddons=['RMT'], weight=10 | max(31400, 10*570) = 31400 |
| 14 | EXT 선택 | max(34200, ceil(wt)*640) | requestedAddons=['EXT'], weight=60 | max(34200, 60*640) = 38400 |
| 15 | ADC 선택 | 박스 수량 * 15100 | requestedAddons=['ADC'], items=[{qty:3}] | 3 * 15100 = 45300 |
| 16 | DB override | resolvedAddonRates 있을 때 DB 요금 사용 | resolvedAddonRates=[{carrier:'UPS',code:'AHS',amount:25000,detectRule:'weight>20'}], weight=22 | AHS.amount === 25000 (DB 값) |
| 17 | 반환 구조 | 빈 addons | no addons, US, DAP, 5kg | 반환값 배열 또는 객체, 에러 없음 |

---

### 6. `dhlAddonCalculator.test.ts`

**대상**: `calculateDhlAddOnCosts`

**필요 import**:
```typescript
import { calculateDhlAddOnCosts } from '../dhlAddonCalculator'
import { Incoterm, PackingType } from '@/types'
import { DHL_ADDON_RATES } from '@/config/dhl_addons'
```

**헬퍼**: `baseInput` (upsAddonCalculator와 동일 패턴)

**테스트 케이스 (14개)**:

| # | describe | it | 입력 | 기대값 |
|---|----------|----|------|--------|
| 1 | OSP 자동감지 | longest>100cm → OSP | items[0].length=110 | osp.amount === 30000 per piece |
| 2 | OSP 자동감지 | 2nd dim>80cm → OSP | items[0]: 90×85×50 | OSP 부과 |
| 3 | OSP 자동감지 | 경계값 (100cm 이하) → OSP 없음 | items[0]: 100×80×50 (정확히 경계) | OSP 없음 |
| 4 | OSP 자동감지 | qty=2 → 2개 비용 | items[0].length=110, qty=2, fsc=46 | osp = 2 * 30000 * (1 + 46/100) |
| 5 | OWT 자동감지 | weight>70kg → OWT | weight=71 | owt.amount === 150000 (per carton) |
| 6 | OWT 자동감지 | 정확히 70kg → OWT 없음 | weight=70 | OWT 없음 |
| 7 | OWT 자동감지 | FSC 적용 | weight=80, fsc=46 | owt = 150000 * (1 + 46/100) |
| 8 | RMT 선택 | max(35000, ceil(wt)*750) | requestedAddons=['RMT'], weight=50 | max(35000, 50*750) = 37500 |
| 9 | RMT 선택 | 최소값 적용 | requestedAddons=['RMT'], weight=10 | 35000 |
| 10 | INS 선택 | max(declaredValue*0.01, 17000) | requestedAddons=['INS'], declaredValue=5000000 | max(50000, 17000) = 50000 |
| 11 | INS 선택 | 최소값 적용 | requestedAddons=['INS'], declaredValue=100000 | max(1000, 17000) = 17000 |
| 12 | IRR 선택 | 개당 * 수량 | requestedAddons=['IRR'], items=[{qty:3}] | 3 * DHL_IRR_UNIT |
| 13 | DB override | resolvedAddonRates 있을 때 DB 요금 사용 | resolvedAddonRates=[{carrier:'DHL',code:'OSP',amount:35000,detectRule:'length>90'}], items[0].length=95 | OSP.amount === 35000 |
| 14 | 반환 구조 | 빈 addons, 정상 반환 | no addons, US, DAP, 5kg | 에러 없음, 빈 addons |

---

## 구현 순서

1. `carrierRateEngine.test.ts` — 14 케이스 (mock 요금표 인라인)
2. `itemCalculation.test.ts` — 15 케이스 (실제 상수 import)
3. `upsCalculation.test.ts` — 10 케이스 (실제 tariff)
4. `dhlCalculation.test.ts` — 10 케이스 (실제 tariff)
5. `upsAddonCalculator.test.ts` — 17 케이스 (baseInput 헬퍼)
6. `dhlAddonCalculator.test.ts` — 14 케이스 (baseInput 헬퍼)

**총**: 80 케이스 (목표 60+ 초과)

---

## 검증 기준

| 기준 | 목표 |
|------|------|
| 신규 테스트 파일 수 | 6개 |
| 신규 테스트 케이스 수 | 80개 |
| 전체 Vitest pass | (기존 1246+) + 80 / 전체 |
| TypeScript 에러 | 0 |
| ESLint 경고 | 0 |

---

## 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| `roundToHalf` private → 직접 테스트 불가 | `lookupCarrierRate` 호출 결과로 간접 검증 |
| DB override path QuoteInput 타입 복잡 | `resolvedAddonRates` 최소 구조만 주입 |
| 실제 tariff 값 변경 가능성 | 단조증가/구조 검증 위주 (정확한 숫자보다 속성 검증) |
| `QuoteInput` 필수 필드 다수 | `baseInput` 헬퍼로 최소 유효 구조 공유 |

---

_Created: 2026-04-15 | Feature: test-coverage | Phase: design_
