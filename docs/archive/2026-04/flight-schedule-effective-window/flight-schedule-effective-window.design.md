# Design: flight-schedule-effective-window

> Plan: `docs/01-plan/features/flight-schedule-effective-window.plan.md`

## 1. 설계 목표

1. 같은 flightNo의 구/신 스케줄을 데이터에 공존시키되, `/schedule`·대시보드·PDF 등 모든 소비자에게는 **오늘 날짜에 유효한 엔트리만** 노출.
2. 기존 데이터/코드와 **100% backward compatible** — 유효기간 필드가 없는 엔트리는 항상 active.
3. Admin이 편집 UI에서 유효기간을 명시적으로 지정 가능.
4. localStorage에 이미 저장된 custom override와 안전하게 공존 (`default-lj-001` id rename 마이그레이션 포함).

## 2. 타입 설계

### 2-1. `FlightSchedule` 확장

```ts
// src/config/flight-schedules.ts
export interface FlightSchedule {
  id: string;
  airline: string;
  airlineCode: string;
  flightNo: string;
  aircraftType: string;
  flightType: 'cargo' | 'passenger' | 'combi';
  origin: string;
  destination: string;
  via?: string;
  departureDays: number[];
  departureTime: string;
  arrivalTime: string;
  flightDuration: string;
  maxCargoKg: number;
  remarks?: string;
  /** Inclusive. ISO date YYYY-MM-DD. Omit for "always from the past". */
  effectiveFrom?: string;
  /** Inclusive. ISO date YYYY-MM-DD. Omit for "never expires". */
  effectiveTo?: string;
}
```

### 2-2. 유틸 함수 (같은 파일에 export)

