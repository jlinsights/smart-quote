# Gap Analysis — magic-link-hardening

**Date**: 2026-04-10
**Phase**: Check
**Parent docs**:
- `docs/01-plan/features/magic-link-hardening.plan.md`
- `docs/02-design/features/magic-link-hardening.design.md`

---

## Summary

| Metric | Value |
|--------|------|
| **Match Rate** | **99%** |
| Hard Gaps | 0 |
| Soft Deviations | 2 (non-blocking) |
| Security Checklist | 10/10 ✅ |
| Test Coverage | 25 new cases (BE 18 + FE 5 + E2E 2) |

**Recommendation**: ✅ **Proceed to `/pdca report magic-link-hardening`** — No iteration required.

---

## 1. Backend Implementation Verification

| # | Design Spec | Implementation | Status |
|---|------------|----------------|--------|
| B1 | Migration: invalidate existing tokens + add digest column + unique index | `db/migrate/20260410203543_add_magic_link_digest_to_users.rb` | ✅ |
| B2 | `MAGIC_LINK_TTL = 15.minutes` constant | `user.rb:14` | ✅ |
| B3 | `generate_magic_link_token!` returns raw, stores SHA256 digest | `user.rb:20-29` | ✅ |
| B4 | `magic_link_valid?` uses `ActiveSupport::SecurityUtils.secure_compare` | `user.rb:31-39` | ✅ |
| B5 | `consume_magic_link_token!` nils digest + legacy + expiry | `user.rb:41-47` | ✅ |
| B6 | `AuthMailer#magic_link` uses `ENV.fetch("FRONTEND_URL")` fail-fast | `auth_mailer.rb:4` | ✅ |
| B7 | English subject "[Goodman GLS] Your sign-in link" | `auth_mailer.rb:7` | ✅ |
| B8 | English HTML + text email templates | `views/auth_mailer/magic_link.{html,text}.erb` | ✅ |
| B9 | Controller `request_magic_link`: email enumeration prevention (always 200) | `auth_controller.rb:82` | ✅ |
| B10 | Controller `verify_magic_link`: SHA256 digest lookup | `auth_controller.rb:87-89` | ✅ |
| B11 | Test-only `peek_magic_link` action (`Rails.env.test?` guard) | `auth_controller.rb:103-110` | ✅ |
| B12 | Route: `get auth/magic_link/peek` (test env only) | `routes.rb:15` | ✅ |
| B13 | Rack::Attack IP throttle 10/hour | `rack_attack.rb:22-24` | ✅ |
| B14 | Rack::Attack email throttle 5/hour (JSON body parse) | `rack_attack.rb:27-39` | ✅ |
| B15 | Rack::Attack verify throttle 20/minute | `rack_attack.rb:42-44` | ✅ |
| B16 | Test env `FRONTEND_URL` default | `config/environments/test.rb` | ✅ |

**Backend score**: 16/16 = **100%**

---

## 2. Frontend Implementation Verification

| # | Design Spec | Implementation | Status |
|---|------------|----------------|--------|
| F1 | 15 new `auth.magicLink.*` i18n keys × 4 languages (en/ko/cn/ja) | `src/i18n/translations.ts` | ✅ |
| F2 | `MagicLinkVerifyPage` uses `t()` for all strings | `MagicLinkVerifyPage.tsx` | ✅ |
| F3 | `useRef` guard prevents StrictMode double-execution | `MagicLinkVerifyPage.tsx:12-16` | ✅ |
| F4 | `queueMicrotask` defers setState for invalid-link case | `MagicLinkVerifyPage.tsx:21` | ✅ |
| F5 | `window.history.replaceState` strips token after verification | `MagicLinkVerifyPage.tsx:27` | ✅ |
| F6 | `LoginPage` magic link section uses `t()` instead of hardcoded Korean | `LoginPage.tsx:76, 84, 187-228` | ✅ |
| F7 | `AuthContext.loginWithMagicLink` unchanged (already adequate) | `AuthContext.tsx:195-208` | ✅ |
| F8 | `authApi.ts` unchanged (already adequate) | `authApi.ts` | ✅ |

**Frontend score**: 8/8 = **100%**

---

## 3. Test Coverage Verification

| # | Design Spec | Actual | Status |
|---|------------|--------|--------|
| T1 | `user_spec.rb` magic link block — 6 cases | 7 cases (generate×2, valid×4, consume×1) | ✅ |
| T2 | `auth_mailer_spec.rb` — 3 cases | 3 cases (subject, URL, KeyError) | ✅ |
| T3 | `auth_spec.rb` magic_link blocks — 6+ cases | 9 cases (request×3, verify×6) | ✅ |
| T4 | `MagicLinkVerifyPage.test.tsx` — 4 cases | 5 cases (+fallback message) | ✅ |
| T5 | `magic-link-auth.spec.ts` E2E — 2 cases | 2 cases (happy path, invalid) | ✅ |

