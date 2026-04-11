# Calculation Parity Fix 완료 보고서

> **요약**: 버그 수정 — `calculation_parity_spec.rb` 픽스처 경로 오류 및 `quote_calculator.rb` nil 가드 누락
>
> **작성자**: Claude Code (bkit PDCA)
> **작성일**: 2026-04-11
> **완료 상태**: ✅ 완료

---

## 개요

| 항목 | 값 |
|------|-----|
| **기능명** | calculation-parity-fix |
| **유형** | 비공식 PDCA (Bug Fix) |
| **발견** | `/check` 실행 중 |
| **완료일** | 2026-04-11 |
| **담당자** | Jaehong (개발자) |

---

## PDCA 사이클 요약

### Plan
- **상태**: N/A (비공식 PDCA — `/check` 중 발견된 버그 수정)
- **비고**: 실제 계획 문서 없음. `ups-dhl-tariff-update`와 유사한 형태의 즉시 버그 픽스

### Design
- **상태**: N/A (비공식 PDCA — `/check` 중 발견된 버그 수정)
- **비고**: 실제 설계 문서 없음

### Do
- **구현 범위**:
  1. `smart-quote-api/spec/services/calculation_parity_spec.rb:8` — 픽스처 경로 수정
  2. `smart-quote-api/app/services/quote_calculator.rb:90` — nil 가드 추가

### Check
- **상태**: N/A (비공식 PDCA — `/check` 중 발견된 버그 수정)
- **비고**: 실제 분석 문서 없음. 아래 테스트 결과로 검증

---

## 수정 내용

### 문제 1: `calculation_parity_spec.rb` — 잘못된 픽스처 경로

**파일**: `smart-quote-api/spec/services/calculation_parity_spec.rb:8`

**오류**: `Errno::ENOENT @ rb_sysopen` — 픽스처 파일 찾을 수 없음

**근본 원인**:
- 원본 경로: `../../../../shared/test-fixtures/calculation-parity.json` (spec/services/에서 4 레벨 위)
- 실제 해석 위치: `/Users/jaehong/Developer/Projects/shared/...` (프로젝트 외부)

**수정 방법**:
- 변경 경로: `../../../shared/test-fixtures/calculation-parity.json` (3 레벨 위)
- 올바른 위치: `/Users/jaehong/Developer/Projects/smart-quote-main/shared/test-fixtures/calculation-parity.json`

```ruby
# Before (오류)
let(:fixture) { JSON.parse(File.read(File.expand_path('../../../../shared/test-fixtures/calculation-parity.json', __FILE__))) }

# After (수정)
let(:fixture) { JSON.parse(File.read(File.expand_path('../../../shared/test-fixtures/calculation-parity.json', __FILE__))) }
```

---

### 문제 2: `quote_calculator.rb` — nil에 대한 NoMethodError

**파일**: `smart-quote-api/app/services/quote_calculator.rb:90`

**오류**: `NoMethodError: undefined method '[]' for nil`

**근본 원인**:
- `Calculators::UpsSurgeFee.call(...)` 는 비-이스라엘/중동 국가에 대해 `nil` 반환 (설계상 의도)
- `quote_calculator.rb`는 nil 체크 없이 `ups_surge_fee_result[:total]` 호출
- 중국, 일본 등 다른 국가 계산 시 crash 발생

**수정 방법**:
- `ups_surge_fee_result&.dig(:total) || 0` 으로 변경

```ruby
# Before (오류)
ups_surge_fee_result = Calculators::UpsSurgeFee.call(...)
total_with_surge = base_total + ups_surge_fee_result[:total]

# After (수정)
ups_surge_fee_result = Calculators::UpsSurgeFee.call(...)
total_with_surge = base_total + (ups_surge_fee_result&.dig(:total) || 0)
```

---

## 테스트 결과

### RSpec (Backend)

| 테스트 스위트 | 이전 | 이후 | 상태 |
|-------------|------|------|------|
| `calculation_parity_spec.rb` | ❌ Load Error (0/21 실행 불가) | ✅ 21/21 Pass | 수정됨 |
| 전체 RSpec | 166/166 Pass | 187/187 Pass | **전체 +21개 추가** |
| **합계** | **166** | **187** | ✅ **100% Pass** |