```ts
/** YYYY-MM-DD 문자열 기준 오늘 해당 스케줄이 active인지 판단 (경계 포함) */
export function isActiveOn(schedule: FlightSchedule, todayYmd: string): boolean {
  if (schedule.effectiveFrom && todayYmd < schedule.effectiveFrom) return false;
  if (schedule.effectiveTo && todayYmd > schedule.effectiveTo) return false;
  return true;
}

/** 브라우저 로컬 시간 기준 YYYY-MM-DD 문자열 (테스트 주입 가능) */
export function todayYmdLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

**결정 포인트**
- `todayYmdLocal`은 UTC `toISOString().slice(0,10)`가 아닌 **로컬 시간** 기반. 한국 자정 직전 UTC 변환 시 하루 차이가 발생해 LJ001 같은 야간편이 잘못된 구간으로 빠질 위험 방지.
- 문자열 비교(`<`, `>`)로 타임존·Date 객체 오차 회피. `YYYY-MM-DD` 포맷이 사전순 ≡ 시간순.
- `isActiveOn`은 **경계 포함** (`effectiveFrom`·`effectiveTo` 당일 active).

## 3. 데이터 변경 (`FLIGHT_SCHEDULES`)

### 3-1. LJ001 rollover 분리

기존 `default-lj-001` (15-25 APR 값) → `default-lj-001-apr15`로 id 변경 + `effectiveFrom/To` 부여.
새 `default-lj-001-apr10` 엔트리 추가 (10-14 APR 값, DAILY 17:10-21:10).

```ts
// ── LJ001 (Apr 10-14) ──
{
  id: 'default-lj-001-apr10',
  airline: 'Jin Air (feeder for SU)',
  airlineCode: 'LJ',
  flightNo: 'LJ 001',
  aircraftType: 'B737-800',
  flightType: 'passenger',
  origin: 'ICN',
  destination: 'BKK',
  departureDays: [0, 1, 2, 3, 4, 5, 6], // DAILY
  departureTime: '17:10',
  arrivalTime: '21:10',
  flightDuration: '6h 00m',
  maxCargoKg: 3000,
  remarks: 'SU feeder · KAS T2 · AS45 · Cut-off D-day 12:00 · N/B & MSDS pre-confirm required',
  effectiveFrom: '2026-04-10',
  effectiveTo: '2026-04-14',
},
// ── LJ001 (Apr 15-25) ──
{
  id: 'default-lj-001-apr15',
  airline: 'Jin Air (feeder for SU)',
  airlineCode: 'LJ',
  flightNo: 'LJ 001',
  // ... 기존 값 유지
  departureDays: [1, 3, 4, 5, 6],
  departureTime: '19:55',
  arrivalTime: '23:55',
  flightDuration: '6h 00m',
  maxCargoKg: 3000,
  remarks: 'SU feeder · KAS T2 · AS45 · Cut-off D-day 12:00 · N/B & MSDS pre-confirm required',
  effectiveFrom: '2026-04-15',
  effectiveTo: '2026-04-25',
},
```

- 기존 remark의 "※ Until 14 APR 2026: DAILY 17:10-21:10" 수기 메모는 제거 (데이터로 표현되므로 중복).
- TG/SU 본선은 두 PDF에서 동일하므로 유효기간 필드 없이 유지(=항상 active).

### 3-2. localStorage 마이그레이션

사용자 브라우저 localStorage `flight_schedules_custom`에 기존 `default-lj-001` id로 custom override가 저장되어 있을 수 있음.

**전략**: `useFlightSchedules` 초기 로드 시 1회 id rename.

```ts
function migrateLegacyIds(list: FlightSchedule[]): FlightSchedule[] {
  const legacyMap: Record<string, string> = {
    'default-lj-001': 'default-lj-001-apr15', // 기존 override는 15-25 APR 버전을 향하던 것으로 간주
  };
  let changed = false;
  const next = list.map((s) => {
    const newId = legacyMap[s.id];
    if (newId) {
      changed = true;
      return { ...s, id: newId };
    }
    return s;
  });
  if (changed) saveToStorage(STORAGE_KEY, next);
  return next;
}
```

- 마이그레이션은 idempotent — 이미 rename된 경우 map miss로 그대로 반환.
- `deletedIds`에 `default-lj-001`이 있는 경우 `default-lj-001-apr15`로 rename (동일 로직 재사용 헬퍼).

## 4. 필터링 로직 (`useFlightSchedules`)

```ts
const schedules = useMemo(() => {
  const today = todayYmdLocal();
  const deletedSet = new Set(deletedIds);
  const customMap = new Map(customSchedules.map((s) => [s.id, s]));

  const merged: FlightSchedule[] = [];
  for (const def of FLIGHT_SCHEDULES) {
    if (deletedSet.has(def.id)) continue;
    const entry = customMap.has(def.id) ? customMap.get(def.id)! : def;
    if (customMap.has(def.id)) customMap.delete(def.id);
    if (isActiveOn(entry, today)) merged.push(entry);
  }
  for (const s of customMap.values()) {
    if (!deletedSet.has(s.id) && isActiveOn(s, today)) {
      merged.push(s);
    }
  }
  return merged;
}, [customSchedules, deletedIds]);
```

**주의점**
- `today`는 useMemo 내부에서 **mount 시 1회** 계산. 세션 수명 동안 고정 → 24시간 이상 열어두면 rollover가 즉시 반영되지 않음. 페이지 새로고침 시 반영. 이건 수용 (트레이드오프).
- `useFlightSchedules` hook은 `schedules: FlightSchedule[]` 외부 API는 그대로 → 소비자(FlightTable/RouteMap3D/CargoCapacityWidget/useAggregatedRoutes) 무변경.

## 5. 편집 UI (`FlightFormModal`)

Remarks 입력 직전에 2개 `<input type="date">` 필드 추가:

```tsx
{/* Effective Window */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {t('schedule.effectiveFrom')}
    </label>
    <input
      type="date"
      value={form.effectiveFrom ?? ''}
      onChange={(e) =>
        setForm((p) => ({ ...p, effectiveFrom: e.target.value || undefined }))
      }
      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {t('schedule.effectiveTo')}
    </label>
    <input
      type="date"
      value={form.effectiveTo ?? ''}
      min={form.effectiveFrom || undefined}
      onChange={(e) =>
        setForm((p) => ({ ...p, effectiveTo: e.target.value || undefined }))
      }
      className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
    />
  </div>
</div>
```

**결정 포인트**
- 둘 다 optional. 빈 문자열 저장 방지 — `|| undefined`로 직렬화.
- `min={form.effectiveFrom}`로 브라우저가 `to < from` 입력을 즉시 거부.
- i18n 키 `schedule.effectiveFrom` / `schedule.effectiveTo`는 `src/i18n/translations.ts`에 4언어(en/ko/cn/ja) 추가.

**i18n 값 (초기안)**
| key | en | ko | cn | ja |
|---|---|---|---|---|
| schedule.effectiveFrom | Effective From | 유효 시작일 | 生效开始日 | 有効開始日 |
| schedule.effectiveTo | Effective To | 유효 종료일 | 生效结束日 | 有効終了日 |

## 6. 테스트 전략

### 6-1. 순수 함수 단위 테스트 — `src/config/__tests__/flight-schedules.test.ts` (신규)

```ts
import { describe, it, expect } from 'vitest';
import { isActiveOn, todayYmdLocal, type FlightSchedule } from '../flight-schedules';

const base: FlightSchedule = {
  id: 'x',
  airline: 'A', airlineCode: 'AA',
  flightNo: 'AA 1', aircraftType: 'B77F',
  flightType: 'cargo', origin: 'ICN', destination: 'LAX',
  departureDays: [1], departureTime: '10:00', arrivalTime: '06:00',
  flightDuration: '12h', maxCargoKg: 100,
};

describe('isActiveOn', () => {
  it('returns true when both window fields are missing', () => {
    expect(isActiveOn(base, '2026-04-11')).toBe(true);
  });
  it('respects effectiveFrom lower bound (exclusive before)', () => {
    const s = { ...base, effectiveFrom: '2026-04-15' };
    expect(isActiveOn(s, '2026-04-14')).toBe(false);
    expect(isActiveOn(s, '2026-04-15')).toBe(true); // inclusive
  });
  it('respects effectiveTo upper bound (inclusive on last day)', () => {
    const s = { ...base, effectiveTo: '2026-04-25' };
    expect(isActiveOn(s, '2026-04-25')).toBe(true);
    expect(isActiveOn(s, '2026-04-26')).toBe(false);
  });
  it('returns false outside window on both sides', () => {
    const s = { ...base, effectiveFrom: '2026-04-10', effectiveTo: '2026-04-14' };
    expect(isActiveOn(s, '2026-04-09')).toBe(false);
    expect(isActiveOn(s, '2026-04-10')).toBe(true);
    expect(isActiveOn(s, '2026-04-14')).toBe(true);
    expect(isActiveOn(s, '2026-04-15')).toBe(false);
  });
});

describe('todayYmdLocal', () => {
  it('formats as YYYY-MM-DD using local time', () => {
    expect(todayYmdLocal(new Date(2026, 3, 11, 23, 59))).toBe('2026-04-11');
    expect(todayYmdLocal(new Date(2026, 11, 1, 0, 0))).toBe('2026-12-01');
  });
});
```

### 6-2. Integration — LJ001 rollover 시나리오

`src/features/schedule/__tests__/useFlightSchedules.rollover.test.ts` (신규):
1. `vi.setSystemTime(new Date('2026-04-11T12:00:00+09:00'))` → `schedules`에 LJ001 한 건만, `departureTime === '17:10'`.
2. `vi.setSystemTime(new Date('2026-04-20T12:00:00+09:00'))` → LJ001 한 건만, `departureTime === '19:55'`.
3. `vi.setSystemTime(new Date('2026-04-27T12:00:00+09:00'))` → LJ001 0건 (두 window 모두 지남).

`@testing-library/react` `renderHook` 사용, `beforeEach`에서 `localStorage.clear()` + `vi.useFakeTimers({ toFake: ['Date'] })`.

### 6-3. 기존 테스트 회귀

`src/config/__tests__/tariff-pdf-verify.test.ts`(918) 등 flight-schedule과 무관한 테스트는 영향 없음. 전체 1229 테스트 실행으로 회귀 확인.

## 7. Open Questions (해결됨)

| Q | 결정 |
|---|------|
| Q1. `today` 계산 위치 — hook 내부 vs 외부 주입? | **hook 내부 mount 1회**. 세션 rollover는 수용. 테스트는 `vi.setSystemTime`. |
| Q2. 타임존 — UTC vs 로컬? | **로컬** (`todayYmdLocal`). 한국 자정 근처 야간편 오작동 방지. |
| Q3. `isActiveOn` 위치 — 별도 util vs config 파일? | **config 파일에 co-locate**. 파일 추가 없음, 소비자가 한 import로 해결. |
| Q4. localStorage id 마이그레이션? | **자동 rename** (`default-lj-001` → `default-lj-001-apr15`). idempotent. `deletedIds` 동기 처리. |
| Q5. 편집 UI에 "만료된 엔트리 표시" 토글? | **범위 외**. 현재는 admin도 active만 봄. 필요 시 후속 feature. |

## 8. Implementation Order (Do phase에서 사용)

| # | 작업 | 파일 | 라인 예상 |
|---|------|------|----------|
| S1 | `FlightSchedule` 타입에 `effectiveFrom`/`effectiveTo` 추가 | `src/config/flight-schedules.ts` | +2 |
| S2 | `isActiveOn`, `todayYmdLocal` export 추가 | `src/config/flight-schedules.ts` | +20 |
| S3 | LJ001 데이터: id rename + apr10 entry 추가 + 기존 메모 제거 | `src/config/flight-schedules.ts` | ~30 |
| S4 | `useFlightSchedules`에 `migrateLegacyIds` + merge 후 `isActiveOn` 필터 | `src/features/schedule/useFlightSchedules.ts` | +25 |
| S5 | `FlightFormModal`에 유효기간 2 필드 추가 | `src/features/schedule/components/FlightFormModal.tsx` | +30 |
| S6 | i18n 키 4언어 추가 | `src/i18n/translations.ts` | +8 |
| S7 | `isActiveOn` / `todayYmdLocal` 단위 테스트 | `src/config/__tests__/flight-schedules.test.ts` | +50 |
| S8 | LJ001 rollover integration 테스트 | `src/features/schedule/__tests__/useFlightSchedules.rollover.test.ts` | +60 |
| S9 | `npm run lint && npm run build && npx vitest run` | — | — |

**총**: 6 파일 변경(S1-S8에서 중복 제외), ~225 라인.

## 9. 롤백 전략

각 단계 파일 단위로 독립 rollback 가능:
- S1-S3: `flight-schedules.ts` 단일 파일 revert → 타입·데이터 원복 (다만 S4의 필터 로직이 `isActiveOn`에 의존하므로 S4도 함께 revert 필요).
- S5-S6: UI/번역만 revert → 데이터 레이어 영향 없음.
- S7-S8: 테스트만 revert.

한 커밋에 전부 묶되 커밋 메시지에 단계 구분 기록.

## 10. 성공 기준 (Plan 재확인)

- [x] 타입 확장, backward compatible
- [x] 2026-04-11 → LJ001 17:10-21:10
- [x] 2026-04-15 → LJ001 19:55-23:55
- [x] FlightFormModal 편집/라운드트립
- [x] 단위 + integration 테스트 케이스 명세
- [x] lint/build/vitest 통과 목표

## 11. 다음 단계

`/pdca do flight-schedule-effective-window` — Implementation Order 순서대로 구현.
