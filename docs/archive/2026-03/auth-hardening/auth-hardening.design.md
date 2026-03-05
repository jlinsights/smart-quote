# Design: Auth Hardening

> PDCA Phase: Design
> Feature: auth-hardening
> Created: 2026-03-05
> Plan Reference: `docs/01-plan/features/auth-hardening.plan.md`
> Status: Draft

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│                                                                  │
│  AuthContext ──► localStorage('smartQuoteToken')                  │
│       │                                                          │
│       ├── login() ──► POST /api/v1/auth/login                   │
│       ├── signup() ─► POST /api/v1/auth/register                │
│       └── init() ──► GET  /api/v1/auth/me (token validation)    │
│                                                                  │
│  quoteApi.ts ──► Authorization: Bearer <token> (all requests)   │
│  exportQuotesCsv() ──► Authorization: Bearer <token> (fix)      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                     Rails 8 API Backend                          │
│                                                                  │
│  ApplicationController                                           │
│    └── include JwtAuthenticatable                                │
│                                                                  │
│  Api::V1::AuthController         (public - no auth required)     │
│    ├── POST   /register          → create user + return JWT      │
│    ├── POST   /login             → validate creds + return JWT   │
│    └── GET    /me                → return current_user from JWT  │
│                                                                  │
│  Api::V1::QuotesController       (protected - auth required)     │
│    ├── POST   /calculate         → skip auth (stateless calc)    │
│    ├── POST   /quotes            → scoped to current_user        │
│    ├── GET    /quotes            → scoped (admin=all, user=own)  │
│    ├── GET    /quotes/:id        → scoped                        │
│    ├── DELETE /quotes/:id        → scoped                        │
│    └── GET    /quotes/export     → scoped                        │
│                                                                  │
│  User ──has_many──► Quote                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Auth Flow

```
Login:
  1. User submits email + password
  2. POST /api/v1/auth/login
  3. Backend: User.find_by(email:)&.authenticate(password)
  4. Backend: JWT.encode({ user_id:, role:, exp: 24h })
  5. Response: { token: "...", user: { id, email, role, name, company } }
  6. Frontend: localStorage.setItem('smartQuoteToken', token)
  7. Frontend: setUser(response.user)

App Init:
  1. Check localStorage for token
  2. If token exists → GET /api/v1/auth/me
  3. If valid → setUser(response.user)
  4. If 401 → clear token, redirect to /login

API Calls:
  1. quoteApi request() adds Authorization: Bearer <token>
  2. Backend JwtAuthenticatable decodes token
  3. If invalid/expired → 401 Unauthorized
  4. Frontend global 401 handler → logout + redirect
```

---

## 2. Database Schema

### 2.1 New: users table

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_digest VARCHAR(255) NOT NULL,
  name          VARCHAR(100),
  company       VARCHAR(200),
  nationality   VARCHAR(100),
  role          VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP NOT NULL,
  updated_at    TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX index_users_on_email ON users (email);
```

**Roles**: `admin` | `user` | `member`

### 2.2 Modified: quotes table (add user_id)

```sql
ALTER TABLE quotes ADD COLUMN user_id BIGINT REFERENCES users(id);
CREATE INDEX index_quotes_on_user_id ON quotes (user_id);
```

`user_id` is **nullable** to preserve existing quotes that were created before auth existed. New quotes will always have a `user_id` set from `current_user`.

---

## 3. API Contracts

### 3.1 POST /api/v1/auth/register

**Auth**: None (public)

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePass123",
  "password_confirmation": "securePass123",
  "name": "John Kim",
  "company": "ACME Trading",
  "nationality": "South Korea"
}
```

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "user",
    "name": "John Kim",
    "company": "ACME Trading",
    "nationality": "South Korea"
  }
}
```

**Response 422:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email has already been taken"
  }
}
```

### 3.2 POST /api/v1/auth/login

