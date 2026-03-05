# Plan: Auth Hardening

> PDCA Phase: Plan
> Feature: auth-hardening
> Created: 2026-03-05
> Status: Draft

---

## 1. Problem Statement

### Current State

The Smart Quote system has a **broken hybrid auth architecture**:

1. **Frontend AuthContext** calls Rails API auth endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/sync_legacy_users`) that **do not exist** in the backend routes
2. **No User model** exists in the Rails backend — only a Quote model
3. **bcrypt gem is commented out** in Gemfile; no JWT gem installed
4. **No auth controller** exists on the backend
5. Login/signup silently fails (catch block logs error, returns `false`)
6. **PREDEFINED_ADMINS** array with hardcoded `'password'` credentials exists in frontend source code
7. All "authentication" runs client-side via localStorage — anyone can manipulate roles
8. Quote API endpoints have **zero authentication** — fully open to the public

### Security Risks

| Risk | Severity | Impact |
|------|----------|--------|
| Hardcoded admin credentials in client JS bundle | Critical | Anyone can view admin passwords in DevTools |
| No API authentication | Critical | Any HTTP client can CRUD quotes |
| Client-side role manipulation | High | Users can escalate to admin via localStorage |
| No password hashing | High | Plaintext passwords in localStorage |
| No session expiry | Medium | Stolen tokens work indefinitely |
| No CORS restrictions in production | Medium | Cross-origin API abuse possible |

### Affected Files

**Frontend (to modify):**
- `src/contexts/AuthContext.tsx` — Complete rewrite (remove mocks, add real JWT flow)
- `src/components/ProtectedRoute.tsx` — Add token validation
- `src/pages/LoginPage.tsx` — Error handling for real API responses
- `src/pages/SignUpPage.tsx` — Error handling for real API responses
- `src/api/quoteApi.ts` — Add Authorization header to all requests

**Backend (to create/modify):**
- `app/models/user.rb` — New: User model with has_secure_password
- `app/controllers/api/v1/auth_controller.rb` — New: login, register, me endpoints
- `app/controllers/application_controller.rb` — Add JWT authentication concern
- `config/routes.rb` — Add auth routes
- `db/migrate/XXXXXX_create_users.rb` — New: users migration
- `Gemfile` — Uncomment bcrypt, add jwt gem

---

## 2. Goal

Replace the localStorage mock authentication with production-grade Rails JWT authentication:

- **Backend**: User model with bcrypt password hashing, JWT token generation, authenticated API endpoints
- **Frontend**: Real login/signup against Rails API, JWT token management, automatic token injection on API calls
- **Security**: No hardcoded credentials, no client-side role manipulation, protected API endpoints

### Success Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| Auth API endpoints functional | login, register, me, logout | Manual + RSpec tests |
| Passwords hashed with bcrypt | 100% of stored passwords | DB inspection |
| Quote API requires authentication | 401 for unauthenticated requests | RSpec + manual test |
| No hardcoded credentials in frontend | 0 occurrences | grep verification |
| Frontend tests pass | 138 existing + new auth tests | `npx vitest run` |
| Backend tests pass | Existing + new auth specs | `bundle exec rspec` |
| Admin role enforced server-side | Admin-only endpoints return 403 for users | RSpec tests |

---

## 3. Scope

### In Scope

- Rails User model with `has_secure_password` (bcrypt)
- JWT token generation and validation (login, register, me)
- Backend authentication middleware (protect quote endpoints)
- Frontend AuthContext rewrite (remove localStorage mock, use real API)
- Authorization header injection on all API calls
- Admin role enforcement on backend (admin-only endpoints)
- Seed data migration for predefined admin accounts
- Frontend/backend test coverage for auth flows

### Out of Scope (Future Phases)

- OAuth/SSO integration (Google, Microsoft)
- Refresh token rotation
- API rate limiting
- Audit logging
- Session management UI (active sessions, force logout)
- Password reset flow (email-based)
- Multi-factor authentication (MFA)
- CORS policy hardening (separate task)

---

## 4. Technical Approach

### Backend Implementation

#### 4.1 User Model

```ruby
# db/migrate/XXXXXX_create_users.rb
create_table :users do |t|
  t.string :email, null: false, index: { unique: true }
  t.string :password_digest, null: false
  t.string :name
  t.string :company
  t.string :nationality
  t.string :role, null: false, default: 'user'  # admin | user | member
  t.timestamps
end

# app/models/user.rb
class User < ApplicationRecord
  has_secure_password
  has_many :quotes, dependent: :nullify
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, inclusion: { in: %w[admin user member] }
end
```

#### 4.2 JWT Authentication

```ruby
# Gemfile additions
gem "bcrypt", "~> 3.1.7"  # uncomment existing line
gem "jwt"

