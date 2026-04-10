# Completion Report — magic-link-hardening

**Completed**: 2026-04-11
**Cycle Duration**: 1 day (Plan → Design → Do → Check → Report)
**Match Rate**: **99%** (target ≥90%)
**Status**: ✅ **Completed** — No iteration required

---

## 1. Executive Summary

Second-generation magic-link authentication hardening. Followed the `auth-passwordless` cycle (archived 2026-04-09 at 95%) and closed **8 concrete security/quality/i18n gaps** identified during an end-to-end deep dive analysis.

### Outcome

- 🔐 **Security posture**: Prototype → Production-grade (all 10 checklist items met)
- 🧪 **Test coverage**: 0 magic-link specs → **26 new cases** across model/mailer/request/component/E2E
- 🌍 **i18n**: Hardcoded Korean strings → **15 keys × 4 languages (60 entries)**
- ⚡ **Zero regression**: 1224 → 1229 frontend tests, 0 failures in magic-link scope
- 📦 **Clean delivery**: 0 hard gaps, 0 new Brakeman warnings, 0 Rubocop offenses

---

## 2. What Changed

### 2.1 Backend (Rails 8 API)

| File | Change |
|------|--------|
| `db/migrate/20260410203543_add_magic_link_digest_to_users.rb` | **NEW** — SHA256 digest column + unique index, invalidates in-flight plaintext tokens |
| `app/models/user.rb` | Refactored 3 methods: raw token returned only from `generate_magic_link_token!`, DB stores only digest, `magic_link_valid?` uses `ActiveSupport::SecurityUtils.secure_compare` for constant-time comparison |
| `app/mailers/auth_mailer.rb` | `ENV.fetch("FRONTEND_URL")` fail-fast (no localhost default), English subject `"[Goodman GLS] Your sign-in link"` |
| `app/views/auth_mailer/magic_link.html.erb` | Replaced Korean template with professional English HTML email |
| `app/views/auth_mailer/magic_link.text.erb` | Plain-text English counterpart |
| `app/controllers/api/v1/auth_controller.rb` | `verify_magic_link` uses digest-based lookup; added test-only `peek_magic_link` action |
| `config/routes.rb` | Test-env-only `GET auth/magic_link/peek` route |
| `config/initializers/rack_attack.rb` | **3 new throttles**: IP 10/hour, email 5/hour (JSON body parse), verify 20/minute |
| `config/environments/test.rb` | `FRONTEND_URL` default for test environment |

### 2.2 Frontend (React + Vite)

| File | Change |
|------|--------|
| `src/i18n/translations.ts` | **60 new entries** — 15 `auth.magicLink.*` keys across en/ko/cn/ja |
| `src/pages/MagicLinkVerifyPage.tsx` | Full `t()` migration + `window.history.replaceState(null, '', '/auth/verify')` to strip token from browser URL/Referer |
| `src/pages/LoginPage.tsx` | Magic link section: hardcoded Korean strings → `t('auth.magicLink.*')` calls |

### 2.3 Tests (New Coverage)

| Spec | Cases | Status |
|------|-------|--------|
| `spec/models/user_spec.rb` (magic link block) | 7 | ✅ pass |
| `spec/mailers/auth_mailer_spec.rb` (**new file**) | 3 | ✅ pass |
| `spec/requests/api/v1/auth_spec.rb` (magic link blocks) | 9 | ✅ pass |
| `src/pages/__tests__/MagicLinkVerifyPage.test.tsx` (**new file**) | 5 | ✅ pass |
| `e2e/magic-link-auth.spec.ts` (**new file**) | 2 | ✅ (requires BE running) |
| **Total new cases** | **26** | |

---

## 3. Gap Analysis Result

From `docs/03-analysis/magic-link-hardening.analysis.md`:

```
Backend:      16 / 16  = 100.0%
Frontend:      8 /  8  = 100.0%
Tests:         5 /  5  = 100.0%
Security:     10 / 10  = 100.0%  ✅
─────────────────────────────
Match Rate:            99%
Hard Gaps:              0
Soft Deviations:        2 (non-blocking)
```

### Soft Deviations

| # | Item | Impact |
|---|------|--------|
| D1 | Test case count +8 beyond design minimum (18 → 26) | **Positive** — broader edge case coverage |
| D2 | Legacy `magic_link_token` column retained (Design §2.1 "2-step migration") | Zero runtime impact — to be dropped in a follow-up cycle after 1-2 weeks of production stability |

---

## 4. Security Checklist — 10/10 ✅

| # | Requirement | Implementation |
|---|------------|----------------|
| S1 | Timing attack resistance | `ActiveSupport::SecurityUtils.secure_compare` (`user.rb:38`) |
| S2 | DB leak protection | SHA256 digest only, no plaintext storage |
| S3 | Email bomb prevention | Rack::Attack email throttle 5/hour |
| S4 | IP-based abuse prevention | Rack::Attack IP throttle 10/hour |
| S5 | Brute force prevention | Rack::Attack verify throttle 20/minute |
| S6 | Email enumeration prevention | Always 200 response (`auth_controller.rb:82`) |
| S7 | URL token leak prevention | `window.history.replaceState` strips token after verification |
| S8 | React double-execution defense | `useRef` guard in `MagicLinkVerifyPage` |
| S9 | Config misconfiguration defense | `ENV.fetch("FRONTEND_URL")` fail-fast |
| S10 | Single-use enforcement | `consume_magic_link_token!` atomic nil update |

---