**Auth**: None (public)

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePass123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "user",
    "name": "John Kim",
    "company": "ACME Trading",
    "nationality": "South Korea"
  }
}
```

**Response 401:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

### 3.3 GET /api/v1/auth/me

**Auth**: Required (Bearer token)

**Response 200:**
```json
{
  "id": 1,
  "email": "john@example.com",
  "role": "user",
  "name": "John Kim",
  "company": "ACME Trading",
  "nationality": "South Korea"
}
```

**Response 401:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  }
}
```

### 3.4 Quote Endpoints (Modified Authorization)

| Endpoint | Auth | Scope |
|----------|------|-------|
| `POST /api/v1/quotes/calculate` | **Skip** (public, stateless) | N/A |
| `POST /api/v1/quotes` | Required | Sets `user_id = current_user.id` |
| `GET /api/v1/quotes` | Required | Admin: all quotes. User: own quotes only |
| `GET /api/v1/quotes/:id` | Required | Admin: any. User: own only (404 if not owned) |
| `DELETE /api/v1/quotes/:id` | Required | Admin: any. User: own only |
| `GET /api/v1/quotes/export` | Required | Admin: all. User: own only |

---

## 4. Backend Implementation Details

### 4.1 Gemfile Changes

```ruby
# Uncomment existing line:
gem "bcrypt", "~> 3.1.7"

# Add new:
gem "jwt"
```

### 4.2 User Model (`app/models/user.rb`)

```ruby
class User < ApplicationRecord
  has_secure_password

  has_many :quotes, dependent: :nullify

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role, presence: true, inclusion: { in: %w[admin user member] }
  validates :password, length: { minimum: 6 }, if: :password_required?

  before_save :downcase_email

  private

  def downcase_email
    self.email = email.downcase.strip
  end

  def password_required?
    new_record? || password.present?
  end
end
```

### 4.3 JWT Concern (`app/controllers/concerns/jwt_authenticatable.rb`)

```ruby
module JwtAuthenticatable
  extend ActiveSupport::Concern

  private

  def authenticate_user!
    @current_user = user_from_token
    render_unauthorized unless @current_user
  end

  def current_user
    @current_user
  end

  def user_from_token
    token = extract_token
    return nil unless token

    decoded = JWT.decode(token, jwt_secret, true, algorithm: "HS256")
    payload = decoded[0]
    return nil if payload["exp"] < Time.current.to_i

    User.find_by(id: payload["user_id"])
  rescue JWT::DecodeError, JWT::ExpiredSignature
    nil
  end

  def encode_token(user)
    payload = {
      user_id: user.id,
      role: user.role,
      exp: 24.hours.from_now.to_i
    }
    JWT.encode(payload, jwt_secret, "HS256")
  end

  def extract_token
    header = request.headers["Authorization"]
    header&.split(" ")&.last
  end

  def jwt_secret
    Rails.application.credentials.secret_key_base || Rails.application.secret_key_base
  end

  def render_unauthorized
    render json: {
      error: { code: "UNAUTHORIZED", message: "Unauthorized" }
    }, status: :unauthorized
  end

  def user_json(user)
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company: user.company,
      nationality: user.nationality
    }
  end
end
```

### 4.4 Auth Controller (`app/controllers/api/v1/auth_controller.rb`)

```ruby
module Api
  module V1
    class AuthController < ApplicationController
      include JwtAuthenticatable

      # POST /api/v1/auth/register
      def register
        user = User.new(register_params)

        if user.save
          token = encode_token(user)
          render json: { token: token, user: user_json(user) }, status: :created
        else
          render json: {
            error: { code: "VALIDATION_ERROR", message: user.errors.full_messages.join(", ") }
          }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/auth/login
      def login
        user = User.find_by(email: params[:email]&.downcase&.strip)

        if user&.authenticate(params[:password])
          token = encode_token(user)
          render json: { token: token, user: user_json(user) }
        else
          render json: {
            error: { code: "UNAUTHORIZED", message: "Invalid email or password" }
          }, status: :unauthorized
        end
      end

      # GET /api/v1/auth/me
      def me
        authenticate_user!
        return if performed?
        render json: user_json(current_user)
      end

      private

      def register_params
        params.permit(:email, :password, :password_confirmation,
                      :name, :company, :nationality)
      end
    end
  end
end
```

