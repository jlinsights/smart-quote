# Plan: security-hardening

> Smart Quote System - Security Hardening & Error Handling Improvements

## 1. Overview

| Item | Detail |
|------|--------|
| Feature | Security hardening and error feedback improvements |
| Priority | High |
| Complexity | Moderate |
| Estimated Scope | 8 files (frontend) + 2 files (backend) |
| Origin | Code analysis B+ (82/100) — 6 High-priority issues identified |

## 2. Problem Statement

The code analysis revealed **6 High-priority** security and reliability issues:

### H1: PII in URL Query Parameters
- **File**: `src/api/marginRuleApi.ts:48`
- **Issue**: `resolveMargin()` passes user email as a GET query parameter
- **Risk**: Email exposed in browser history, server access logs, CDN logs, proxy logs
- **Fix**: Change to POST request body

### H2: Silent Error Swallowing (Admin CRUD)
- **File**: `src/features/admin/components/TargetMarginRulesWidget.tsx:112-116, 125-127`
- **Issue**: `catch {}` blocks silently discard errors on create/update/delete
- **Risk**: Admin has zero feedback when operations fail — data loss potential
- **Fix**: Add toast/alert error feedback with meaningful messages

### H3: Silent Failure on Rules Fetch
- **File**: `src/features/dashboard/hooks/useMarginRules.ts:13`
- **Issue**: `catch {}` silently ignores fetch failures
- **Risk**: Widget shows stale/empty data without indication
- **Fix**: Add error state to hook, surface in widget UI

### H4: Missing Input Validation on Resolve Endpoint
- **File**: Backend `margin_rules_controller.rb` (resolve action)
- **Issue**: `params[:email]` and `params[:weight]` not validated before use
- **Risk**: SQL injection risk (mitigated by ORM), but nil errors and type coercion bugs possible
- **Fix**: Add `before_action` param validation for resolve endpoint

### H5: Hardcoded Email Addresses in Frontend
- **File**: `src/pages/QuoteCalculator.tsx` (fallback logic)
- **Issue**: Hardcoded admin email addresses in client-side code
- **Risk**: Information disclosure — users can see admin email addresses in JS bundle
- **Fix**: Move email references to environment config or remove from frontend

### H6: `(import.meta as any)` Type Escape
- **File**: `src/api/exchangeRateApi.ts:48`
- **Issue**: Uses `(import.meta as any).env` to bypass TypeScript
- **Risk**: Type safety violation, silently broken env vars
- **Fix**: Add proper `ImportMeta` interface declaration in `vite-env.d.ts`

## 3. Goals

| Goal | Metric | Target |
|------|--------|--------|
| Eliminate PII in URLs | resolveMargin uses POST | 100% |
| Error feedback coverage | All CRUD ops show toast on failure | 100% |
| Input validation | Backend validates all resolve params | 100% |
| Type safety | Zero `as any` casts in API layer | 0 instances |
| Security score improvement | Code analysis security check | All PASS |

## 4. Scope

### In Scope
- H1: Change `resolveMargin` GET → POST (frontend + backend)
- H2: Add error feedback (toast) to TargetMarginRulesWidget CRUD operations
- H3: Add error state to `useMarginRules` hook + surface in widget
- H4: Add param validation to backend resolve endpoint
- H5: Remove hardcoded emails from frontend bundle
- H6: Fix `import.meta` type declaration

### Out of Scope
- Medium-priority issues (M1-M9) — separate PDCA cycle
- Backend deployment / migration
- New test files (will update existing tests only)

## 5. Implementation Order

```
Phase 1: API Security (H1 + H4)
  ├── Backend: Add POST route for resolve, validate params
  └── Frontend: Change resolveMargin to POST with body

Phase 2: Error Feedback (H2 + H3)
  ├── Add error state to useMarginRules hook
  ├── Add toast/alert to TargetMarginRulesWidget CRUD failures
  └── Surface error state in widget UI

Phase 3: Code Hygiene (H5 + H6)
  ├── Remove hardcoded emails from QuoteCalculator
  └── Fix import.meta type declaration in vite-env.d.ts
```

## 6. Affected Files

### Frontend (Modify)
| File | Change |
|------|--------|
| `src/api/marginRuleApi.ts` | `resolveMargin` GET → POST |
| `src/features/admin/components/TargetMarginRulesWidget.tsx` | Add error toast on CRUD failure |
| `src/features/dashboard/hooks/useMarginRules.ts` | Add `error` state |
| `src/features/dashboard/hooks/useResolvedMargin.ts` | Update to POST |
| `src/pages/QuoteCalculator.tsx` | Remove hardcoded emails |
| `src/vite-env.d.ts` | Add `ImportMetaEnv` type |
| `src/api/exchangeRateApi.ts` | Remove `as any` cast |

### Backend (Modify)
| File | Change |
|------|--------|
| `config/routes.rb` | Add POST route for resolve |
| `app/controllers/api/v1/margin_rules_controller.rb` | Accept POST, add validation |

### Tests (Update)
| File | Change |
|------|--------|
| `src/api/__tests__/marginRuleApi.test.ts` | Update resolve test to POST |
| `src/features/admin/components/__tests__/TargetMarginRulesWidget.test.tsx` | Add error feedback tests |

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Backend route change breaks existing resolve calls | Keep GET as deprecated alias for 1 release cycle |
| Toast notification dependency | Use existing sonner/toast pattern already in project |
| Env var changes affect CI/CD | Only adding type declarations, not new env vars |

## 8. Success Criteria

- [ ] `resolveMargin` sends POST with email in request body (not URL)
- [ ] Backend validates `email`, `nationality`, `weight` params with proper error responses
- [ ] All CRUD operations in TargetMarginRulesWidget show error messages on failure
- [ ] `useMarginRules` returns `error` state, widget displays error indicator
- [ ] No hardcoded email addresses in frontend JS bundle
- [ ] Zero `as any` casts in API layer
- [ ] All 208+ existing tests still pass
- [ ] `npm run build` succeeds with 0 TypeScript errors
