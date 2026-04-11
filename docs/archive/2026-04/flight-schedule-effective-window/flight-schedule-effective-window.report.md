# PDCA Completion Report: flight-schedule-effective-window

| | |
|---|---|
| **Feature** | `flight-schedule-effective-window` |
| **Period** | 2026-04-11 (single session) |
| **Match Rate** | **100%** |
| **Iteration** | 0 (no rework needed) |
| **Status** | ✅ Completed |

## 1. 배경

Goodman GLS(GSSA for Aeroflot SU)가 2주 간격으로 배포하는 SU(555) 스케줄 안내문은 같은 flightNo(예: `LJ 001`)로 다른 운항 구간·시각을 갖는다. 기존 `FlightSchedule`은 flight 당 단일 엔트리만 허용해, rollover PDF가 들어올 때마다 덮어써야 했고 그 사이 구간(예: 2026-04-11~14)에 이전 주 스케줄이 잘못 노출되는 문제가 반복됐다.

이번 작업은 `FlightSchedule`에 유효기간(`effectiveFrom` / `effectiveTo`) 필드를 도입해, 동일 flight의 구/신 엔트리를 데이터에 공존시키고 브라우저 로컬 시간 기준으로 자동 전환하도록 한 것이다.

## 2. 결과 요약

| 카테고리 | 결과 |
|---|---|
| 신규 타입 필드 | `FlightSchedule.effectiveFrom?`, `effectiveTo?` (inclusive ISO `YYYY-MM-DD`) |
| 유틸 함수 | `isActiveOn(schedule, todayYmd)`, `todayYmdLocal(now?)` |
| 데이터 분리 | `default-lj-001` → `default-lj-001-apr10` (10-14 APR, DAILY 17:10-21:10) + `default-lj-001-apr15` (15-25 APR, D1,3,4,5,6 19:55-23:55) |
| 필터링 | `useFlightSchedules` mount 시점 로컬 날짜 기준 `isActiveOn`으로 자동 필터 |
| 마이그레이션 | localStorage의 `default-lj-001` custom override/deleted id를 `apr15`로 idempotent rename |
| UI | `FlightFormModal`에 `<input type="date">` 2 필드 + `min` 연동 |
| i18n | `schedule.effectiveFrom/To` 4언어(ko/en/cn/ja) |
| 테스트 | 단위 8 + integration 4 = **12 신규** (설계 9건 대비 +3 over-deliver) |
| 검증 | ESLint 0, tsc 0, Vitest **1241/1241** (+12), Vite build 8.32s |
| 회귀 | 0 |

## 3. 주요 설계 결정 (5건 확정)

| # | 결정 | 근거 |
|---|---|---|
| 1 | `today` 계산 위치 → **hook 내부 mount 1회** (`useMemo([])`) | rerender마다 재계산 불필요. 자정 넘김은 새로고침 시점에 반영 — 수용 가능. |
| 2 | 타임존 → **브라우저 로컬** (`todayYmdLocal`), UTC 미사용 | KST 자정 야간편(LJ001 19:55 등)이 UTC 변환 시 잘못된 window로 넘어가는 문제 방지. |
| 3 | `isActiveOn` 위치 → `flight-schedules.ts`에 co-locate | 파일 추가 없음, 소비자 단일 import. 순수 함수라 테스트 독립. |
| 4 | legacy id 처리 → **자동 rename** (`default-lj-001` → `default-lj-001-apr15`) + idempotent | localStorage custom override 가진 기존 사용자를 깨뜨리지 않음. 1회성 side-effect + 재실행 시 no-op. |
| 5 | "inactive 표시 토글" → **범위 외** | MVP 단순화. 만료 엔트리 관리 필요 시 후속 feature. |

## 4. 변경 파일

| 파일 | 유형 | 라인 (insert/delete) |
|---|---|---|
| `src/config/flight-schedules.ts` | 타입 + 유틸 + 데이터 | 57 / — |
| `src/features/schedule/useFlightSchedules.ts` | 마이그레이션 + 필터 | 74 / — |
| `src/features/schedule/components/FlightFormModal.tsx` | UI 2 필드 (+ 포맷터 차이) | 168 / 81 |
| `src/i18n/translations.ts` | 4언어 키 | 8 / — |
| `src/config/__tests__/flight-schedules.test.ts` | 신규 단위 테스트 | +89 |
| `src/features/schedule/__tests__/useFlightSchedules.rollover.test.ts` | 신규 integration 테스트 | +91 |
| `docs/01-plan/features/flight-schedule-effective-window.plan.md` | Plan | 신규 |
| `docs/02-design/features/flight-schedule-effective-window.design.md` | Design | 신규 |
| `docs/03-analysis/flight-schedule-effective-window.analysis.md` | Analysis | 신규 |