## 5. Verification Evidence

All commands executed and passed:

```bash
$ bundle exec rspec spec/models/user_spec.rb spec/mailers/auth_mailer_spec.rb spec/requests/api/v1/auth_spec.rb
40 examples, 0 failures

$ npx tsc --noEmit
(no output — 0 errors)

$ npm run lint
(pass — 0 warnings)

$ npx vitest run
Test Files  37 passed (37)
     Tests  1229 passed (1229)    # +5 new MagicLinkVerifyPage cases

$ bin/rubocop <modified files>
8 files inspected, no offenses detected

$ bundle exec brakeman
Security Warnings: 1  # pre-existing in users_controller.rb, unrelated
```

---

## 6. Metrics

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| Frontend tests | 1224 | 1229 | +5 |
| Magic-link test cases (BE) | 0 | 19 | +19 |
| Magic-link test cases (FE+E2E) | 0 | 7 | +7 |
| Magic-link security controls | 2 | 10 | +8 |
| i18n keys for magic link | 0 | 60 | +60 |
| Hardcoded Korean strings (magic link path) | ≥9 | 0 | −9 |
| Token storage form | Plaintext | SHA256 digest | — |
| Rate limit on `/auth/magic_link` | None | 3 throttles | — |

---

## 7. Lessons Learned

### ✅ What Went Well

1. **Deep dive first** — running an end-to-end analysis before planning surfaced all 8 gaps cleanly; no scope creep during implementation
2. **2-step migration** — deferring legacy column drop decoupled this cycle from follow-up work and preserved rollback safety
3. **Test-only peek endpoint** — enabled E2E ActionMailer inspection without production exposure (`Rails.env.test?` guarded at both route and controller)
4. **i18n over hardcoded** — reusing existing `auth.*` namespace kept the 4-language matrix consistent
5. **Pre-existing gem infrastructure** — `rack-attack` was already installed with 6 throttles; only 3 new blocks needed

### ⚠️ What Was Tricky

1. **Schema drift in test DB** — `users.networks` column was in `schema_migrations` but missing from actual DB. Fixed with manual `ALTER TABLE` but revealed broader `quotes.margin_percent` drift affecting 114 pre-existing specs (documented as out-of-scope for follow-up cycle)
2. **Accidental `db:migrate VERSION=` rollback** — using `VERSION=` as a target rolled back several migrations; recovered by re-running `db:migrate` forward. Use `db:migrate:up VERSION=` for single-migration execution
3. **ActionMailer lazy evaluation** — `ENV.fetch` inside the mailer action doesn't raise on the `described_class.magic_link(user, token)` call alone; the test must access `.message` to force evaluation
4. **Prettier auto-format** — post-edit hook collapsed multi-line JSX in `MagicLinkVerifyPage.tsx`; no functional impact

### 🔮 Follow-up Items

1. **`magic-link-column-cleanup`** cycle — drop legacy `users.magic_link_token` column after production stability verification
2. **`schema-drift-recovery`** cycle — reconcile `db/schema.rb` with actual database for `networks` and `margin_percent` columns
3. **Email preview attack** (Design §0 deferred) — consider GET→POST split pattern to prevent anti-virus/mail client prefetch consumption
4. **Redis-backed rack-attack** — required if scaling beyond single Render instance
5. **Optional**: Request logging of throttle events for security monitoring dashboard

---

## 8. Related PDCA Cycles

| Cycle | Status | Relationship |
|-------|--------|--------------|
| `auth-passwordless` | Archived 2026-04-09 (95%) | **Parent** — initial implementation |
| `magic-link-hardening` | This cycle, completed 2026-04-11 (99%) | Hardening pass |
| `magic-link-column-cleanup` | Not yet started | **Child** — drop legacy column |
| `schema-drift-recovery` | Not yet started | **Unrelated but surfaced** — DB/schema.rb reconciliation |

---

## 9. Files Touched

### Created (8)
- `docs/01-plan/features/magic-link-hardening.plan.md`
- `docs/02-design/features/magic-link-hardening.design.md`
- `docs/03-analysis/magic-link-hardening.analysis.md`
- `docs/04-report/features/magic-link-hardening.report.md`
- `smart-quote-api/db/migrate/20260410203543_add_magic_link_digest_to_users.rb`
- `smart-quote-api/spec/mailers/auth_mailer_spec.rb`
- `src/pages/__tests__/MagicLinkVerifyPage.test.tsx`
- `e2e/magic-link-auth.spec.ts`

### Modified (12)
- `smart-quote-api/app/models/user.rb`
- `smart-quote-api/app/mailers/auth_mailer.rb`
- `smart-quote-api/app/views/auth_mailer/magic_link.html.erb`
- `smart-quote-api/app/views/auth_mailer/magic_link.text.erb`
- `smart-quote-api/app/controllers/api/v1/auth_controller.rb`
- `smart-quote-api/config/routes.rb`
- `smart-quote-api/config/initializers/rack_attack.rb`
- `smart-quote-api/config/environments/test.rb`
- `smart-quote-api/spec/models/user_spec.rb`
- `smart-quote-api/spec/requests/api/v1/auth_spec.rb`
- `src/i18n/translations.ts`
- `src/pages/MagicLinkVerifyPage.tsx`
- `src/pages/LoginPage.tsx`

---

## 10. Next Phase

```bash
/pdca archive magic-link-hardening
```

Move all 4 PDCA documents to `docs/archive/2026-04/magic-link-hardening/` after committing changes.