# app/controllers/concerns/jwt_authenticatable.rb
module JwtAuthenticatable
  extend ActiveSupport::Concern

  def authenticate_user!
    token = request.headers["Authorization"]&.split(" ")&.last
    decoded = JWT.decode(token, jwt_secret, true, algorithm: "HS256")
    @current_user = User.find(decoded[0]["user_id"])
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    render json: { error: "Unauthorized" }, status: :unauthorized
  end

  def current_user = @current_user
  def jwt_secret = Rails.application.credentials.secret_key_base
end
```

#### 4.3 Auth Controller

```
POST /api/v1/auth/register  → Create user, return JWT + user
POST /api/v1/auth/login     → Validate credentials, return JWT + user
GET  /api/v1/auth/me        → Return current user from JWT
```

#### 4.4 Quote Authorization

- `QuotesController` gets `before_action :authenticate_user!`
- Quotes scoped to `current_user` (users see only their quotes)
- Admin role can see all quotes (existing `/admin` behavior)

### Frontend Implementation

#### 4.5 AuthContext Rewrite

- Remove `PREDEFINED_ADMINS` array entirely
- Remove `MOCK_USERS_KEY` and `CURRENT_USER_KEY` localStorage usage
- Store only JWT token in localStorage (`smartQuoteToken`)
- Decode user info from JWT or `/auth/me` response
- Add token expiry check on app initialization

#### 4.6 API Client Updates

- Add `Authorization: Bearer <token>` header to all `quoteApi.ts` requests
- Handle 401 responses globally (redirect to login)
- Remove `sync_legacy_users` migration code

### Data Migration

#### 4.7 Seed Admin Accounts

```ruby
# db/seeds.rb
[
  { email: 'ceo@goodmangls.com', role: 'admin' },
  { email: 'ken.jeon@goodmangls.com', role: 'admin' },
  { email: 'jaehong.lim@goodmangls.com', role: 'admin' },
  { email: 'charlie@goodmangls.com', role: 'admin' },
  { email: 'ch.lee@jways.co.kr', role: 'admin' },
].each do |attrs|
  User.find_or_create_by!(email: attrs[:email]) do |u|
    u.password = ENV.fetch('ADMIN_DEFAULT_PASSWORD', 'changeme123!')
    u.role = attrs[:role]
    u.name = attrs[:email].split('@').first.tr('.', ' ').titleize
  end
end
```

---

## 5. Implementation Order

```
Phase A: Backend Auth Foundation
  1. Add bcrypt + jwt gems to Gemfile
  2. Create User model + migration
  3. Create JwtAuthenticatable concern
  4. Create AuthController (register, login, me)
  5. Add auth routes
  6. Write RSpec tests for auth endpoints
  7. Seed admin accounts

Phase B: Backend Quote Protection
  8. Add authenticate_user! to QuotesController
  9. Scope quotes to current_user (index, show, destroy)
  10. Add admin bypass for full access
  11. Add user_id foreign key to quotes table
  12. Update RSpec quote tests with auth headers

Phase C: Frontend Auth Rewrite
  13. Rewrite AuthContext (remove mocks, add JWT flow)
  14. Update quoteApi.ts with Authorization header
  15. Update LoginPage error handling
  16. Update SignUpPage error handling
  17. Remove PREDEFINED_ADMINS and sync_legacy_users code
  18. Update ProtectedRoute for token validation

Phase D: Testing & Verification
  19. Run all backend tests (bundle exec rspec)
  20. Run all frontend tests (npx vitest run)
  21. Manual E2E testing (login, signup, quote CRUD, admin access)
  22. Verify no hardcoded credentials remain
```

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing frontend tests | High | Medium | Update test mocks for new auth flow |
| Production data loss (quotes without user_id) | Medium | High | Make user_id nullable on quotes, backfill later |
| Deployed frontend hits undeployed backend auth | Medium | High | Deploy backend first, then frontend |
| JWT secret key not set in production | Low | Critical | Use Rails credentials, verify in render.yaml |
| Admin lockout (wrong seed password) | Low | High | ENV-based default password, docs for override |

---

## 7. Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| bcrypt gem (~> 3.1.7) | Ruby gem | Available (commented in Gemfile) |
| jwt gem | Ruby gem | Needs install |
| Rails credentials secret_key_base | Config | Needs verification on Render |
| PostgreSQL (Render) | Infrastructure | Already running |

---

## 8. Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| A: Backend Auth Foundation | 7 tasks | 1 day |
| B: Backend Quote Protection | 5 tasks | 0.5 day |
| C: Frontend Auth Rewrite | 6 tasks | 1 day |
| D: Testing & Verification | 4 tasks | 0.5 day |
| **Total** | **22 tasks** | **3 days** |

---

## 9. Next Step

Proceed to Design phase: `/pdca design auth-hardening`
