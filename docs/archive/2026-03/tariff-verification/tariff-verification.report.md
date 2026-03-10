# PDCA Completion Report: Tariff Verification & Zone Mapping Fix

> Feature: `tariff-verification`
> Date: 2026-03-10
> Final Match Rate: **100%** (19/19 checks passed)
> PDCA Iterations: 2 cycles (v5: 85.7% → v6: 100.0%)

---

## 1. Executive Summary

PDF 원본 운임표 기준으로 UPS/DHL/EMAX 전체 요금 체계의 5-way 정합성 검증을 완료했습니다.
검증 과정에서 **DHL Zone 매핑 오류**(US 30% 과다청구)와 **UPS Range Rate 단일 구간 오류**(21-70kg 9.9% 과소청구)를 발견하여 수정했습니다.

### 핵심 성과

| 항목 | Before | After |
|------|--------|-------|
| DHL US Zone | Z6 (Europe) ❌ | Z5 (US/CA) ✅ |
| UPS >20kg Range | 단일 300+ tier ❌ | 3-tier (21-70/71-299/300+) ✅ |
| 자동화 테스트 | 208 tests | **1,133 tests** (+925) |
| PDF ↔ Config 검증 | 미검증 | **918 values** 전수 검증 |
| Frontend ↔ Backend 동기화 | 미검증 | **922 values** 일치 확인 |
| Excel 보고서 정합성 | 미검증 | **19/19 items** 100% |

---

## 2. Plan (계획)

### 2.1 배경
- 고객 견적가 산출 시 DHL US행 화물이 Z6(Europe) 요금으로 계산되어 **30% 과다청구** 발생
- UPS 20kg 초과 구간이 300+ 단일 요율로 적용되어 21-70kg 구간 **9.9% 과소청구** 발생
- PDF 원본 운임표 대비 코드 내 요금표의 정합성 검증 체계 부재

### 2.2 목표
1. PDF 원본 ↔ Config(TS) ↔ Config(Ruby) ↔ 계산 로직 ↔ Excel 보고서 5-way 정합성 확보
2. DHL Zone 매핑 오류 수정 및 검증
3. UPS Range Rate 3구간 복원 및 검증
4. 자동화 테스트로 향후 재발 방지

---

## 3. Design (설계)

### 3.1 검증 체인 아키텍처

```
PDF 원본 운임표 (UPS Express Saver 2026-02 / DHL Express 2026-02)
    ↓ [918 cell-by-cell tests]
Config(TS): src/config/ups_tariff.ts, dhl_tariff.ts
    ↓ [922 value comparison]
Config(Ruby): smart-quote-api/lib/constants/ups_tariff.rb, dhl_tariff.rb
    ↓ [39 calculation tests]
Calculation Logic: calculationService.ts / quote_calculator.rb
    ↓ [19 cross-checks]
Excel Report: Smart_Quote_Tariff_Report_v6.xlsx
```

### 3.2 수정 범위

| 파일 | 변경 내용 |
|------|----------|
| `src/features/quote/services/calculationService.ts` | DHL Zone 매핑 수정 (US: Z6→Z5), UPS Range 3-tier 복원 |
| `src/config/ups_tariff.ts` | UPS_RANGE_RATES 3구간 확인 (이미 정확) |
| `src/config/dhl_tariff.ts` | DHL_RANGE_RATES 확인 (이미 정확) |
| `smart-quote-api/lib/constants/ups_tariff.rb` | Backend 동기화 확인 (이미 정확) |
| `smart-quote-api/lib/constants/dhl_tariff.rb` | Backend 동기화 확인 (이미 정확) |
| `src/config/__tests__/tariff-pdf-verify.test.ts` | 918 tests 신규 생성 |
| `src/features/quote/services/calculationService.test.ts` | Zone/Rate 테스트 39개로 확장 |

---

## 4. Do (구현)

### 4.1 DHL Zone 매핑 수정

**Before** (오류):
```typescript
// US가 Z6(Europe) 그룹에 포함
if (['US', 'CA', 'ES', 'IT', 'GB', 'FR'].includes(country))
  return { rateKey: 'Z6', label: 'W.Europe/US/CA' };
```

**After** (수정):
```typescript
// US/CA를 Z5로 분리
if (['US', 'CA'].includes(country))
  return { rateKey: 'Z5', label: 'US/CA' };
if (['ES', 'IT', 'GB', 'FR', 'NL', 'BE', 'CH', 'AT', 'SE', 'DK', 'NO', 'FI'].includes(country))
  return { rateKey: 'Z6', label: 'Europe' };
```

**영향**: US행 DHL 견적가 ~30% 감소 (Z6→Z5 요율 차이)

### 4.2 UPS Range Rate 3구간 복원

**Before** (오류 — 계산 로직):
```typescript
// 20kg 초과 시 300+ 단일 요율만 적용
const rangeRate = UPS_RANGE_RATES[2]; // Always 300+ tier
```

