# Design: packing-docs-simplify

> Packing & Docs 비용 로직 단순화 및 UI 개선 — 기술 설계서

**Plan Reference**: `docs/01-plan/features/packing-docs-simplify.plan.md`

---

## 1. 아키텍처 개요

### 비용 흐름 (Before → After)

```
[BEFORE]
PackingType 선택 → auto-calc (material + labor + fumigation)
                  + HANDLING_FEE (35,000 항상 포함)
                  = Packing & Docs 표시

manualPackingCost 입력 → material=override, labor=0, fumigation=0, handling=0
                       = Override 값만 표시

[AFTER]
PackingType 선택 → auto-calc (material + labor + fumigation)
                  + handling = 0 (항상)
                  = Packing & Docs 표시 (NONE이면 0 → 숨김)

manualPackingCost 입력 → material=override, labor=0, fumigation=0, handling=0
                       = Override 값만 표시

미입력 + NONE     → 0원 → COST BASIS에서 행 숨김
```

### 핵심 원칙
1. **사용자 입력 존중**: Override 입력값 = COST BASIS 표시값 (1:1 매칭)
2. **자동 비용 없음**: 핸들링비 자동 포함 제거
3. **깔끔한 UI**: 0원 항목은 표시하지 않음
4. **참고 안내만**: Calculation Basis는 ServiceSection에서 참고용으로만 표시

---

## 2. 컴포넌트 설계

### 2.1 calculationService.ts (프론트엔드 계산 엔진)

**변경 위치**: `calculateQuote()` 함수 (line ~593)

```typescript
// BEFORE
let finalHandlingFee = HANDLING_FEE; // 35,000 항상
if (manualPackingCost override) { finalHandlingFee = 0; }

// AFTER
let finalHandlingFee = 0; // 항상 0
if (manualPackingCost override) { packingFumigationCost = 0; }
```

**변경 위치**: `calculateItemCosts()` 함수 (line ~238)
- Override 시: `packingMaterialCost = manualPackingCost`, `packingLaborCost = 0`
- 미변경 (기존 로직 유지)

**영향 범위**:
- `packingTotal = material + labor + fumigation` (handling 제외)
- `totalCostAmount = packingTotal + 0 + intlTotal + ...`
- `quoteBasisCost` 계산에 영향 → margin 산출에 영향

### 2.2 quote_calculator.rb (백엔드 계산 엔진)

**변경 위치**: `call()` 메서드 (line ~32)

```ruby
# BEFORE
final_handling_fee = HANDLING_FEE  # 35,000
if manualPackingCost override → final_handling_fee = 0

# AFTER
final_handling_fee = 0  # 항상 0
if manualPackingCost override → packing_fumigation_cost = 0
```

**동기화 원칙**: 프론트엔드와 100% 동일 로직

### 2.3 CostBreakdownCard.tsx (비용 세부내역 UI)

**제거 항목**:
- `useState(false)` — `showPackingInfo` state
- `HelpCircle`, `X` — lucide-react import
- ? 버튼 + Calculation Basis 확장 패널

**변경 항목**:
```tsx
// BEFORE: 항상 표시
<div>Packing & Docs → ₩{material + labor + fumigation + handling}</div>

// AFTER: 0원이면 숨김
{(material + labor + fumigation + handling) > 0 && (
  <div>Packing & Docs → ₩{...}</div>
)}
```

### 2.4 ServiceSection.tsx (부가 서비스 옵션 입력)

**변경 항목**: PackingCostOverrideField 안내 문구

```tsx
// BEFORE
"Enter cost to override auto-calculation of Material, Labor, Fumigation & Handling."

// AFTER
"참고: 아래 항목들을 합산하여 자유롭게 입력할 수 있습니다. (예시 금액이며 필수 아님)"
```

**유지 항목**:
- ? 아이콘 클릭 시 Calculation Basis 확장 (ServiceSection에서만, 참고용)
- Material, Labor, Fumigation, Handling 예시 금액 표시

---

## 3. 데이터 흐름

```
[사용자 입력]
  ServiceSection.PackingCostOverrideField
    └→ onFieldChange('manualPackingCost', value | undefined)
       └→ QuoteInput.manualPackingCost

[계산]
  calculateQuote(input)
    ├→ calculateItemCosts()
    │   └→ manualPackingCost set? → material=override, labor=0
    │   └→ manualPackingCost empty? → material=auto, labor=auto
    ├→ finalHandlingFee = 0 (항상)
    ├→ manualPackingCost set? → fumigation=0
    └→ packingTotal = material + labor + fumigation

[표시]
  CostBreakdownCard
    └→ packingTotal > 0 ? 표시 : 숨김
```

---

## 4. 테스트 설계

### 4.1 Frontend Parity Tests

| 테스트 | 기대값 |
|--------|--------|
| `handling fee is always 0` | `breakdown.handlingFees === 0` |
| `zeroes fumigation when manualPackingCost set` | `handlingFees === 0, packingFumigation === 0` |
| `snapshot parity` | 모든 fixture의 handlingFees = 0 |

### 4.2 Backend Parity Tests

| 테스트 | 기대값 |
|--------|--------|
| `handling fee is always 0` | `breakdown[:handlingFees] == 0` |
| `zeroes fumigation when manualPackingCost set` | `handlingFees == 0, packingFumigation == 0` |

### 4.3 UI 검증

| 시나리오 | 기대 결과 |
|----------|----------|
| Override 50,000 입력 | COST BASIS "Packing & Docs" = ₩50,000 |
| Override 미입력 + PackingType=NONE | Packing & Docs 행 미표시 |
| Override 미입력 + PackingType=WOODEN_BOX | auto-calc 표시 (material + labor + fumigation) |
| COST BASIS 영역 | ? 아이콘 없음, Calculation Basis 패널 없음 |

---

## 5. 구현 순서

1. `calculationService.ts` — `finalHandlingFee = 0`
2. `quote_calculator.rb` — `final_handling_fee = 0` 동기화
3. `CostBreakdownCard.tsx` — UI 단순화 (? 제거, 조건부 숨김)
4. `ServiceSection.tsx` — 안내 문구 변경
5. Parity tests 업데이트 (프론트/백엔드)
6. 스냅샷 갱신
7. 전체 테스트 통과 확인
8. 배포 및 프로덕션 검증

---

## 6. 영향 분석

| 영향 항목 | 변경 전 | 변경 후 |
|----------|---------|---------|
| 기본 Packing & Docs (NONE, 미입력) | ₩35,000 (핸들링) | ₩0 (숨김) |
| WOODEN_BOX 미입력 | material + labor + fumigation + ₩35,000 | material + labor + fumigation |
| Override 50,000 | ₩50,000 | ₩50,000 (동일) |
| Total Internal Cost | 핸들링 포함 | 핸들링 미포함 (-₩35,000) |
| 최종 견적가 | margin 적용된 핸들링 포함 | margin 적용된 핸들링 미포함 |
