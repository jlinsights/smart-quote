# Plan: packing-docs-simplify

> Packing & Docs 비용 로직 단순화 및 UI 개선

## 1. 배경 (Background)

기존 Packing & Docs 비용 산출 방식에 다음 문제가 있었음:

- **핸들링비 35,000원**이 자동으로 모든 견적에 포함 → 사용자 혼란
- `manualPackingCost` Override 입력 시 동작이 불명확 (전체 대체 vs 부분 추가)
- COST BASIS에 ? 아이콘 + Calculation Basis 패널이 중복 표시 → UI 복잡
- Override 미입력 시에도 핸들링비가 포함되어 ₩35,000이 기본 표시

## 2. 목표 (Goals)

| # | 목표 | 완료 기준 |
|---|------|----------|
| G1 | 핸들링 35K 자동 포함 제거 | `finalHandlingFee = 0` (프론트/백엔드) |
| G2 | Override 입력값 = COST BASIS 표시값 | Override 50,000 → Packing & Docs ₩50,000 |
| G3 | Override 미입력 시 Packing & Docs 숨김 | 0원이면 행 자체 미표시 |
| G4 | COST BASIS ? 아이콘 + 패널 제거 | CostBreakdownCard에서 HelpCircle 삭제 |
| G5 | ServiceSection 안내문 참고용으로 수정 | "예시 금액이며 필수 아님" 명시 |
| G6 | 프론트/백엔드 계산 동기화 | 양측 parity test 통과 |

## 3. 범위 (Scope)

### In Scope
- `calculationService.ts` — `finalHandlingFee = 0` 변경
- `quote_calculator.rb` — `final_handling_fee = 0` 동기화
- `CostBreakdownCard.tsx` — ? 아이콘/패널 삭제, 0원 조건부 숨김
- `ServiceSection.tsx` — 안내 문구 참고용으로 수정
- `calculationParity.test.ts` — 핸들링 0 기대값 업데이트
- `calculation_parity_spec.rb` — 백엔드 테스트 동기화
- 스냅샷 업데이트

### Out of Scope
- Packing Type별 자재비/인건비 자동 계산 로직 (기존 유지)
- FSC, Surcharge 등 다른 비용 항목
- PDF 견적서 변경
- 고객용 뷰 변경

## 4. 변경 파일 (Files Changed)

| 파일 | 변경 내용 |
|------|----------|
| `src/features/quote/services/calculationService.ts` | `finalHandlingFee = 0`, override 시 fumigation 0 |
| `smart-quote-api/app/services/quote_calculator.rb` | 동일 로직 동기화 |
| `src/features/quote/components/CostBreakdownCard.tsx` | HelpCircle/X 제거, showPackingInfo state 제거, 0원 조건부 숨김 |
| `src/features/quote/components/ServiceSection.tsx` | 안내 문구 "참고용 예시" 변경 |
| `src/features/quote/services/__tests__/calculationParity.test.ts` | 핸들링 0 기대값 |
| `smart-quote-api/spec/services/calculation_parity_spec.rb` | 핸들링 0 기대값 |
| `__snapshots__/calculationParity.test.ts.snap` | 스냅샷 갱신 |

## 5. 구현 커밋 이력

| Commit | 설명 |
|--------|------|
| `818687e` | 초기 Override 버그 수정 (핸들링비 유지 시도) |
| `36078f9` | 백엔드 동기화 |
| `86b422d` | Override = 전체 대체 + Calculation Basis UI 추가 |
| `1e171e0` | **최종** — 핸들링 35K 제거, ? 아이콘 제거, 미입력 시 숨김 |

## 6. 리스크 (Risks)

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 기존 저장된 견적과 금액 차이 | 핸들링 35K 제거로 기존 견적 대비 총비용 감소 | 새 견적부터 적용, 기존 견적은 저장 시점 값 유지 |
| Packing Type 선택 시 미입력이면 자재비/인건비만 표시 | 사용자가 Override 없이도 비용 발생 가능 | packingType !== NONE일 때 auto-calc 정상 동작 확인 |

## 7. 검증 계획 (Verification)

- [x] Frontend 1153 tests all passing
- [x] TypeScript `tsc --noEmit` 에러 없음
- [x] Vercel 배포 완료 (commit `1e171e0`)
- [x] Render 백엔드 자동 배포
- [ ] 프로덕션 검증: Override 50,000 → COST BASIS ₩50,000
- [ ] 프로덕션 검증: Override 미입력 → Packing & Docs 행 숨김
- [ ] 프로덕션 검증: ServiceSection ? 안내 참고용 표시

## 8. 상태 (Status)

**Phase**: Do (구현 완료, 검증 단계)
**구현 완료일**: 2026-03-13