### Vitest (Frontend)

| 테스트 스위트 | 결과 | 영향 |
|-------------|------|------|
| 전체 Vitest | 1229/1229 Pass | 미영향 (백엔드 전용 수정) |

---

## 완료 항목

- ✅ `calculation_parity_spec.rb` 픽스처 경로 수정
- ✅ `quote_calculator.rb` nil 가드 추가
- ✅ RSpec 전체 테스트 통과 (187/187)
- ✅ 프론트엔드 Vitest 통과 (1229/1229)

---

## 지연/미완료 항목

없음 — 모든 항목 완료

---

## 배운 점

### 잘된 점

1. **명확한 오류 메시지**: 파일 경로 오류와 nil 오류 모두 스택 트레이스로 빠르게 파악
2. **자동화된 테스트**: 전체 RSpec 슈트가 회귀 방지 역할 수행
3. **원자적 수정**: 두 가지 버그가 명확히 분리되어 각각 독립적으로 수정 가능

### 개선 사항

1. **상대 경로 검증**: 프로젝트 내 상대 경로(`../../../`) 사용 시 체크리스트 추가 필요
   - 문제: `../../../../`로 프로젝트 경계 넘어갈 수 있음
   - 해결: `spec/` 에서 `shared/` 접근 시 명확한 규칙 정의

2. **nil 처리 규칙**: 서드파티 계산 서비스(`Calculators::*`) 반환값 항상 nil 가드
   - 외부 API 응답처럼 취급 → `&.` 또는 명시적 nil 체크 필수

3. **테스트 커버리지 개선**: 
   - 기존 `calculation_parity_spec.rb` 는 로드 불가 → 21개 테스트 미실행
   - CI/CD 단계에서 "로드 오류"를 감지하고 실패하도록 구성 필요

### 다음에 적용할 사항

1. **파일 경로 체크리스트**:
   ```bash
   # 상대 경로 사용 시 검증
   cd spec/services && ls ../../../shared/test-fixtures/calculation-parity.json
   ```

2. **nil 방어 패턴**:
   ```ruby
   # 외부 서비스 호출 후 항상 nil 체크
   result = ExternalService.call(...)
   safe_value = result&.dig(:key) || default_value
   ```

3. **로드 오류 감지**:
   ```yaml
   # CI: RSpec에서 로드 실패 시 즉시 실패
   script:
     - bundle exec rspec --fail-fast-exit
   ```

---

## 다음 단계

1. **소스 제어**: 변경사항 커밋 및 PR 생성
   - 커밋 메시지: `fix: calculation-parity-fix — fixture path & nil guard`

2. **배포**: main 브랜치로 머지 후 배포 진행

3. **모니터링**: 운영 환경에서 `QuoteCalculator` 호출 로그 확인
   - 특히 비-이스라엘/중동 국가의 요청 모니터링

---

## 메트릭스

| 메트릭 | 값 |
|--------|-----|
| 수정된 파일 | 2 |
| 수정된 라인 | ~5 |
| 테스트 추가 실행 | +21 (calculation_parity_spec.rb) |
| 테스트 전체 Pass율 | 100% (187/187 RSpec + 1229/1229 Vitest) |
| 처리 시간 | ~30분 |

---

## 관련 문서

| 문서 | 경로 | 상태 |
|------|------|------|
| Plan | N/A | N/A (비공식) |
| Design | N/A | N/A (비공식) |
| Analysis | N/A | N/A (비공식) |
| Report | `/docs/04-report/features/calculation-parity-fix.report.md` | ✅ 현재 문서 |

---

## 결론

비공식 PDCA를 통해 발견된 두 가지 버그가 성공적으로 수정되었습니다:
1. 픽스처 경로 오류로 인한 21개 parity 테스트 실행 불가 → **수정 완료**
2. nil 가드 누락으로 인한 특정 국가 계산 실패 → **수정 완료**

결과적으로 **RSpec 187/187 (100%)**과 **Vitest 1229/1229 (100%)** 모든 테스트 통과.

---

**작성 완료**: 2026-04-11 | **상태**: ✅ 완료
