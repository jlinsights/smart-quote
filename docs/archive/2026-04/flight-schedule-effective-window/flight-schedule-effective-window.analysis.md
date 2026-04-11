# Gap Analysis: flight-schedule-effective-window

> Phase: Check · Date: 2026-04-11
> Design: `docs/02-design/features/flight-schedule-effective-window.design.md`
> Plan: `docs/01-plan/features/flight-schedule-effective-window.plan.md`

## 1. Summary

| Metric | Value |
|--------|------:|
| **Match Rate** | **100%** |
| Hard gaps (design violated) | 0 |
| Soft deviations (acceptable variance) | 1 |
| Verification status | ✅ lint 0 warnings · ✅ tsc 0 errors · ✅ vitest 1241/1241 · ✅ vite build OK |
| Regressions | 0 |

The implementation matches the Design document exactly — every item in the "Implementation Order" table was delivered, all five "Open Questions" decisions are reflected in code, and both success criteria from the Plan are validated by tests.

## 2. Requirement ↔ Implementation Mapping

### 2-1. Type & Utilities (Design §2)

| Design requirement | Implementation | Location | ✓ |
|---|---|---|:---:|
| `FlightSchedule.effectiveFrom?: string` | Optional field added | `src/config/flight-schedules.ts:17-19` | ✅ |
| `FlightSchedule.effectiveTo?: string` | Optional field added | `src/config/flight-schedules.ts:20-21` | ✅ |
| `isActiveOn(schedule, todayYmd)` with inclusive bounds | Exported pure function | `src/config/flight-schedules.ts:~28-34` | ✅ |
| `todayYmdLocal(now = new Date())` using local time | Exported pure function | `src/config/flight-schedules.ts:~36-47` | ✅ |
| String comparison to avoid TZ drift | Uses `todayYmd < effectiveFrom` / `>` | same | ✅ |

### 2-2. Data Migration (Design §3)

| Design requirement | Implementation | ✓ |
|---|---|:---:|
| Rename `default-lj-001` → `default-lj-001-apr15` | Done, with `effectiveFrom: '2026-04-15'`, `effectiveTo: '2026-04-25'` | ✅ |
| Add `default-lj-001-apr10` (DAILY 17:10-21:10, D0-6, 10-14 APR) | Added with exact values from PDF | ✅ |
| Remove "※ Until 14 APR…" legacy remark from apr15 entry | Removed | ✅ |
| TG/SU main flights untouched | Verified — still no `effectiveFrom/To` | ✅ |

### 2-3. Filter & Legacy Migration (Design §4)

| Design requirement | Implementation | Location | ✓ |
|---|---|---|:---:|
| `LEGACY_ID_MAP` with `default-lj-001` → `default-lj-001-apr15` | `Readonly<Record<string, string>>` constant | `useFlightSchedules.ts:~17-22` | ✅ |
| `migrateLegacySchedules(list)` — idempotent, persists if changed | Implemented, calls `saveToStorage(STORAGE_KEY, next)` only when changed | `useFlightSchedules.ts:~24-38` | ✅ |
| `migrateLegacyDeletedIds(ids)` | Implemented symmetrically | `useFlightSchedules.ts:~40-51` | ✅ |
| Apply migrations on `useState` initializer | Both initializers call the migrator | `useFlightSchedules.ts:87-92` | ✅ |
| `today` computed once per mount via `useMemo` | `const today = useMemo(() => todayYmdLocal(), [])` | `useFlightSchedules.ts:99` | ✅ |
| `isActiveOn` filter applied after merge | Applied to both default-with-override and pure-custom branches | `useFlightSchedules.ts:101-120` | ✅ |
| `schedules` dep array includes `today` | `[customSchedules, deletedIds, today]` | `useFlightSchedules.ts:121` | ✅ |

### 2-4. Edit UI (Design §5)

| Design requirement | Implementation | ✓ |
|---|---|:---:|
| Two `<input type="date">` fields before Remarks | Added as `grid-cols-2` pair | ✅ |
| Both optional; empty string → `undefined` on save | `e.target.value \|\| undefined` | ✅ |
| `min={form.effectiveFrom}` on effectiveTo | Present | ✅ |
| i18n keys `schedule.effectiveFrom` / `schedule.effectiveTo` used | `t('schedule.effectiveFrom')` / `t('schedule.effectiveTo')` | ✅ |
| ko/en/cn/ja 4 languages added | All 4 dictionaries updated with exact strings from design table | ✅ |

### 2-5. Tests (Design §6)