### 4.5 Routes (`config/routes.rb`)

```ruby
Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Auth (public)
      post "auth/register", to: "auth#register"
      post "auth/login",    to: "auth#login"
      get  "auth/me",       to: "auth#me"

      # Quotes (protected, except calculate)
      post "quotes/calculate", to: "quotes#calculate"
      get "quotes/export", to: "quotes#export"
      resources :quotes, only: [:index, :show, :create, :destroy]
    end
  end
end
```

### 4.6 QuotesController Changes

```ruby
module Api
  module V1
    class QuotesController < ApplicationController
      include JwtAuthenticatable

      before_action :authenticate_user!, except: [:calculate]

      # POST /api/v1/quotes (calculate + save)
      def create
        input = clean_params
        result = QuoteCalculator.call(input)

        quote = current_user.quotes.new(
          **input_attributes(input),
          **result_attributes(result),
          items: input["items"] || input[:items],
          breakdown: result[:breakdown],
          warnings: result[:warnings] || [],
          notes: params[:notes]
        )

        if quote.save
          render json: quote_detail(quote), status: :created
        else
          render json: { error: { code: "VALIDATION_ERROR", message: quote.errors.full_messages.join(", ") } },
                 status: :unprocessable_entity
        end
      end

      # GET /api/v1/quotes
      def index
        quotes = scoped_quotes
                   .search_text(params[:q])
                   .by_destination(params[:destination_country])
                   .by_date_range(params[:date_from], params[:date_to])
                   .by_status(params[:status])
                   .page(params[:page] || 1)
                   .per([(params[:per_page] || 20).to_i, 100].min)

        render json: {
          quotes: quotes.map { |q| quote_summary(q) },
          pagination: {
            currentPage: quotes.current_page,
            totalPages: quotes.total_pages,
            totalCount: quotes.total_count,
            perPage: quotes.limit_value
          }
        }
      end

      # GET /api/v1/quotes/:id
      def show
        quote = scoped_quotes.find(params[:id])
        render json: quote_detail(quote)
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # DELETE /api/v1/quotes/:id
      def destroy
        scoped_quotes.find(params[:id]).destroy
        head :no_content
      rescue ActiveRecord::RecordNotFound
        render json: { error: { code: "NOT_FOUND", message: "Quote not found" } }, status: :not_found
      end

      # GET /api/v1/quotes/export
      def export
        quotes = scoped_quotes
                   .search_text(params[:q])
                   .by_destination(params[:destination_country])
                   .by_date_range(params[:date_from], params[:date_to])
                   .by_status(params[:status])

        # ... CSV generation unchanged ...
      end

      private

      def scoped_quotes
        if current_user.role == "admin"
          Quote.recent
        else
          current_user.quotes.recent
        end
      end

      # ... existing private methods unchanged ...
    end
  end
end
```

### 4.7 Quote Model Changes

```ruby
class Quote < ApplicationRecord
  belongs_to :user, optional: true  # optional for legacy quotes without user_id

  # ... existing validations and scopes unchanged ...
end
```

### 4.8 Seed Data (`db/seeds.rb`)

```ruby
admin_password = ENV.fetch("ADMIN_DEFAULT_PASSWORD", "changeme123!")

[
  { email: "ceo@goodmangls.com", name: "CEO" },
  { email: "ken.jeon@goodmangls.com", name: "Ken Jeon" },
  { email: "jaehong.lim@goodmangls.com", name: "Jaehong Lim" },
  { email: "charlie@goodmangls.com", name: "Charlie" },
  { email: "ch.lee@jways.co.kr", name: "Charlie Lee" },
].each do |attrs|
  User.find_or_create_by!(email: attrs[:email]) do |u|
    u.password = admin_password
    u.password_confirmation = admin_password
    u.role = "admin"
    u.name = attrs[:name]
    u.company = attrs[:email].include?("jways") ? "J-Ways" : "Goodman GLS"
  end
end

puts "Seeded #{User.count} admin users."
```

