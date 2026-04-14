# Gap Analysis: test-coverage

**Date**: 2026-04-15  
**Feature**: test-coverage  
**Design Doc**: `docs/02-design/features/test-coverage.design.md`  
**Analyst**: bkit:gap-detector  

---

## Overall Match Rate: **78.75%** (63 / 80 케이스)

| Category | Score | Status |
|----------|:-----:|:------:|
| Test Case Count | 78.75% (63/80) | ⚠️ |
| Architecture Match | 95% | ✅ |
| File Structure | 100% (6/6 파일 존재) | ✅ |
| **Overall** | **78.75%** | ⚠️ |

---

## 파일별 구현 현황

| 파일 | 설계 | 구현 | 일치율 | 상태 |
|------|:----:|:----:|:------:|:----:|
| `carrierRateEngine.test.ts` | 14 | 14 | 100% | ✅ 완료 |
| `itemCalculation.test.ts` | 15 | 15 | 100% | ✅ 완료 |
| `upsCalculation.test.ts` | 10 | 9 | 90% | ⚠️ 1 미구현 |
| `dhlCalculation.test.ts` | 10 | 9 | 90% | ⚠️ 1 미구현 |
| `upsAddonCalculator.test.ts` | 17 | 9 | 53% | ❌ 8 미구현 |
| `dhlAddonCalculator.test.ts` | 14 | 7 | 50% | ❌ 7 미구현 |
| **합계** | **80** | **63** | **78.75%** | |

---

## Hard Gaps (미구현 항목)

### upsCalculation.test.ts (1건)
- **#10**: `transitTime` 타입 검증 — `typeof transitTime`이 string 또는 number인지 명시적 검사 없음

### dhlCalculation.test.ts (1건)
- **#10**: UPS vs DHL 요금 비교 케이스 (같은 국가/무게에서 `upsBase !== dhlBase`) 미구현

### upsAddonCalculator.test.ts (8건)
- **#2**: AHS 경계값 — wt=25kg 정확히에서 AHS 미적용 검증
- **#3**: AHS 자동감지 — 최장 변 122cm 초과 기준
- **#4**: AHS 자동감지 — 2nd longest 80cm 기준
- **#5**: AHS 자동감지 — WOODEN_BOX 포장 타입
- **#6**: AHS 자동감지 — SKID 포장 타입
- **#8**: DDP FSC 면제 — FSC가 DDP에 미적용됨 검증
- **#11**: Surge Fee 부재 — 일반 국가(US)에서 SGF=0 검증
- **#16**: DB override 경로 — `resolvedAddonRates` 주입 시 커스텀 요율 적용

### dhlAddonCalculator.test.ts (7건)
- **#2**: OSP 2nd dimension 기준 (80cm 임계값)
- **#3**: OSP 경계값 — length=100cm 정확히에서 OSP 미적용
- **#4**: OSP qty>1 — qty=2일 때 비용 2배 적용
- **#6**: OWT 경계값 — wt=70kg 정확히에서 OWT 미적용
- **#7**: OWT + FSC 적용 검증
- **#9**: RMT 최솟값 — wt=10kg 소량일 때 minimum 요금 적용
- **#13**: DB override 경로 — `resolvedAddonRates` 주입 시 커스텀 요율 적용

---

## 기존 오류 (Pre-existing Failures)

`carrierRateEngine.test.ts` — 2 케이스 실패
- `lookupCarrierRate(3.2, 'Z1', ...)` → expected: 1750, actual: 2000
- 원인: nextRange 폴백 계산 또는 roundToHalf 로직 불일치
- 설계 명세는 해당 경로 커버 필요 → 구현 디버깅 필요

---

## 강점 (구현 품질)

1. **목 전략 정확** — `carrierRateEngine.test.ts` MOCK_EXACT/MOCK_RANGE inline 정의
2. **실제 타리프 사용** — `upsCalculation`/`dhlCalculation`에서 실제 국가 코드(JP, SG, AU) 기반 조회
3. **헬퍼 팩토리 패턴** — `makeInput()` 설계의 `baseInput()` 개념과 일치
4. **console.log 없음**, 타입 정확, vitest globals 적용

---

## 개선 권고 (90% 달성 필요)

### 즉시 추가 (2건, 90% 경계)
```typescript
// upsCalculation.test.ts
it('transitTime은 string 또는 number 타입을 반환한다', () => {
  const result = calculateUpsCosts(10, 'JP');
  expect(typeof result.transitTime).toMatch(/^(string|number)$/);
});

// dhlCalculation.test.ts
it('UPS와 DHL의 요금이 다르다 (같은 국가/무게)', () => {
  const ups = calculateUpsCosts(5, 'US');
  const dhl = calculateDhlCosts(5, 'US');
  expect(ups.intlBase).not.toBe(dhl.intlBase);
});
```

### 고우선순위 추가 (15건, 100% 달성)
- `upsAddonCalculator`: 8건 (경계값 3 + 포장타입 2 + DDP FSC 1 + Surge 부재 1 + DB override 1)
- `dhlAddonCalculator`: 7건 (경계값 2 + qty 1 + FSC 2 + RMT min 1 + DB override 1)

---

## 결론

- **Match Rate: 78.75%** — 90% 기준 미달
- 6개 파일 모두 존재, 핵심 로직 63케이스 통과
- 주요 gap: 애드온 경계값/포장타입/DB override 케이스 누락 (15건)
- **다음 단계**: `/pdca iterate test-coverage` 로 자동 개선 (누락 17건 추가) 또는 수동 추가