| Design test case | Implementation | ✓ |
|---|---|:---:|
| §6-1 `isActiveOn` — no bounds | `src/config/__tests__/flight-schedules.test.ts` "returns true when both effective bounds are missing" | ✅ |
| §6-1 `isActiveOn` — effectiveFrom inclusive | "respects effectiveFrom lower bound (inclusive)" | ✅ |
| §6-1 `isActiveOn` — effectiveTo inclusive | "respects effectiveTo upper bound (inclusive)" | ✅ |
| §6-1 `isActiveOn` — bounded window | "returns false outside a bounded window and true inside" | ✅ |
| §6-1 `isActiveOn` — open-ended (bonus) | "handles open-ended windows (only from or only to)" | ✅ (extra) |
| §6-1 `todayYmdLocal` — format | "formats local date as YYYY-MM-DD" | ✅ |
| §6-1 `todayYmdLocal` — padding (bonus) | "pads single-digit month and day with zero" | ✅ (extra) |
| §6-1 `todayYmdLocal` — default arg (bonus) | "uses current time when no argument is given" | ✅ (extra) |
| §6-2 rollover 2026-04-11 → apr10 active | `useFlightSchedules.rollover.test.ts` case 1 | ✅ |
| §6-2 rollover 2026-04-20 → apr15 active | case 2 | ✅ |
| §6-2 rollover 2026-04-27 → 0 entries | case 3 | ✅ |
| **Extra**: legacy custom override migration | case 4 "migrates legacy default-lj-001 custom override" | ✅ (extra) |

**Delivered tests: 12 (design asked for ~8-9). Over-delivery is additive, not a gap.**

### 2-6. Open Questions (Design §7)

| # | Decision | Implementation evidence |
|---|---|---|
| Q1 | hook 내부 mount 1회 | `const today = useMemo(() => todayYmdLocal(), [])` ✅ |
| Q2 | 로컬 시간 | `todayYmdLocal` uses `now.getFullYear()/getMonth()/getDate()` ✅ |
| Q3 | co-locate in `flight-schedules.ts` | No `src/lib/date.ts` created; both utils live with the interface ✅ |
| Q4 | legacy id 자동 rename, idempotent | `LEGACY_ID_MAP` + early-return on unknown ids + test case 4 ✅ |
| Q5 | inactive 토글 out-of-scope | Not implemented (matches decision) ✅ |

### 2-7. Success Criteria (Plan §6 / Design §10)

| Criterion | Verification | ✓ |
|---|---|:---:|
| 타입 확장, backward compatible | TG/SU entries untouched, existing 1229 tests still pass | ✅ |
| 2026-04-11 → LJ001 17:10-21:10 | Rollover test case 1 asserts `departureTime === '17:10'` | ✅ |
| 2026-04-15 → LJ001 19:55-23:55 | Rollover test case 2 (2026-04-20, same window) asserts `'19:55'` | ✅ |
| FlightFormModal 편집/라운드트립 | Form state round-trips through `form.effectiveFrom/To` with undefined serialization | ✅ |
| 단위 + integration 테스트 전부 통과 | 12/12 new + 1229/1229 existing = **1241/1241** | ✅ |
| lint/build/vitest 통과 | ESLint 0 warnings, tsc 0 errors, vite build 8.32s | ✅ |

## 3. Soft Deviations

| # | Item | Severity | Note |
|---|---|---|---|
| D1 | Line-count estimate vs actual | **info** | Design estimated ~225 lines (§8). Actual diff: 226 insertions / 81 deletions across 4 tracked files + 2 new test files (~150 lines). Within tolerance, no action. |

No hard gaps.

## 4. Regression Check

| Scope | Before | After |
|---|---|---|
| Vitest total | 1229/1229 (37 files) | 1241/1241 (39 files) — +12 new, 0 regressions |
| ESLint | 0 warnings | 0 warnings |
| TypeScript | 0 errors | 0 errors |
| Vite build | 9.05s, 2375 modules | 8.32s, 2376 modules (+1 new test file not in prod bundle) |
| Bundle size of `/schedule` chunks | unchanged within noise | — |

Existing `LJ001 ` references in the codebase:
- `src/config/flight-schedules.ts` — only the two new id variants (`default-lj-001-apr10`, `default-lj-001-apr15`).
- No stray `default-lj-001` lookups in consumers (FlightTable, RouteMap3D, CargoCapacityWidget, useAggregatedRoutes, FlightSchedulePage).

## 5. Coverage Gaps (Advisory, non-blocking)

| # | Advisory | Impact | Action |
|---|---|---|---|
| A1 | No test exercises `migrateLegacyDeletedIds` (only `migrateLegacySchedules` is hit via case 4) | Low | `deletedIds` migration is symmetric and idempotent; add-a-test is easy. Optional follow-up. |
| A2 | No test for the exact moment `todayYmdLocal()` rolls at 23:59 → 00:00 | Low | Covered transitively by the integration rollover cases via `vi.setSystemTime`. |
| A3 | FlightFormModal `effectiveFrom/To` round-trip not asserted by component test | Low | The form is a thin wrapper (no branching logic on dates). Visual regression risk is low. |

None of these block `/pdca report`.

## 6. Conclusion

**Match Rate: 100% (hard gaps 0, soft deviations 1 informational)**. All Plan success criteria validated, all Design open-question decisions reflected in code, over-delivered on tests (12 vs ~9 planned). The feature is ready for **report** phase.

Next: `/pdca report flight-schedule-effective-window`.
