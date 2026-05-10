# Quote History — FR-04 + FR-07 Debt Cycle (Design)

| 항목 | 내용 |
|---|---|
| Feature ID | `quote-history-fr04-fr07-debt` |
| Date | 2026-05-10 |
| Author | jaehong |
| Status | Approved (brainstorm) — pending writing-plans |
| Supersedes | `docs/01-plan/features/quote-history.plan.md` 잔여 항목 |
| Scope | amount-range search filter + Excel(xlsx) export 2건만 |

## 1. 배경

2026-02-14 작성된 `quote-history.plan.md` 의 FR-01~FR-09 중 7건은 이미 production 에 구현되어 있다 (확인 일자 2026-05-10):

- ✅ FR-01 Save / FR-02 List+Pagination / FR-03 Detail / FR-05 Load-as-template (`handleDuplicate`) / FR-06 Delete / FR-08 Reference No. / FR-09 Sent status
- ⚠️ FR-04 Search **by amount range** — text/destination/date/status 까지만 구현, **금액 범위 필터 없음**
- ⚠️ FR-07 CSV/**Excel** export — CSV 만 구현, **xlsx 미구현**

본 사이클은 위 2건만 처리하는 최소 사이클이다. NFR 측정·xlsx 다중 시트·UI preset/slider 등은 별도 사이클로 분리 (§7).

## 2. 결정 사항

| 결정 | 선택 | 근거 |
|---|---|---|
| Amount range 기준 통화 | 토글 (KRW / USD 선택) | 사이트 currency toggle 패턴과 일관, KRW/USD 컬럼이 이미 별도로 저장되어 있음 |
| Amount UX | min/max 텍스트 input 2개 | 견적 금액 범위가 ₩50K~수천만으로 넓어 free input 이 가장 유연 |
| Excel gem | `caxlsx` | Rails 진영 사실상 표준, 활발한 유지보수, DSL 단순 |
| Excel 형식 | CSV 와 동일 헤더 / 1행 = 1 quote 요약 | PR 침습 최소화, `HEADERS` 상수 재사용 |
| Export 라우트 | `params[:format]` 분기 (`.csv` / `.xlsx`) | 기존 `/quotes/export` 한 액션 유지, Rails respond-to 자연스러움 |

## 3. 아키텍처 변경

### 3.1 Backend (Rails)

| 파일 | 변경 |
|---|---|
| `Gemfile` | `gem "caxlsx"` 추가 (production group) |
| `app/services/quote_searcher.rb` | scope 추가: `min_amount_krw / max_amount_krw / min_amount_usd / max_amount_usd`. `amount_currency` (기본 `KRW`) 로 분기. min > max 면 `ArgumentError` |
| `app/services/quote_exporter.rb` | `call(scope, format: :csv)` 시그니처. `format == :xlsx` 분기에서 `Axlsx::Package` 생성 후 `package.to_stream.read` 반환. `HEADERS` / 행 변환 로직은 공유 (`build_row` private 메서드로 추출) |
| `app/controllers/api/v1/quotes_controller.rb` | `export` 액션: `respond_to do |format| format.csv ...; format.xlsx ... end`. content-type/filename 분기. `min_amount` / `max_amount` / `amount_currency` 파라미터 화이트리스트 |

### 3.2 Frontend (React)

| 파일 | 변경 |
|---|---|
| `src/features/history/components/QuoteSearchBar.tsx` | currency 토글 (KRW/USD 2 버튼) + min/max number input 2개. 빈 값은 무전송. 입력 후 300ms debounce. min > max 시 inline validation 메시지. 입력 표시는 KRW=천단위 콤마(정수), USD=소수점 2자리까지 허용 |
| `src/features/history/components/QuoteHistoryPage.tsx` | 검색 state 에 `minAmount, maxAmount, amountCurrency` 추가, API 호출 시 전파. Export 드롭다운 (`Excel ▾ ⇒ CSV / Excel`) 을 페이지 헤더 우측에 배치 (기존 단일 CSV 버튼 자리) |
| `src/api/quoteApi.ts` | `listQuotes()` 파라미터 확장. `exportQuotes({ format: 'csv' \| 'xlsx', ...filters })` 추가 |
| i18n | **스코프 밖** — 기존 `QuoteHistoryPage` / `QuoteSearchBar` 가 i18n 을 사용하지 않고 영어 하드코딩 패턴이므로 신규 라벨도 영어 하드코딩 유지. history 페이지 전체 i18n 마이그레이션은 별도 사이클로 분리 |

## 4. API 변경

```
GET /api/v1/quotes
  ?page=1&per_page=20
  &q=...
  &destination_country=...
  &date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
  &status=draft|sent|accepted|rejected
  &min_amount=NUMBER          # 신규, nullable
  &max_amount=NUMBER          # 신규, nullable
  &amount_currency=KRW|USD    # 신규, default KRW

GET /api/v1/quotes/export.csv?...filters     # 기존, 동일
GET /api/v1/quotes/export.xlsx?...filters    # 신규
```

응답 envelope (`meta.total / data`) 변경 없음. xlsx 응답은:
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="quotes-2026-05-10.xlsx"`

## 5. 데이터 흐름

1. 사용자가 amount range 입력 → 300ms debounce → `quoteApi.listQuotes({ ...filters, minAmount, maxAmount, amountCurrency })`
2. Rails `QuoteSearcher.call(params)` → `amount_currency == "USD"` 면 `total_quote_amount_usd` 컬럼 기준, 아니면 `total_quote_amount` 컬럼 기준 `where(...>= min, ...<= max)` 체이닝
3. Export 드롭다운 클릭 → 클라이언트가 `GET /api/v1/quotes/export.{csv|xlsx}` 에 동일 필터 파라미터 동반 → `QuoteExporter.call(scope, format: :csv|:xlsx)` → blob 다운로드
4. `TooLargeError` (10K 초과) 시 기존 422 응답 흐름 그대로

## 6. 에러 처리

| 케이스 | 응답/UX |
|---|---|
| `min_amount > max_amount` | Backend `422 invalid_amount_range`, Frontend inline validation 메시지 |
| `amount_currency` 비정상 | Backend 가 `KRW` 로 fallback (조용히), 422 안 띄움 |
| caxlsx render 실패 | Sentry 캡처 → `500 export_failed` → Frontend toast |
| 10K 초과 export | 기존 `TooLargeError` 흐름 (CSV/xlsx 공통) |
| 로그인 만료 | 기존 `apiClient` 401 핸들러 흐름 그대로 |

## 7. 테스트 전략

### 7.1 Backend (RSpec)

- `spec/services/quote_searcher_spec.rb` — 토글 4 케이스 (KRW only-min, KRW only-max, KRW both, USD both) + 잘못된 range
- `spec/services/quote_exporter_spec.rb` — `format: :xlsx` 호출 시 `Axlsx::Package` 반환 검증, 헤더 일치, 1행 데이터 일치
- `spec/requests/api/v1/quotes_spec.rb` — `GET /quotes/export.xlsx` 200 + content-type. `min_amount/max_amount` 파라미터 통과

### 7.2 Frontend (Vitest)

- `src/features/history/components/__tests__/QuoteSearchBar.test.tsx` — currency 토글 + amount input → onSearch payload 검증, min > max validation 표시
- `src/features/history/components/__tests__/QuoteHistoryPage.test.tsx` — Export 드롭다운 → xlsx 호출 검증

### 7.3 수동 QA (Zero-Script)

- 스테이징 (smart-quote-main.vercel.app) 에서:
  - KRW 토글 + min/max → 결과 좁혀지는지
  - USD 토글 + min/max → 동일
  - Export Excel 클릭 → `quotes-YYYY-MM-DD.xlsx` 다운로드 → LibreOffice/Excel 에서 열림, 헤더 정상

## 8. 스코프 밖 (별도 사이클로 분리)

- xlsx 다중 시트 (Sheet1=요약, Sheet2=cost breakdown)
- 한국어 헤더 / 통화 포맷팅 / 자동 열너비 / 셀 스타일링
- amount range slider 또는 preset 버킷 UI
- NFR 측정 (1000 records < 200ms, 10K scale 부하 테스트, 마이그레이션 reversibility 자동 검증)
- CSV → xlsx 완전 대체 (CSV 그대로 유지)

## 9. 의존성 / 위험

| 위험 | 영향 | 완화 |
|---|---|---|
| `caxlsx` gem 추가 → Render 빌드 시간 증가 | Low | 마이너 — 기존 Rails 빌드 시간에 충분히 흡수 |
| `total_quote_amount_usd` 컬럼 NULL 데이터 | Low | 기존 데이터 검사 — `null: false` 이므로 NULL 없음. 추가 검증 불필요 |
| `params[:format]` 분기로 기존 CSV 응답 회귀 | Medium | RSpec 기존 CSV 케이스 그대로 통과해야 머지 |
| min > max 입력 시 사용자 혼란 | Low | inline validation + 백엔드 422 |

## 10. Definition of Done

- [ ] Gemfile.lock 업데이트, `bundle install` 성공
- [ ] `quote_searcher_spec` / `quote_exporter_spec` / `quotes_spec` 신규 케이스 추가 + 통과
- [ ] `QuoteSearchBar.test` / `QuoteHistoryPage.test` 신규 케이스 추가 + 통과
- [ ] `npm run lint` / `npx tsc --noEmit` / `bundle exec rspec` / `bin/rubocop` 모두 GREEN
- [ ] i18n 4개 언어 키 추가 (en/ko/cn/ja)
- [ ] 스테이징 수동 QA 3 케이스 통과 (KRW/USD/xlsx)
- [ ] PR 머지 후 production (bridgelogis.com) 에서 xlsx 다운로드 1건 작성자 (jaehong) 검증
- [ ] `docs/01-plan/features/quote-history.plan.md` 헤더에 "FR-04/FR-07 → fr04-fr07-debt 사이클로 분리 완료 (2026-05-10)" 노트 추가