총 6 소스 파일 변경(+ 3 문서), 약 490 insertions / 81 deletions.

## 5. 검증

### 자동화 테스트
- **Vitest**: 1241 / 1241 통과 (직전 1229 + 신규 12)
- **ESLint**: `--max-warnings 0`, 경고 0
- **TypeScript**: `tsc --noEmit` 에러 0
- **Vite build**: 8.32s (직전 9.05s), 프로덕션 번들 증분 없음

### 시나리오 검증 (rollover integration test)
| 시점 | 기대 | 실제 |
|---|---|---|
| 2026-04-11 12:00 | LJ001 1건, id `default-lj-001-apr10`, `departureTime='17:10'`, days `[0..6]` | ✅ |
| 2026-04-20 12:00 | LJ001 1건, id `default-lj-001-apr15`, `departureTime='19:55'`, days `[1,3,4,5,6]` | ✅ |
| 2026-04-27 12:00 | LJ001 0건 (두 window 모두 만료) | ✅ |
| Legacy custom override 존재 | rename + 저장소 영속화 | ✅ |

### 수동 확인 포인트
- `/schedule` 페이지(admin 전용) — 오늘(4/11) 접근 시 LJ001이 DAILY 17:10-21:10으로 표시됨을 배포 후 점검.
- 4/15 자정 이후 자동 전환 — 페이지 새로고침 시 반영.

## 6. 리스크 & 완화 결과

| 리스크 | 완화 | 결과 |
|---|---|---|
| localStorage legacy override 깨짐 | `LEGACY_ID_MAP` 자동 rename, test case 4로 보장 | ✅ 해결 |
| 브라우저 TZ 왜곡 | 로컬 시간 + 문자열 비교 | ✅ 회피 |
| 세션 rollover 미반영 | 새로고침 시 반영, 문서화 | ✅ 수용 (의도) |
| 복수 엔트리 중복 노출 | 필터 후 단일 active만 노출 | ✅ 테스트로 증명 |

## 7. 학습 / 회고

**잘된 점**
- Plan → Design → Do → Check 단일 세션 1회차 통과, rework 없음.
- 날짜 로직을 `Date` 객체 비교가 아닌 **`YYYY-MM-DD` 문자열 사전순 비교**로 단순화 — 타임존/DST 엣지케이스를 구조적으로 제거.
- Legacy id rename을 hook 초기화 단계에 idempotent로 심어 "명시적 마이그레이션 런타임"을 만들지 않고 해결.
- 설계에서 명시한 테스트(9)보다 3건(총 12) 더 작성했고, 그중 legacy migration 테스트가 실질적인 regression 방어선이 됐다.

**개선 여지**
- 훅 인스턴스가 **mount 시점 1회**의 `today`를 잡기 때문에, 24시간 이상 탭을 열어두고 자정을 넘기면 rollover가 즉시 반영되지 않음. 운영상 허용 가능하지만 필요 시 `visibilitychange` 이벤트로 재계산 가능.
- `FlightFormModal`의 effective window 편집 round-trip에 대한 컴포넌트 테스트가 없음 (Advisory A3). 분기 로직이 거의 없어 우선순위 낮음.
- Admin에서 "만료된 엔트리 보기" 토글 부재 — 장기 보관 엔트리 관리가 필요해지면 별도 feature로 도입 권장.

## 8. 후속 작업 후보

1. **`flight-schedule-show-inactive`** — admin에서 만료 엔트리 조회/복원 UI (Advisory A3 연결).
2. **`su-aeroflot-tariff`** — 동일 PDF의 RATE 테이블(AS45/13,100 등)을 config에 반영, 견적기에 연결.
3. **`flight-schedule-auto-rollover-notification`** — rollover 24h 전 admin에게 Slack 알림 (차기 주 PDF 업로드 리마인더).

## 9. 관련 문서

- Plan: `docs/01-plan/features/flight-schedule-effective-window.plan.md`
- Design: `docs/02-design/features/flight-schedule-effective-window.design.md`
- Analysis: `docs/03-analysis/flight-schedule-effective-window.analysis.md`
- 원본 PDF:
  - `~/My Drive (jhlim725@gmail.com)/GOODMAN/Schedule/SU 4월10일-14일 안내문.pdf`
  - `~/My Drive (jhlim725@gmail.com)/GOODMAN/Schedule/SU 4월 15일-25일 안내문.pdf`

## 10. 다음 단계

`/pdca archive flight-schedule-effective-window` — 완료 문서 4종을 `docs/archive/2026-04/flight-schedule-effective-window/`로 이동, `_INDEX.md` 갱신.
