# Gap Analysis: Code Quality Fixes (Phase A+B)

## Analysis Summary

| Item | Value |
|------|-------|
| Feature | code-quality-fixes |
| Date | 2026-04-05 |
| Design Doc | `docs/02-design/features/code-quality-fixes.design.md` |
| Scope | Phase A (H1-H3) + Phase B (H4) |
| Match Rate | **96%** |
| Iterations | 0 (first pass) |
| Recommendation | **Report** (>=90%, proceed to completion) |

## Category Scores

| Category | Weight | Score | Notes |
|----------|:------:|:-----:|-------|
| H1 URL Scheme Guard | 25% | 100% | Utility + integration match design exactly |
| H2 alert() → toast | 20% | 100% | Both call sites migrated, imports correct |
| H3 JetFuelWidget Key Fix | 15% | 100% | Key pattern `tick-${i}-${idx}` matches design |
| H4 useJetFuelPrices Refactor | 25% | 95% | Final design matched; +1 eslint-disable (improvement) |
| File Locations & Conventions | 15% | 85% | Test file co-located (deviates from design path) |

## Design Items Verification

### H1 — URL Scheme Guard (MATCH)

| Design Requirement | Implementation | Status |
|--------------------|----------------|:------:|
| `safeExternalHref(href: unknown): string` signature | `src/lib/urlSafety.ts:8` identical signature | OK |
| Returns `#` for non-string | `src/lib/urlSafety.ts:9` | OK |
| Trim + empty guard | `src/lib/urlSafety.ts:10-11` | OK |
| Allow relative `/` paths | `src/lib/urlSafety.ts:13` | OK |
| Allow http(s) via regex | `src/lib/urlSafety.ts:15` | OK |
| Block javascript:/data:/vbscript: | default `#` return line 16 | OK |
| NoticeWidget import | `NoticeWidget.tsx:7` | OK |
| Wrap `item.link` in `href` | `NoticeWidget.tsx:70` | OK |
| 8 test cases | 9 test cases (adds mixed-case JavaScript:) | OK (+) |

### H2 — alert() to toast (MATCH)

| Design Requirement | Implementation | Status |
|--------------------|----------------|:------:|
| Import `useToast` from `@/components/ui/Toast` | `UserManagementWidget.tsx:9` | OK |
| `const { toast } = useToast()` in component | line 23 | OK |
| `handleSaveClick` catch → `toast('error', ...)` | line 76 | OK |
| `handleDeleteClick` catch → `toast('error', ...)` | line 93 | OK |
| Fallback message on non-Error | both sites use ternary | OK |
| Zero `alert(` remaining in file | grep confirms 0 | OK |

### H3 — JetFuelWidget Duplicate Key (MATCH)

| Design Requirement | Implementation | Status |
|--------------------|----------------|:------:|
| `labelIndices.map((idx, i) => ...)` | `JetFuelWidget.tsx:101` | OK |
| `` key={`tick-${i}-${idx}`} `` | line 103 | OK |

### H4 — useJetFuelPrices Refactor (MATCH, with improvement)

| Design Requirement | Implementation | Status |
|--------------------|----------------|:------:|
| `const [reloadToken, setReloadToken] = useState(0)` | line 17 | OK |
| `let cancelled = false` in effect | line 20 | OK |
| `setLoading(true); setError(null)` at effect start | lines 23-24 | OK |
| `.then` guarded by `!cancelled` | line 28 | OK |
| `.catch` early-return on cancelled + Sentry | lines 30-36 | OK |
| `.finally` guarded by `!cancelled` | lines 37-39 | OK |
| Cleanup: `cancelled = true` | lines 41-43 | OK |
| Deps `[weeks, reloadToken]` | line 44 | OK |
| `retry = useCallback(() => setReloadToken(n => n+1), [])` | line 46 | OK |
| Result shape `{ data, loading, error, retry }` | line 48 | OK |

## Deviations

### D1 — Test File Location (LOW severity, convention improvement)

- **Design**: `src/lib/__tests__/urlSafety.test.ts`
- **Implementation**: `src/lib/urlSafety.test.ts` (co-located)
- **Rationale**: Existing `src/lib/pdfService.test.ts` uses the co-located pattern. Implementation follows established project convention.
- **Impact**: None (tests discovered and pass).

### D2 — eslint-disable for react-hooks/set-state-in-effect (LOW, improvement)

- **Design**: Not mentioned.
- **Implementation**: `useJetFuelPrices.ts:22` adds `// eslint-disable-next-line react-hooks/set-state-in-effect` on `setLoading(true)`, with comment explaining the data-fetching pattern.
- **Rationale**: New lint rule present in codebase required local override; pattern itself unchanged.
- **Impact**: Improvement — keeps 0-warning lint gate intact.

### D3 — Test act() wrap addition (LOW, improvement)

- **Design**: States "existing 5 tests pass as-is."
- **Implementation**: Wrapped `retry()` call in `act()` inside `useJetFuelPrices.test.ts`.
- **Rationale**: Discovered during validation — `setReloadToken` triggers state update outside automatic batching in tests.
- **Impact**: Improvement — eliminates the final act() warning (validation goal met).

### D4 — Test case count (LOW, improvement)

- **Design**: 8 test cases in `urlSafety.test.ts`.
- **Implementation**: 9 cases (added mixed-case `JavaScript:` coverage).
- **Impact**: Improvement — better security regex coverage.

## Deferred (Out of Scope — Not Gaps)

Per design §7:
- Phase C: `useCrudList<T>` generic hook + God component split
- Phase D: QuoteCalculator layoutProps memoization
- Phase E: i18n / font lazy split

## Validation Results

| Check | Design Target | Actual | Status |
|-------|---------------|--------|:------:|
| Test count | 1199 + 8 = 1207 | 1208 (+9 urlSafety) | PASS |
| `npm run lint` | 0 errors | 0 errors | PASS |
| `tsc --noEmit` | 0 errors | 0 errors | PASS |
| act() warnings | 0 | 0 (was 1) | PASS |
| Duplicate key warnings | 0 | 0 (was 1) | PASS |

## Match Rate Calculation

- Total design items in scope: 26 (H1:9 + H2:6 + H3:2 + H4:10 − 1 nullified)
- Fully matched: 25
- Minor spec deviations (all improvements): 4 (D1-D4)
- Hard gaps: 0

**Match Rate = 25/26 = 96%**

D1 is a true convention deviation; D2-D4 are implementation-time improvements. No functional gaps.

## Recommendation

**Proceed to Report** (`/pdca report code-quality-fixes`).

- Match rate 96% >= 90% threshold
- All design intents implemented correctly
- All validation gates pass
- Deviations are either improvements or align with existing project conventions