**After** (수정):
```typescript
// 3구간 정확 매칭: 21-70 / 71-299 / 300+
const rangeRate = UPS_RANGE_RATES.find(r => ceilWeight >= r.min && ceilWeight <= r.max);
```

**영향 예시** (US Z5, 50kg):
- Before: 50 × 11,096 = ₩554,800 (300+ rate)
- After: 50 × 12,198 = ₩609,900 (21-70 rate)
- 차이: +₩55,100 (+9.9%)

### 4.3 PDF 검증 테스트 스위트

`src/config/__tests__/tariff-pdf-verify.test.ts` 신규 생성:
- UPS Exact Rates: 10 zones × 40 weights = **400 tests**
- UPS Range Rates: 3 tiers × 10 zones = **30 tests**
- DHL Exact Rates: 8 zones × 60 weights = **480 tests**
- DHL Range Rates: 1 tier × 8 zones = **8 tests**
- **Total: 918 tests** — 전수 cell-by-cell 검증

---

## 5. Check (검증)

### 5.1 자동화 테스트 결과

```
Test Files  26 passed (26)
Tests       1,133 passed (1,133)
Duration    6.90s
```

| 카테고리 | Tests | Status |
|----------|-------|--------|
| PDF ↔ Config(TS) 전수 검증 | 918 | ✅ ALL PASSED |
| calculationService 단위 테스트 | 39 | ✅ ALL PASSED |
| 기존 기능 테스트 (widgets, API, etc.) | 176 | ✅ ALL PASSED |

### 5.2 Frontend ↔ Backend 동기화 검증

| 항목 | 값 수 | 결과 |
|------|-------|------|
| UPS Exact Rates (10 zones × 40 weights + 2 headers) | 432 | ✅ 100% 일치 |
| DHL Exact Rates (8 zones × 60 weights + 10 extras) | 490 | ✅ 100% 일치 |
| **Total** | **922** | ✅ **100% 일치** |

### 5.3 Excel 보고서 교차 검증 (PDCA Iterate)

| Cycle | Version | Match Rate | Issues |
|-------|---------|-----------|--------|
| 1 | v5 | 85.7% (16/19) | UPS M4 margin 삭제, Z1 Quoted 헤더/수식 누락 |
| 2 | v6 | **100%** (19/19) | None |

**v6 검증 항목 (19/19 PASSED)**:
- Target Margin Default Rules (5개 우선순위 티어) ✅
- UPS Exact Rates (Z1-Z10 spot check) ✅
- UPS 3-tier Range Rates (21-70/71-299/300+) ✅
- DHL Exact Rates (Z1-Z8 spot check) ✅
- DHL Single-tier Range Rate (>30kg) ✅
- Quoted Price 수식 검증 (margin 적용 정확성) ✅
- Zone 매핑 정합성 (US→Z5, JP→Z2, etc.) ✅

---

## 6. Lessons Learned

### 6.1 발견된 위험 요인

| 위험 | 심각도 | 영향 | 재발 방지 |
|------|--------|------|----------|
| DHL Zone 매핑 오류 | 🚨 Critical | US 고객 30% 과다청구 | Zone 매핑 테스트 10개 추가 |
| UPS Range 단일 구간 | ⚠️ High | 21-70kg 9.9% 과소청구 | 3-tier boundary 테스트 3개 추가 |
| Excel 수식 깨짐 | ℹ️ Medium | 보고서 신뢰도 저하 | openpyxl 교차 검증 스크립트 |

### 6.2 개선 포인트

1. **PDF 원본 기준 자동화 테스트 918개** → 요금표 변경 시 즉시 불일치 감지
2. **Frontend/Backend 동기화 검증** → 922값 자동 비교 가능
3. **Excel 보고서 교차 검증** → PDCA Iterate로 체계적 검증 프로세스 확립

### 6.3 미결 사항

| 항목 | 상태 | 담당 |
|------|------|------|
| DHL Z1에 TW/MO 포함 여부 | ⏳ DHL 영업 담당 확인 필요 | DHL Sales Rep |
| 코드 변경사항 git commit | ⏳ 사용자 명시적 요청 대기 | Developer |

---

## 7. Metrics Summary

```
─────────────────────────────────────────────
📊 PDCA Tariff Verification — Final Metrics
─────────────────────────────────────────────
5-Way Verification Chain:
  [1] PDF → Config(TS)     918/918  ✅ 100%
  [2] Config(TS) → Config(Ruby)  922/922  ✅ 100%
  [3] Calculation Logic Tests    39/39   ✅ 100%
  [4] Full Test Suite         1133/1133  ✅ 100%
  [5] Excel Report v6         19/19   ✅ 100%

Bug Fixes Applied:
  DHL Zone US: Z6→Z5 (30% overcharge eliminated)
  UPS Range: 1-tier→3-tier (9.9% undercharge fixed)

PDCA Iterations: 2 (v5: 85.7% → v6: 100.0%)
Final Match Rate: 100%
─────────────────────────────────────────────
```

---

*Generated: 2026-03-10 | PDCA Phase: completed*