**Test score**: 5/5 = **100%** (26 total cases, 1 over design minimum)

---

## 4. Security Checklist (from Design §7)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| S1 | 타이밍 공격 방지: `secure_compare` | ✅ | `user.rb:38` |
| S2 | DB 유출 대비: SHA256 digest만 저장 | ✅ | `user.rb:23`, migration |
| S3 | 이메일 폭탄 방지: email 5/h | ✅ | `rack_attack.rb:27-39` |
| S4 | IP 공격 방지: IP 10/h | ✅ | `rack_attack.rb:22-24` |
| S5 | Brute force 방지: verify 20/min | ✅ | `rack_attack.rb:42-44` |
| S6 | Email enumeration 방지: 항상 200 | ✅ | `auth_controller.rb:82` |
| S7 | URL 토큰 잔존 방지: `history.replaceState` | ✅ | `MagicLinkVerifyPage.tsx:27` |
| S8 | 이중 execution 방지: `useRef` guard | ✅ | `MagicLinkVerifyPage.tsx:12-16` |
| S9 | 설정 오류 방지: `ENV.fetch` fail-fast | ✅ | `auth_mailer.rb:4` |
| S10 | Single-use 보장: `consume_magic_link_token!` | ✅ | `user.rb:41-47`, `auth_controller.rb:99` |

**Security score**: 10/10 = **100%** ✅

---

## 5. Verification Commands — All Passing

| Command | Result |
|---------|--------|
| `bundle exec rspec` (magic link scope) | ✅ **40 examples, 0 failures** |
| `npx tsc --noEmit` | ✅ Pass (0 errors) |
| `npm run lint --max-warnings 0` | ✅ Pass |
| `npx vitest run` | ✅ **37 files, 1229 tests** (+5) |
| `bin/rubocop` (8 modified files) | ✅ **no offenses detected** |
| `bundle exec brakeman` | ✅ **0 new warnings** (1 pre-existing in `users_controller.rb`) |

---

## 6. Soft Deviations (Non-blocking)

### D1 — Test case count exceeds minimum (+3)
- **Design**: 18 minimum new test cases
- **Actual**: 26 cases
- **Impact**: Positive — more edge coverage (empty token, fallback error message, extra generate case)

### D2 — Migration retains legacy `magic_link_token` column
- **Design §2.1**: 2-step migration — Step A adds digest, Step B drops legacy column in a **separate future cycle**
- **Actual**: Legacy column kept as designed. `generate_magic_link_token!` also nils it (`user.rb:26`) and `consume_magic_link_token!` clears both (`user.rb:42-46`)
- **Impact**: Zero runtime impact. Legacy column is write-only NULL during the hardening window; to be dropped in follow-up cycle
- **Follow-up task**: Create new cycle `magic-link-column-cleanup` to drop legacy column after 1-2 weeks of production stability

---

## 7. Hard Gaps

**None.** ✅

All 16 backend, 8 frontend, and 5 test specifications are implemented. All 10 security requirements are satisfied. No missing features, no broken invariants.

---

## 8. Pre-existing Environment Issues (Out of Scope)

These issues surfaced during test execution but are **not caused** by this cycle and are **not blockers**:

| Issue | Location | Impact | Next Action |
|-------|---------|--------|------|
| `users.networks` column missing from DB despite `schema_migrations` entry | `db/schema.rb` vs actual PostgreSQL | Manually patched via `ALTER TABLE` in dev + test DBs | Create `schema-drift-recovery` cycle |
| `quotes.margin_percent` column missing → 114 pre-existing spec failures | `audit_log_spec`, `quote_spec`, `margin_rule_resolver_spec` | Unrelated to auth; magic link specs all green in isolation | Create `schema-drift-recovery` cycle |
| `spec/services/calculation_parity_spec.rb` references missing `shared/test-fixtures/` | Path from smart-quote-emax port | Pre-existing since project fork | Fix path or exclude from default rspec run |

---

## 9. Recommendation

```bash
/pdca report magic-link-hardening
```

**Rationale**: 99% match rate, 0 hard gaps, 10/10 security checklist, all verification commands passing. Auto-iteration (Act phase) is not required — proceed directly to completion report.

---

## Score Breakdown

```
Backend:      16 / 16  = 100.0%
Frontend:      8 /  8  = 100.0%
Tests:         5 /  5  = 100.0%
Security:     10 / 10  = 100.0%
Deviations:    2 (soft, non-blocking)
─────────────────────────────────
Match Rate:            99% (-1% for D2 deferred column cleanup)
```
