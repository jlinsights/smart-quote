# Plan: code-quality-main-v2

## Feature Overview

| 항목 | 내용 |
|------|------|
| Feature | `code-quality-main-v2` |
| 목표 | 코드 분석 결과 72/100 → 87+ 점 달성 |
| 우선순위 | Phase 1 (Critical 4건) + Phase 2 (High 5건) |
| 영향 범위 | Frontend (TypeScript/React) + Backend (Rails API) |
| 선행 작업 | 없음 (독립 피처) |

---

## 배경

`/code_analysis` 실행 결과 (2026-04-14):
- 전체 점수: **72/100**
- Architecture: 78 / Security: 75 / Performance: 70 / Code Quality: 68 / Testing: 65

이전 `code-quality-fixes` (2026-04-05, 96%)는 구조/아키텍처 이슈 중심이었으며,
이번 v2는 **보안·품질·성능** 이슈를 대상으로 한다.

---

## Phase 1 — Critical 이슈 (블로커)

### C1. EIA API Key URL 노출 제거
- **파일**: `src/api/eiaApi.ts:17`
- **문제**: API 키가 URL query parameter에 포함 → 로그/브라우저 히스토리에 노출
- **해결**: `Authorization: Bearer {key}` 헤더 방식으로 변경
- **영향**: 환경변수 `VITE_EIA_API_KEY` 유지, fetch 옵션에 headers 추가

### C2. 운영 로그 사용자 데이터 노출 제거
- **파일**: `smart-quote-api/app/controllers/application_controller.rb:10`
- **문제**: `Rails.logger.info "=== current_user: #{current_user.inspect}"` — PII 포함 전체 객체 로깅
- **해결**: 라인 제거 또는 `current_user&.id` 만 로깅

### C3. console.* 프로덕션 제거
- **파일 목록**:
  - `src/components/ErrorBoundary.tsx:33` — `console.error`
  - `src/features/quote/components/SaveQuoteButton.tsx:72` — `console.error`
- **해결**: `console.error` → `logger` 유틸 또는 단순 제거 (ErrorBoundary는 유지 가능)
- **기준**: 프로덕션 번들에서 `console.*` 0건

### C4. 이메일 유효성 검사 강화
- **파일**: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb:102`
- **문제**: `URI::MailTo::EMAIL_REGEXP` — RFC 비표준, 너무 관대
- **해결**: `validates_email_format_of` gem 또는 커스텀 RFC 5322 정규식 적용

---

## Phase 2 — High Priority 이슈

### H1. calculationService.ts 분리
- **파일**: `src/features/quote/services/calculationService.ts` (~400 lines, 순환복잡도 15+)
- **해결**: 책임별 서브 모듈 추출
  - `upsCalculation.ts` — UPS 운임 계산
  - `dhlCalculation.ts` — DHL 운임 계산
  - `surchargeCalculation.ts` — 부가료 계산
  - `calculationService.ts` — orchestrator (50줄 이하)

### H2. N+1 쿼리 방지
- **파일**: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb`
- **문제**: 연관 모델 lazy-load 가능성
- **해결**: 필요한 연관에 `.includes()` / `.eager_load()` 추가

### H3. fetch 타임아웃 처리
- **파일**: `src/api/apiClient.ts`
- **문제**: 타임아웃 없음 → 무한 대기 가능
- **해결**: `AbortController` + `setTimeout` 패턴, 기본 30초

### H4. 백엔드 입력 유효성 검사
- **파일**: `smart-quote-api/app/controllers/api/v1/quotes_controller.rb` (params)
- **문제**: 음수 무게, 잘못된 zone 값 등 미검증
- **해결**: Strong Parameters에 범위 검증 추가 (`weight > 0`, 유효 zone 목록)

### H5. pdfService.ts 중첩 리팩터링
- **파일**: `src/lib/pdfService.ts` (~500 lines, 4단계 이상 중첩)
- **해결**: 중첩 로직 서브 함수 추출, 파일 분리 고려

---

## 구현 순서

```
Phase 1 (Critical) → 빌드/테스트 확인 → Phase 2 (High)
```

| 순서 | 작업 | 예상 범위 |
|------|------|----------|
| 1 | C2: application_controller.rb 로그 제거 | 1줄 |
| 2 | C3: console.* 제거 (ErrorBoundary, SaveQuoteButton) | 2파일 |
| 3 | C1: eiaApi.ts 헤더 방식 전환 | 1파일 |
| 4 | C4: 이메일 유효성 강화 | 1파일 |
| 5 | H3: fetch 타임아웃 (apiClient.ts) | 1파일 |
| 6 | H2: N+1 eager loading | 1파일 |
| 7 | H4: 백엔드 입력 유효성 | 1파일 |
| 8 | H1: calculationService 분리 | 4파일 신규 |
| 9 | H5: pdfService 중첩 리팩터링 | 1파일 |

---

## 성공 기준

- [ ] `grep -r "console\." src/ --include="*.ts" --include="*.tsx"` → 0건 (테스트 파일 제외)
- [ ] EIA API 키가 네트워크 요청 URL에 포함되지 않음
- [ ] `application_controller.rb`에 `current_user.inspect` 없음
- [ ] 이메일 유효성: `"notanemail"` 거부, `"test@example.com"` 통과
- [ ] Vitest 전체 통과 (기존 1241건 유지)
- [ ] RSpec 전체 통과 (기존 189/190 유지)
- [ ] TypeScript 빌드 에러 0건
- [ ] Rubocop 위반 0건 (신규)
- [ ] 코드 분석 점수: **87+/100**

---

## 리스크

| 리스크 | 대응 |
|--------|------|
| EIA API 서버가 Authorization 헤더 미지원 | EIA v2 API 문서 확인 먼저 |
| calculationService 분리 시 기존 테스트 깨짐 | import 경로 일괄 업데이트 필요 |
| email regex 변경으로 기존 데이터 거부 | DB에 저장된 이메일 형식 사전 확인 |

---

## 메모

- `code-quality-fixes` v1 (2026-04-05): 구조/아키텍처 이슈 96% 완료
- 이번 v2: 보안·품질·성능 이슈 집중
- Phase 1만으로도 Security 점수 75→85+ 예상
