# Plan: flight-schedule-effective-window

> Flight schedule의 유효기간(effective window) 기반 자동 전환 — 동일 flightNo의 구/신 스케줄을 동시에 보관하고 오늘 날짜에 맞는 항목만 노출

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | flight-schedule-effective-window |
| 우선순위 | Medium-High |
| 트리거 | Goodman GLS SU(555) rollover — 10-14 APR vs 15-25 APR LJ001 충돌 |
| 예상 영향 범위 | Frontend 4-6 파일 |
| Backend 변경 | 없음 (schedule은 프론트 config + localStorage override) |

### 배경

- `src/config/flight-schedules.ts`는 flight 당 **단일 엔트리**만 허용하는 구조.
- SU rollover 시 현재 active 구간(10-14 APR LJ001 DAILY 17:10-21:10)과 차기 구간(15-25 APR LJ001 D1,3,4,5,6 19:55-23:55)이 같은 `flightNo`이지만 서로 다른 값을 가져, 덮어쓰기 방식으로는 4/11~4/14 기간 동안 잘못된 스케줄이 노출됨.
- Goodman GLS에서 주기적으로 배포하는 SU/YP 등 GSSA PDF 안내문이 2-4주 단위로 교체되므로, 수동 교체 방식은 실수 위험이 크다.
- 해결책: `FlightSchedule`에 **유효기간 필드(effectiveFrom/effectiveTo)**를 추가하고, 오늘 날짜 기준으로 active 엔트리만 필터링.

## 2. 기존 구현 현황

| 구성요소 | 상태 | 파일 |
|----------|:----:|------|
| `FlightSchedule` interface | ✅ (effective 필드 없음) | `src/config/flight-schedules.ts:1-17` |
| `FLIGHT_SCHEDULES` 기본 데이터 | ✅ | `src/config/flight-schedules.ts:242~` |
| `useFlightSchedules()` merge 로직 | ✅ (id 기준 override) | `src/features/schedule/useFlightSchedules.ts:57-80` |
| `FlightFormModal` 편집 UI | ✅ | `src/features/schedule/components/FlightFormModal.tsx` |
| 유효기간 필터링 | ❌ | — |
| 유효기간 편집 UI | ❌ | — |

## 3. 구현 범위

### 3-1. `src/config/flight-schedules.ts` — 타입 확장

```ts
export interface FlightSchedule {
  id: string;
  // ... 기존 필드
  /** ISO date (YYYY-MM-DD). 미지정 시 하한 없음. */
  effectiveFrom?: string;
  /** ISO date (YYYY-MM-DD). 미지정 시 상한 없음. */
  effectiveTo?: string;
}
```

- 기존 모든 엔트리는 두 필드 미지정 상태로 유지 → 항상 active (backward compatible).
- SU LJ001 두 엔트리 신설:
  - `default-lj-001-apr10` — DAILY 17:10-21:10, `effectiveFrom: '2026-04-10'`, `effectiveTo: '2026-04-14'`
  - `default-lj-001-apr15` — D1,3,4,5,6 19:55-23:55, `effectiveFrom: '2026-04-15'`, `effectiveTo: '2026-04-25'`
- 기존 `default-lj-001` id는 `apr15`로 rename하고 remark의 "※ Until 14 APR…" 메모 삭제.

### 3-2. `src/features/schedule/useFlightSchedules.ts` — active window 필터링

- merge 결과를 반환하기 전에 `isActiveOn(schedule, today)` 함수로 필터링.
- `isActiveOn` 규칙:
  - `effectiveFrom` 미지정 or `today >= effectiveFrom` AND
  - `effectiveTo` 미지정 or `today <= effectiveTo`
- `today`는 `new Date().toISOString().slice(0,10)` KST 기준 (프론트는 브라우저 로컬 시간). 테스트용 주입 파라미터도 준비.

### 3-3. `src/features/schedule/components/FlightFormModal.tsx` — 편집 UI 추가