### 4.9 CORS Update (`config/initializers/cors.rb`)

```ruby
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins "http://localhost:5173",
            "http://localhost:3000",
            "https://smart-quote-main.vercel.app"

    resource "*",
      headers: :any,
      expose: ["Authorization"],
      methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
```

---

## 5. Frontend Implementation Details

### 5.1 AuthContext Rewrite (`src/contexts/AuthContext.tsx`)

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'admin' | 'user' | 'member';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  company?: string;
  name?: string;
  nationality?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, company?: string, name?: string, nationality?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'smartQuoteToken';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then(userData => setUser(userData))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        return { success: true };
      }

      const body = await res.json().catch(() => ({}));
      return { success: false, error: body?.error?.message || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    company?: string,
    name?: string,
    nationality?: string
  ) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password, password_confirmation: password,
          company, name, nationality,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
        return { success: true };
      }

      const body = await res.json().catch(() => ({}));
      return { success: false, error: body?.error?.message || 'Registration failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{
      user, login, signup, logout,
      isAuthenticated: !!user,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

**Key changes:**
- Remove `PREDEFINED_ADMINS`, `MOCK_USERS_KEY`, `CURRENT_USER_KEY`
- Remove `sync_legacy_users` migration code
- Add `isLoading` state for app init
- `login()`/`signup()` return `{ success, error }` instead of `boolean`
- Token-only localStorage (`smartQuoteToken`)
- `/auth/me` validation on mount

### 5.2 LoginPage Changes

```diff
- const success = await login(email.trim(), password.trim());
- if (success) {
-   const storedUserStr = localStorage.getItem('smartQuoteCurrentUser');
-   const userRole = storedUserStr ? JSON.parse(storedUserStr).role : 'user';
+ const result = await login(email.trim(), password.trim());
+ if (result.success) {
+   const userRole = user?.role || 'user';
    const defaultDest = userRole === 'admin' ? '/admin' : '/dashboard';
    // ... navigate logic unchanged
  } else {
-   setError(t('auth.invalidCredentials'));
+   setError(result.error || t('auth.invalidCredentials'));
  }
```

### 5.3 SignUpPage Changes

```diff
- const success = await signup(email.trim(), password.trim(), company.trim(), name.trim(), nationality.trim());
- if (success) {
+ const result = await signup(email.trim(), password.trim(), company.trim(), name.trim(), nationality.trim());
+ if (result.success) {
    navigate('/dashboard', { replace: true });
  } else {
-   setError(t('auth.emailExists'));
+   setError(result.error || t('auth.emailExists'));
  }
```

### 5.4 quoteApi.ts — exportQuotesCsv Fix

```diff
  const qs = searchParams.toString();
+ const token = localStorage.getItem('smartQuoteToken');
+ const headers: HeadersInit = { Accept: 'text/csv' };
+ if (token) headers['Authorization'] = `Bearer ${token}`;
+
  const response = await fetch(
    `${API_URL}/api/v1/quotes/export${qs ? `?${qs}` : ''}`,
-   { headers: { Accept: 'text/csv' } }
+   { headers }
  );
```

### 5.5 Global 401 Handler

Add to `quoteApi.ts` `request()` function:

```diff
  if (!response.ok) {
+   if (response.status === 401) {
+     localStorage.removeItem('smartQuoteToken');
+     window.location.href = '/login';
+     throw new QuoteApiError(401, 'Session expired');
+   }
    const body = await response.json().catch(() => ({}));
```

---

## 6. Migration Strategy

### 6.1 Migrations (ordered)

```
1. CreateUsers          — users table
2. AddUserIdToQuotes    — quotes.user_id (nullable, FK)
```

### 6.2 Deployment Order

```
1. Deploy backend with new migrations (bin/rails db:migrate)
2. Run seeds (bin/rails db:seed) — creates admin accounts
3. Verify backend auth endpoints (curl test)
4. Deploy frontend with new AuthContext
5. Verify E2E login/signup flow
```

**Rollback plan**: Backend is backwards-compatible since:
- `user_id` on quotes is nullable
- `calculate` endpoint stays public
- Old frontend without auth still works until step 4

### 6.3 Legacy Data

Existing quotes in production will have `user_id = NULL`. These will be visible to admin users only. No data migration needed initially.

---

## 7. Test Specifications

### 7.1 Backend RSpec Tests

**`spec/requests/api/v1/auth_spec.rb`**

| Test | Method | Expected |
|------|--------|----------|
| Register with valid params | POST /register | 201 + token + user |
| Register with duplicate email | POST /register | 422 + error message |
| Register with short password | POST /register | 422 + error message |
| Register without required fields | POST /register | 422 + error message |
| Login with valid credentials | POST /login | 200 + token + user |
| Login with wrong password | POST /login | 401 + error |
| Login with nonexistent email | POST /login | 401 + error |
| Get me with valid token | GET /me | 200 + user |
| Get me with expired token | GET /me | 401 |
| Get me without token | GET /me | 401 |

**`spec/requests/api/v1/quotes_spec.rb` (updated)**

| Test | Method | Expected |
|------|--------|----------|
| Calculate without auth (public) | POST /calculate | 200 + result |
| Create quote with auth | POST /quotes | 201 + quote with user_id |
| Create quote without auth | POST /quotes | 401 |
| List quotes as user (own only) | GET /quotes | 200 + own quotes |
| List quotes as admin (all) | GET /quotes | 200 + all quotes |
| Show own quote | GET /quotes/:id | 200 |
| Show other user's quote | GET /quotes/:id | 404 |
| Show any quote as admin | GET /quotes/:id | 200 |
| Delete own quote | DELETE /quotes/:id | 204 |
| Delete other user's quote | DELETE /quotes/:id | 404 |
| Export as user (own only) | GET /export | 200 + CSV of own |
| Export as admin (all) | GET /export | 200 + CSV of all |

**`spec/models/user_spec.rb`**

| Test | Expected |
|------|----------|
| Valid user creation | saves with hashed password |
| Email uniqueness (case-insensitive) | rejects duplicate |
| Email format validation | rejects invalid format |
| Role inclusion validation | rejects invalid roles |
| Password minimum length | rejects < 6 chars |
| has_many :quotes association | returns user's quotes |

### 7.2 Frontend Test Updates

**`src/contexts/__tests__/AuthContext.test.tsx`** (new)

| Test | Expected |
|------|----------|
| Renders children when loaded | Provider renders |
| Login success → sets user | user state updated |
| Login failure → returns error | error message returned |
| Signup success → sets user | user state updated |
| Logout → clears state and token | user null, token removed |
| Init with valid token → restores user | GET /me called, user set |
| Init with expired token → clears | token removed, user null |

**Existing test modifications:**
- All component tests that use `useAuth()` need mock provider updated
- Remove any references to `PREDEFINED_ADMINS` or `smartQuoteCurrentUser`
- `SaveQuoteButton.test.tsx` — mock needs auth token

---

## 8. File Inventory

### New Files (Backend)

| File | Purpose |
|------|---------|
| `app/models/user.rb` | User model with has_secure_password |
| `app/controllers/concerns/jwt_authenticatable.rb` | JWT encode/decode concern |
| `app/controllers/api/v1/auth_controller.rb` | Register, login, me endpoints |
| `db/migrate/XXXXXX_create_users.rb` | Users table migration |
| `db/migrate/XXXXXX_add_user_id_to_quotes.rb` | Add user_id FK to quotes |
| `spec/requests/api/v1/auth_spec.rb` | Auth endpoint tests |
| `spec/models/user_spec.rb` | User model tests |
| `spec/factories/users.rb` | User factory for tests |

### Modified Files (Backend)

| File | Change |
|------|--------|
| `Gemfile` | Uncomment bcrypt, add jwt |
| `config/routes.rb` | Add auth routes |
| `app/controllers/api/v1/quotes_controller.rb` | Add auth + scoping |
| `app/models/quote.rb` | Add `belongs_to :user, optional: true` |
| `config/initializers/cors.rb` | Add Vercel production origin |
| `db/seeds.rb` | Add admin user seeds |
| `spec/requests/api/v1/quotes_spec.rb` | Update with auth headers |

### Modified Files (Frontend)

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Complete rewrite (remove mocks) |
| `src/pages/LoginPage.tsx` | Use `{ success, error }` return type |
| `src/pages/SignUpPage.tsx` | Use `{ success, error }` return type |
| `src/api/quoteApi.ts` | Fix exportQuotesCsv auth, add 401 handler |

### Deleted Code

| Location | What | Why |
|----------|------|-----|
| `AuthContext.tsx:29-35` | `PREDEFINED_ADMINS` array | Hardcoded credentials |
| `AuthContext.tsx:37-38` | `MOCK_USERS_KEY`, `CURRENT_USER_KEY` | localStorage mock |
| `AuthContext.tsx:46-63` | Admin initialization + localStorage mock | Replaced by real auth |
| `AuthContext.tsx:66-80` | `sync_legacy_users` migration | No longer needed |
| `LoginPage.tsx:37-38` | `smartQuoteCurrentUser` localStorage read | User comes from auth response |

---

## 9. Implementation Order (Detailed)

```
Phase A: Backend Auth Foundation           [Day 1 morning]
  A1. Uncomment bcrypt, add jwt to Gemfile + bundle install
  A2. Create users migration (rails g migration CreateUsers)
  A3. Create User model with validations
  A4. Create JwtAuthenticatable concern
  A5. Create AuthController (register, login, me)
  A6. Add auth routes to config/routes.rb
  A7. Create user factory + auth RSpec tests
  A8. Create db/seeds.rb with admin accounts
  A9. Run: bundle exec rspec (verify auth tests pass)

Phase B: Backend Quote Protection          [Day 1 afternoon]
  B1. Create add_user_id_to_quotes migration
  B2. Add belongs_to :user to Quote model
  B3. Add JwtAuthenticatable + before_action to QuotesController
  B4. Add scoped_quotes private method (admin=all, user=own)
  B5. Modify create to use current_user.quotes.new
  B6. Update CORS to include Vercel production URL
  B7. Update existing quote RSpec tests with auth headers
  B8. Run: bundle exec rspec (verify all tests pass)

Phase C: Frontend Auth Rewrite             [Day 2]
  C1. Rewrite AuthContext.tsx (remove all mocks, add JWT flow)
  C2. Update LoginPage.tsx (new return type, remove localStorage read)
  C3. Update SignUpPage.tsx (new return type)
  C4. Fix quoteApi.ts exportQuotesCsv (add auth header)
  C5. Add global 401 handler to quoteApi.ts request()
  C6. Update frontend test mocks for new AuthContext interface
  C7. Run: npx vitest run (verify all 138+ tests pass)

Phase D: Verification                      [Day 3 morning]
  D1. Run full backend suite: bundle exec rspec
  D2. Run full frontend suite: npx vitest run
  D3. Manual E2E: register → login → create quote → view history → logout
  D4. Verify: grep -r "PREDEFINED_ADMINS\|smartQuoteCurrentUser\|smartQuoteMockUsers" src/
  D5. Verify: calculate endpoint still works without auth
```

---

## 10. Next Step

Proceed to Do phase: `/pdca do auth-hardening`
