# Completion Report: CargoAI Roadmap — M2a (Phase 3.5 CO2 Frontend Slice)

> **Feature**: cargoai-roadmap (M2a only — M2b/M2c 후순위)
> **Completed**: 2026-04-05
> **Match Rate**: 98%
> **PDCA Cycle**: Do → Check → Report (Plan/Design은 M1-M6 공유)

---

## 1. Executive Summary

M1 에서 `co2Kg: null` 이라 비활성이던 **🌱 greenest 배지를 활성화**시킨 frontend-first slice. IATA RP1678 단순 공식과 KR→62국 거리 테이블을 조합해 백엔드 의존 없이 즉시 CO2 추정치를 계산. DHL(0.520) < UPS(0.602) < FEDEX(0.645) 순서로 배출 factor 차이가 있어 실제로 DHL 이 greenest 로 자동 판정됨.

## 2. Scope & Deliverables

### 완료된 작업 (6 Steps / 100%)

| # | Task | 파일 | 상태 |
|---|------|------|:----:|
| S1 | 국가쌍 거리 테이블 (KR→62국) | `src/config/route_distances.ts` (new) + test | ✅ |
| S2 | CO2 계산 유틸 (IATA RP1678) | `src/lib/co2.ts` (new) + test | ✅ |
| S3 | CarrierComparisonCard 통합 | `CarrierComparisonCard.tsx` (`co2Kg: null` → 실제 계산) | ✅ |
| S4 | Co2Row UI | `CarrierColumn` 에 조건부 행 추가 | ✅ |
| S5 | i18n 2 키 × 4 언어 | `translations.ts` (co2.label, co2.disclaimer) | ✅ |
| S6 | 검증 (lint/tsc/vitest) | 1224 tests, 0 errors | ✅ |

### Deferred (후순위 / 별도 사이클)

| # | Item | 사유 |
|---|------|------|
| M2b | PDF 견적서 CO2 섹션 | 별도 짧은 사이클 (30분 예상) |
| M2c | Backend `co2_emission_rates`/`od_distances` 테이블 | Rails 작업 + Dashboard 위젯 4종 |
| — | 공항쌍 정확 거리 | M2c 의 `od_distances` 로 대체 |

## 3. Key Changes

### IATA RP1678 공식
```
CO₂(kg) = (billableWeightKg × distanceKm × emissionFactor × 0.7) / 1000
```

- `billableWeightKg`: `QuoteResult.billableWeight` 재사용
- `distanceKm`: KR→목적지 국가 거리 (62국 하드코딩, 미등록국 9000km fallback)
- `emissionFactor`: M1의 `CARRIER_METADATA` 재활용 (UPS 0.602, DHL 0.520, FEDEX 0.645)
- `LOAD_FACTOR = 0.7`: IATA 항공화물 평균 탑재율
- `/1000`: kg→tonne 단위 변환

### 배출량 차이 (5kg → US 기준)
| Carrier | CO₂ |
|---------|:---:|
| DHL | 20.02 kg |
| UPS | 23.18 kg |
| FEDEX | 24.83 kg |

## 4. Verification

| 검증 항목 | 결과 |
|----------|:----:|
| TypeScript (`tsc --noEmit`) | 에러 0 ✅ |
| ESLint (`--max-warnings 0`) | 에러/경고 0 ✅ |
| Vitest | 1224 passed (+16 신규) ✅ |
| Gap Analysis Match Rate | 98% ✅ |
| Formula 정확도 (hand-calc) | 3/3 시나리오 일치 ✅ |
| 🌱 Greenest 배지 활성화 | DHL 자동 선정 ✅ |

## 5. Deviations (2건, 모두 개선)

| ID | 내용 | 성격 |
|----|------|------|
| L1 | `co2.disclaimer` 선제 추가 (미사용) | M2b PDF 대비, 의도적 |
| L2 | 테스트 `__tests__/` 서브폴더 위치 | `src/config/` 컨벤션 준수 |

## 6. Impact

| 축 | Before (M1) | After (M2a) |
|----|:-----------:|:-----------:|
| 🌱 Greenest 배지 | **비활성** (`co2Kg: null`) | **활성** (DHL 자동 선정) |
| 비교 카드 CO2 표시 | 없음 | 각 캐리어별 `X.X kg CO₂` 행 |
| i18n CO2 커버리지 | 0 | 2 키 × 4 언어 = 8 |
| 백엔드 의존 | - | 없음 (frontend-only slice) |
| 테스트 | 1208 | 1224 (+16) |

## 7. Lessons Learned

1. **Frontend-first slicing 가치**: 백엔드 테이블/API 없이도 정적 상수만으로 완전한 기능 구현 가능. M2c (backend) 대기 없이 즉시 UX 개선 전달.
2. **M1 의 데이터 구조 선견지명**: M1에서 `co2Kg: number | null` 을 타입에 포함하고 `assignBadges()` 가 null-aware 로 작성되어, M2a 는 null → 실제 값 교체만으로 자동 배지 활성화 달성.
3. **IATA 표준 공식의 단순함**: `weight × distance × factor × loadFactor` 4-인자 공식으로도 실용적 정확도 확보. 정밀도 향상은 M2c 의 공항쌍 거리 도입으로 충분.
4. **useMemo deps 주의**: `input.destinationCountry` 를 deps 에 추가하지 않으면 목적지 변경 시 CO2 재계산 안 됨. lint 규칙이 이를 포착.

## 8. Follow-up Actions

- [ ] **M2b**: `pdfService.ts` 에 "CO₂ 배출량: XX kg (IATA RP1678 기준)" 섹션 추가 + `co2.disclaimer` 키 사용
- [ ] **M2c**: Backend `co2_emission_rates` 버전 관리 테이블 + admin CRUD + Dashboard 4 위젯
- [ ] **M2c**: `od_distances` 테이블 + ICN→공항 정확 거리 (현재 KR→국가 수도 대략치)
- [ ] Git commit + push (현재 uncommitted)
- [ ] 수동 QA: 실제 견적 입력 후 DHL 카드에 🌱 배지 표시 확인

---

## PDCA 문서 연결

- **Plan**: `docs/01-plan/features/cargoai-inspired-roadmap.plan.md` (장기 로드맵 M1-M6)
- **Design**: `docs/02-design/features/cargoai-roadmap.design.md` §4 Phase 3.5
- **Do**: `docs/01-plan/features/cargoai-roadmap.do.md` (M2a 6-step 체크리스트)
- **Analysis**: `docs/03-analysis/cargoai-roadmap.analysis.md` (Match Rate 98%)
- **Report**: 본 문서