- "Effective From" / "Effective To" 날짜 입력(`<input type="date">`) 2개 필드 추가.
- 두 필드 모두 optional. 빈 값이면 필드 자체 제거(undefined)로 저장.
- 유효성: `from <= to` (둘 다 있을 때).

### 3-4. `src/features/schedule/components/FlightTable.tsx` / `CargoCapacityWidget.tsx` 등 소비자

- `useFlightSchedules()`의 필터 결과를 그대로 사용하므로 추가 변경 없음 (검증 필요).

### 3-5. 테스트

- `src/features/schedule/__tests__/useFlightSchedules.test.ts` 신규 또는 기존에 추가:
  1. 유효기간 미지정 → 항상 포함
  2. `today < effectiveFrom` → 제외
  3. `today > effectiveTo` → 제외
  4. `effectiveFrom <= today <= effectiveTo` → 포함
  5. LJ001 롤오버 시나리오: `today = 2026-04-11` → apr10 버전만, `today = 2026-04-20` → apr15 버전만

## 4. 범위 외 (Out of Scope)

- SU 이외 타 GSSA의 과거 PDF 데이터 백필.
- Backend(Rails) 측 schedule 저장.
- PDF → 자동 파싱/반영 (별도 feature 후보).
- SU RATE 테이블 반영 (별도 feature 후보 `su-aeroflot-tariff`).

## 5. 리스크

| 리스크 | 완화책 |
|--------|--------|
| localStorage에 이미 override된 LJ001 엔트리와 id 변경 충돌 | 구 id(`default-lj-001`)를 deleted로 처리 + 사용자 안내. 마이그레이션 스크립트 or 1회성 side-effect로 처리. |
| 브라우저 로컬 시간 왜곡 (여행/VPN) | 서버 시간을 쓰지 않고 브라우저 시간 그대로 사용. 오차 수 시간 수준은 수용. |
| 복수 엔트리로 인한 UI 중복 | 필터링 후 노출되므로 뷰 영향 없음. 단 admin 편집 화면에서는 만료된 엔트리도 볼 수 있게 "Show inactive" 토글 권장(선택 사항). |
| 날짜 비교 timezone 엣지케이스 | 문자열 비교(`YYYY-MM-DD`)로 타임존 회피. |

## 6. 성공 기준

- [ ] `FlightSchedule.effectiveFrom/effectiveTo` 타입 추가, 기존 엔트리 무영향.
- [ ] 2026-04-11 시점 `/schedule` 페이지에서 LJ001이 **DAILY 17:10-21:10**으로 노출.
- [ ] 2026-04-15 시점(테스트 시뮬레이션) LJ001이 **D1,3,4,5,6 19:55-23:55**로 노출.
- [ ] FlightFormModal에서 유효기간 편집 가능, 저장/재로드 라운드트립.
- [ ] `useFlightSchedules` 단위 테스트 5 케이스 전부 통과.
- [ ] `npm run lint && npm run build && npx vitest run` 전부 통과.

## 7. 예상 변경 파일

| 파일 | 변경 유형 | 추정 라인 |
|------|----------|----------|
| `src/config/flight-schedules.ts` | 타입 + 데이터 | ~30 |
| `src/features/schedule/useFlightSchedules.ts` | 필터링 로직 | ~20 |
| `src/features/schedule/components/FlightFormModal.tsx` | 입력 필드 2개 | ~30 |
| `src/features/schedule/__tests__/useFlightSchedules.test.ts` | 신규 테스트 | ~80 |
| `src/lib/date.ts` (선택, 유틸 추출 시) | `isActiveOn()` | ~15 |

총 5 파일, 약 175 라인.

## 8. 다음 단계

1. `/pdca design flight-schedule-effective-window` — Design 문서 작성 (id 마이그레이션 전략, 날짜 비교 함수 위치, 편집 UI 배치 확정).
2. Design 확정 후 `/pdca do flight-schedule-effective-window` — 구현.
3. `/pdca analyze flight-schedule-effective-window` — Gap 분석.
