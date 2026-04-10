# Design — magic-link-hardening

**Created**: 2026-04-10
**Status**: Design
**Parent plan**: `docs/01-plan/features/magic-link-hardening.plan.md`

---

## 0. Open Questions 확정

| # | 질문 | 결정 | 근거 |
|---|------|-----|-----|
| 1 | 영어화 vs i18n 키 | **i18n 키 추가** | `src/i18n/translations.ts`에 이미 `auth.*` 네임스페이스(30+ 키) 존재. 4개 언어(en/ko/cn/ja) 일관성 유지 |
| 2 | rack-attack 저장소 | **Memory store 유지** | `production.rb:47` `:memory_store` 확인. Render Hobby 단일 인스턴스 |
| 3 | 마이그레이션 롤백 전략 | **2-step 분리** | Step A (digest 컬럼 추가 + 기존 토큰 무효화) → Step B (이후 사이클에서 구 컬럼 drop). 본 사이클은 Step A만 |
| 4 | E2E 이메일 mock | **Test-only endpoint** | `GET /api/v1/auth/magic_link/peek` (Rails.env.test? 가드). `ActionMailer::Base.deliveries`에서 마지막 발급 토큰 추출 |

---

## 1. Architecture Changes

```
┌──────────────────────────────────────────────────────────────┐
│                      Before (auth-passwordless)              │
├──────────────────────────────────────────────────────────────┤
│ users.magic_link_token       (평문, string, unique idx)      │
│ users.magic_link_token_expires_at (datetime)                 │
│ == 비교 (타이밍 공격 가능)                                   │
│ Rate limit 없음                                              │
│ 한국어 이메일/UI                                             │
└──────────────────────────────────────────────────────────────┘
                             ⇓
┌──────────────────────────────────────────────────────────────┐
│                       After (hardening)                     │
├──────────────────────────────────────────────────────────────┤
│ users.magic_link_token_digest  (SHA256 hex, 64 char)         │
│ users.magic_link_token_expires_at  (unchanged)               │
│ ActiveSupport::SecurityUtils.secure_compare                  │
│ rack-attack throttle: magic_link request 5/h per email       │
│ rack-attack throttle: magic_link request 10/h per IP         │
│ 영어 이메일/UI (i18n key로)                                  │
│ 검증 후 history.replaceState(토큰 제거)                      │
│ FRONTEND_URL fail-fast                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Design

### 2.1 Migration — `db/migrate/{TS}_add_magic_link_digest_to_users.rb`

```ruby
class AddMagicLinkDigestToUsers < ActiveRecord::Migration[8.0]
  def change
    # Invalidate all existing in-flight tokens (15min TTL → 사실상 무영향)
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE users
          SET magic_link_token = NULL,
              magic_link_token_expires_at = NULL
          WHERE magic_link_token IS NOT NULL
        SQL
      end
    end

    add_column :users, :magic_link_token_digest, :string
    add_index  :users, :magic_link_token_digest, unique: true
  end
end
```

**주의**:
- 기존 `magic_link_token` 컬럼은 본 사이클에서 **유지** (2-step 마이그레이션)
- 모델 코드는 digest만 사용하지만, 구 컬럼은 다음 사이클에서 drop
- 이유: 롤백 시 기존 동작 복원 가능, 배포 중 zero-downtime

### 2.2 Model — `app/models/user.rb`

**변경 대상**: `generate_magic_link_token!`, `magic_link_valid?`, `consume_magic_link_token!`

```ruby
# 추가 상수
MAGIC_LINK_TTL = 15.minutes

def generate_magic_link_token!
  raw = SecureRandom.urlsafe_base64(32)
  self.magic_link_token_digest = Digest::SHA256.hexdigest(raw)
  self.magic_link_token_expires_at = MAGIC_LINK_TTL.from_now
  # 구 컬럼은 유지 기간 동안 nil 보장
  self.magic_link_token = nil
  save!
  raw  # 평문은 오직 이 한 번만 반환 (이메일 URL 생성용)
end

def magic_link_valid?(token)
  return false if magic_link_token_digest.blank?
  return false if magic_link_token_expires_at.blank?
  return false if magic_link_token_expires_at <= Time.current

  expected = magic_link_token_digest
  actual   = Digest::SHA256.hexdigest(token.to_s)
  ActiveSupport::SecurityUtils.secure_compare(expected, actual)
end

def consume_magic_link_token!
  update!(
    magic_link_token_digest: nil,
    magic_link_token: nil,
    magic_link_token_expires_at: nil,
  )
end
```

**불변 규칙**:
- `generate_magic_link_token!`의 반환값 `raw`는 **절대** DB에 저장하지 않음
- `magic_link_valid?`는 항상 상수시간 비교 (early return은 존재 여부만)
- `consume_magic_link_token!`는 `update!`로 원자적 무효화

### 2.3 Controller — `app/controllers/api/v1/auth_controller.rb`

**변경 대상**: `request_magic_link`, `verify_magic_link`

```ruby
# POST /api/v1/auth/magic_link
def request_magic_link
  user = User.find_by(email: params[:email]&.downcase&.strip)

  if user
    raw_token = user.generate_magic_link_token!
    AuthMailer.magic_link(user, raw_token).deliver_later
  end

  # Email enumeration 방지: 항상 200
  render json: { message: "If that email exists, a login link has been sent." }
end

# GET /api/v1/auth/magic_link/verify?token=...
def verify_magic_link
  token = params[:token].to_s
  digest = Digest::SHA256.hexdigest(token)
  user = User.find_by(magic_link_token_digest: digest)

  unless user&.magic_link_valid?(token)
    return render json: {
      error: { code: "INVALID_TOKEN", message: "Invalid or expired magic link" }
    }, status: :unauthorized
  end

  user.consume_magic_link_token!
  render json: {
    token: encode_token(user),
    refresh_token: encode_refresh_token(user),
    user: user_json(user),
  }
end
```

**주의**:
- `find_by(magic_link_token_digest: digest)`는 unique index hit → O(1)
- 조회 실패해도 `magic_link_valid?`는 동일한 오류 응답 (타이밍 균일성)

### 2.4 Rack::Attack — `config/initializers/rack_attack.rb`

**추가 블록** (기존 throttle 유지):

```ruby
# Throttle magic link request by IP: 10 per hour
throttle("auth/magic_link/ip", limit: 10, period: 1.hour) do |req|
  req.ip if req.path == "/api/v1/auth/magic_link" && req.post?
end

# Throttle magic link request by email: 5 per hour
# (이메일 폭탄 방지 — 동일 이메일 과다 발송 차단)
throttle("auth/magic_link/email", limit: 5, period: 1.hour) do |req|
  if req.path == "/api/v1/auth/magic_link" && req.post?
    body = req.body.read
    req.body.rewind
    JSON.parse(body)["email"]&.to_s&.downcase&.strip
  rescue JSON::ParserError
    nil
  end
end

# Throttle verify endpoint: 20 per minute per IP (brute force 방지)
throttle("auth/magic_link/verify", limit: 20, period: 60) do |req|
  req.ip if req.path == "/api/v1/auth/magic_link/verify" && req.get?
end
```

### 2.5 Mailer — `app/mailers/auth_mailer.rb`

```ruby
class AuthMailer < ApplicationMailer
  def magic_link(user, token)
    @user = user
    frontend_url = ENV.fetch("FRONTEND_URL")  # fail-fast
    @magic_link_url = "#{frontend_url}/auth/verify?token=#{token}"
    @expires_in_minutes = 15
    mail(to: user.email, subject: "[Goodman GLS] Your sign-in link")
  end
end
```

**주의**:
- `ENV.fetch("FRONTEND_URL")`는 미설정 시 `KeyError` 발생 → 프로덕션 배포 시 즉시 감지
- 테스트 환경은 `config/environments/test.rb`에 `ENV["FRONTEND_URL"] ||= "http://localhost:5173"` 추가

### 2.6 Mailer Views (신규)

**`app/views/auth_mailer/magic_link.html.erb`**:
```erb
<h1>Sign in to Smart Quote</h1>
<p>Hi<%= " #{@user.name}" if @user.name.present? %>,</p>
<p>Click the link below to sign in. This link will expire in <%= @expires_in_minutes %> minutes.</p>
<p><a href="<%= @magic_link_url %>" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Sign in</a></p>
<p>If you did not request this email, you can safely ignore it.</p>
<hr />
<p style="font-size:12px;color:#666;">Goodman GLS · Smart Quote</p>
```

**`app/views/auth_mailer/magic_link.text.erb`**:
```erb
Sign in to Smart Quote

Hi<%= " #{@user.name}" if @user.name.present? %>,

Click the link below to sign in. This link will expire in <%= @expires_in_minutes %> minutes.

<%= @magic_link_url %>

If you did not request this email, you can safely ignore it.

—
Goodman GLS · Smart Quote
```

### 2.7 Test-only Endpoint — `config/routes.rb`

```ruby
# E2E 테스트 전용: 마지막 발급된 raw 토큰 peek
if Rails.env.test?
  get "auth/magic_link/peek", to: "auth#peek_magic_link"
end
```

**AuthController#peek_magic_link** (테스트 환경만):
```ruby
def peek_magic_link
  last = ActionMailer::Base.deliveries.last
  return render json: { token: nil } unless last

  match = last.body.encoded.match(/\?token=([^\s"'<&]+)/)
  render json: { token: match&.[](1) }
end
```

---

## 3. Frontend Design

### 3.1 i18n Keys — `src/i18n/translations.ts`

**en**:
```ts
'auth.magicLink.title': 'Sign in with magic link',
'auth.magicLink.description': "We'll email you a secure sign-in link.",
'auth.magicLink.emailLabel': 'Email address',
'auth.magicLink.sending': 'Sending...',
'auth.magicLink.send': 'Email me a sign-in link',
'auth.magicLink.sent': 'Check your email',
'auth.magicLink.sentBody': "If that email exists in our system, we've sent a sign-in link. The link expires in 15 minutes.",
'auth.magicLink.verifying': 'Signing you in...',
'auth.magicLink.invalidLink': 'Invalid link.',
'auth.magicLink.expired': 'This link has expired or has already been used.',
'auth.magicLink.failed': 'Login Failed',
'auth.magicLink.backToLogin': 'Back to Login',
'auth.magicLink.emailRequired': 'Email is required.',
'auth.magicLink.requestFailed': 'Failed to send sign-in link. Please try again.',
```

**ko** (4개 언어 모두 대응):
```ts
'auth.magicLink.title': '매직링크로 로그인',
'auth.magicLink.description': '보안 로그인 링크를 이메일로 보내드립니다.',
'auth.magicLink.emailLabel': '이메일 주소',
'auth.magicLink.sending': '전송 중...',
'auth.magicLink.send': '로그인 링크 이메일로 받기',
'auth.magicLink.sent': '이메일을 확인해주세요',
'auth.magicLink.sentBody': '해당 이메일이 등록되어 있다면 로그인 링크를 보내드렸습니다. 링크는 15분 후 만료됩니다.',
'auth.magicLink.verifying': '로그인 중...',
'auth.magicLink.invalidLink': '유효하지 않은 링크입니다.',
'auth.magicLink.expired': '링크가 만료되었거나 이미 사용되었습니다.',
'auth.magicLink.failed': '로그인 실패',
'auth.magicLink.backToLogin': '로그인으로 돌아가기',
'auth.magicLink.emailRequired': '이메일을 입력해주세요.',
'auth.magicLink.requestFailed': '로그인 링크 전송에 실패했습니다. 다시 시도해주세요.',
```

**cn/ja**: 동일한 15개 키 추가 (간단 번역)

### 3.2 MagicLinkVerifyPage — `src/pages/MagicLinkVerifyPage.tsx`

**변경 요약**:
1. 하드코딩 영어 → `t()` 호출로 전환
2. 검증 성공 시 `window.history.replaceState`로 URL의 `?token=...` 제거
3. useRef 가드 + queueMicrotask는 **유지**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MagicLinkVerifyPage() {
  const [searchParams] = useSearchParams();
  const { loginWithMagicLink } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      queueMicrotask(() => setError(t('auth.magicLink.invalidLink')));
      return;
    }

    loginWithMagicLink(token).then((result) => {
      // URL 토큰 제거 (브라우저 히스토리/Referer 오염 방지)
      window.history.replaceState(null, '', '/auth/verify');

      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error ?? t('auth.magicLink.expired'));
      }
    });
  }, [searchParams, loginWithMagicLink, navigate, t]);

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4'>
        <div className='text-center max-w-md'>
          {/* (기존 error icon 유지) */}
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-2'>
            {t('auth.magicLink.failed')}
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-6'>{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className='...'
          >
            {t('auth.magicLink.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-white dark:bg-gray-950'>
      <div className='text-center'>
        <div className='... animate-spin ...' />
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          {t('auth.magicLink.verifying')}
        </p>
      </div>
    </div>
  );
}
```

### 3.3 LoginPage — `src/pages/LoginPage.tsx`

**변경 요약**: 하드코딩 한국어 → i18n 키 전환 (magicLink 섹션만)

| 라인 | 기존 | 변경 |
|-----|------|------|
| 227 | `'전송 중...' : '로그인 링크 이메일로 받기'` | `t('auth.magicLink.sending') : t('auth.magicLink.send')` |
| (기타) | 한국어 하드코딩 magicLink 관련 라벨/에러 | 전부 `t('auth.magicLink.*')` 로 전환 |

**상세 치환 범위**: grep으로 발견된 `magicSent`, `magicEmail`, `magicError`, `magicLoading` 사용 블록 내의 모든 한국어 문자열.

### 3.4 authApi.ts

**변경 없음** (이미 적절한 에러 처리).

### 3.5 AuthContext.tsx

**변경 없음** (이미 적절한 시그니처).

---

## 4. Test Design

### 4.1 Backend — `spec/models/user_spec.rb` (신규 블록 추가)

```ruby
describe "magic link methods" do
  let(:user) { create(:user) }

  describe "#generate_magic_link_token!" do
    it "returns a raw token and stores only the digest" do
      raw = user.generate_magic_link_token!
      expect(raw).to be_present
      expect(raw.length).to be >= 43  # urlsafe_base64(32)
      user.reload
      expect(user.magic_link_token_digest).to eq(Digest::SHA256.hexdigest(raw))
      expect(user.magic_link_token_digest).not_to eq(raw)
      expect(user.magic_link_token).to be_nil
      expect(user.magic_link_token_expires_at).to be_within(1.second).of(15.minutes.from_now)
    end

    it "generates a new token on each call" do
      r1 = user.generate_magic_link_token!
      r2 = user.generate_magic_link_token!
      expect(r1).not_to eq(r2)
    end
  end

  describe "#magic_link_valid?" do
    it "returns true for the correct raw token" do
      raw = user.generate_magic_link_token!
      expect(user.magic_link_valid?(raw)).to be true
    end

    it "returns false for an incorrect token" do
      user.generate_magic_link_token!
      expect(user.magic_link_valid?("wrong-token")).to be false
    end

    it "returns false for an expired token" do
      raw = user.generate_magic_link_token!
      user.update!(magic_link_token_expires_at: 1.minute.ago)
      expect(user.magic_link_valid?(raw)).to be false
    end

    it "returns false when digest is nil" do
      expect(user.magic_link_valid?("anything")).to be false
    end
  end

  describe "#consume_magic_link_token!" do
    it "nils out the digest and expiry" do
      user.generate_magic_link_token!
      user.consume_magic_link_token!
      user.reload
      expect(user.magic_link_token_digest).to be_nil
      expect(user.magic_link_token_expires_at).to be_nil
    end
  end
end
```

### 4.2 Backend — `spec/requests/api/v1/auth_spec.rb` (신규 블록)

```ruby
describe "POST /api/v1/auth/magic_link" do
  let(:user) { create(:user, email: "test@example.com") }

  it "returns 200 for existing user and enqueues email" do
    expect {
      post "/api/v1/auth/magic_link", params: { email: user.email }
    }.to have_enqueued_mail(AuthMailer, :magic_link)
    expect(response).to have_http_status(:ok)
  end

  it "returns 200 for non-existing user (enumeration prevention)" do
    expect {
      post "/api/v1/auth/magic_link", params: { email: "nobody@example.com" }
    }.not_to have_enqueued_mail
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["message"]).to include("login link")
  end
end

describe "GET /api/v1/auth/magic_link/verify" do
  let(:user) { create(:user) }

  it "returns JWT for a valid token" do
    raw = user.generate_magic_link_token!
    get "/api/v1/auth/magic_link/verify", params: { token: raw }
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["token"]).to be_present
    expect(body["refresh_token"]).to be_present
    expect(body["user"]["email"]).to eq(user.email)
  end

  it "consumes the token after successful verification" do
    raw = user.generate_magic_link_token!
    get "/api/v1/auth/magic_link/verify", params: { token: raw }
    expect(user.reload.magic_link_token_digest).to be_nil
  end

  it "returns 401 for an already-consumed token" do
    raw = user.generate_magic_link_token!
    get "/api/v1/auth/magic_link/verify", params: { token: raw }
    get "/api/v1/auth/magic_link/verify", params: { token: raw }
    expect(response).to have_http_status(:unauthorized)
  end

  it "returns 401 for an expired token" do
    raw = user.generate_magic_link_token!
    user.update!(magic_link_token_expires_at: 1.minute.ago)
    get "/api/v1/auth/magic_link/verify", params: { token: raw }
    expect(response).to have_http_status(:unauthorized)
  end

  it "returns 401 for an invalid token" do
    get "/api/v1/auth/magic_link/verify", params: { token: "bogus" }
    expect(response).to have_http_status(:unauthorized)
  end
end
```

### 4.3 Backend — `spec/mailers/auth_mailer_spec.rb` (신규)

```ruby
require "rails_helper"

RSpec.describe AuthMailer do
  describe "#magic_link" do
    let(:user) { create(:user, email: "test@example.com") }
    let(:token) { "raw-sample-token" }

    before { ENV["FRONTEND_URL"] = "https://smart-quote.test" }

    it "sends to the user's email with English subject" do
      mail = described_class.magic_link(user, token)
      expect(mail.to).to eq([user.email])
      expect(mail.subject).to eq("[Goodman GLS] Your sign-in link")
    end

    it "includes the magic link URL with the raw token" do
      mail = described_class.magic_link(user, token)
      expect(mail.body.encoded).to include("https://smart-quote.test/auth/verify?token=#{token}")
    end

    it "raises when FRONTEND_URL is unset" do
      ENV.delete("FRONTEND_URL")
      expect { described_class.magic_link(user, token) }.to raise_error(KeyError)
    end
  end
end
```

### 4.4 Frontend — `src/pages/__tests__/MagicLinkVerifyPage.test.tsx` (신규)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MagicLinkVerifyPage from '../MagicLinkVerifyPage';

// AuthContext / LanguageContext mocks
const loginWithMagicLink = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ loginWithMagicLink }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,  // keys 그대로 반환
  }),
}));

describe('MagicLinkVerifyPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Invalid link error when token is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/verify']}>
        <Routes>
          <Route path='/auth/verify' element={<MagicLinkVerifyPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('auth.magicLink.invalidLink')).toBeInTheDocument();
    });
    expect(loginWithMagicLink).not.toHaveBeenCalled();
  });

  it('calls loginWithMagicLink exactly once even in StrictMode double-invoke', async () => {
    loginWithMagicLink.mockResolvedValue({ success: true });
    render(
      <MemoryRouter initialEntries={['/auth/verify?token=abc']}>
        <Routes>
          <Route path='/auth/verify' element={<MagicLinkVerifyPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(loginWithMagicLink).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message when verification fails', async () => {
    loginWithMagicLink.mockResolvedValue({
      success: false,
      error: 'Custom error',
    });
    render(
      <MemoryRouter initialEntries={['/auth/verify?token=abc']}>
        <Routes>
          <Route path='/auth/verify' element={<MagicLinkVerifyPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Custom error')).toBeInTheDocument();
      expect(screen.getByText('auth.magicLink.failed')).toBeInTheDocument();
    });
  });

  it('removes token from URL after verification', async () => {
    loginWithMagicLink.mockResolvedValue({ success: true });
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    render(
      <MemoryRouter initialEntries={['/auth/verify?token=abc']}>
        <Routes>
          <Route path='/auth/verify' element={<MagicLinkVerifyPage />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/auth/verify');
    });
  });
});
```

### 4.5 E2E — `e2e/magic-link-auth.spec.ts` (신규)

```ts
import { test, expect, request } from '@playwright/test';

const API_URL = process.env.VITE_API_URL ?? 'http://localhost:3000';
const TEST_EMAIL = 'e2e-magic@example.com';

test.describe('magic link auth', () => {
  test('request → verify → dashboard', async ({ page, playwright }) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });

    // 1. Request magic link
    const reqRes = await api.post('/api/v1/auth/magic_link', {
      data: { email: TEST_EMAIL },
    });
    expect(reqRes.status()).toBe(200);

    // 2. Peek last raw token (Rails.env.test? 전용 endpoint)
    const peek = await api.get('/api/v1/auth/magic_link/peek');
    const { token } = await peek.json();
    expect(token).toBeTruthy();

    // 3. Navigate to verify URL
    await page.goto(`/auth/verify?token=${token}`);

    // 4. Expect redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('invalid token shows error', async ({ page }) => {
    await page.goto('/auth/verify?token=bogus');
    await expect(page.getByText(/Invalid|expired/i)).toBeVisible();
  });
});
```

---

## 5. Implementation Order

| # | 파일 | 타입 | 의존성 |
|---|------|-----|-------|
| 1 | `db/migrate/{TS}_add_magic_link_digest_to_users.rb` | 신규 | - |
| 2 | `bin/rails db:migrate` | 실행 | 1 |
| 3 | `app/models/user.rb` | 수정 | 2 |
| 4 | `app/mailers/auth_mailer.rb` | 수정 | 3 |
| 5 | `app/views/auth_mailer/magic_link.html.erb` | 신규 | 4 |
| 6 | `app/views/auth_mailer/magic_link.text.erb` | 신규 | 4 |
| 7 | `config/environments/test.rb` | 수정 (FRONTEND_URL default) | 4 |
| 8 | `app/controllers/api/v1/auth_controller.rb` | 수정 | 3 |
| 9 | `config/routes.rb` | 수정 (test peek endpoint) | 8 |
| 10 | `config/initializers/rack_attack.rb` | 수정 | - |
| 11 | `spec/models/user_spec.rb` | 수정 | 3 |
| 12 | `spec/mailers/auth_mailer_spec.rb` | 신규 | 5,6 |
| 13 | `spec/requests/api/v1/auth_spec.rb` | 수정 | 8 |
| 14 | `bundle exec rspec` | 실행 | 11,12,13 |
| 15 | `src/i18n/translations.ts` | 수정 (15 keys × 4 langs) | - |
| 16 | `src/pages/MagicLinkVerifyPage.tsx` | 수정 | 15 |
| 17 | `src/pages/LoginPage.tsx` | 수정 | 15 |
| 18 | `src/pages/__tests__/MagicLinkVerifyPage.test.tsx` | 신규 | 16 |
| 19 | `e2e/magic-link-auth.spec.ts` | 신규 | 9,16 |
| 20 | `npx vitest run` | 실행 | 18 |
| 21 | `npx tsc --noEmit` | 실행 | 16,17 |
| 22 | `npm run lint` | 실행 | 16,17 |
| 23 | `bin/rubocop` | 실행 | 3,4,8,10 |
| 24 | `bin/brakeman` | 실행 | 3,4,8 |

---

## 6. Rollback Plan

- **Migration rollback**: `bin/rails db:rollback` (구 `magic_link_token` 컬럼 보존 덕분에 기존 코드로 즉시 복원 가능 — 단, 본 사이클 이후 다음 사이클에서 구 컬럼 drop 전까지)
- **Code rollback**: git revert (모든 변경이 additive하거나 in-place, 공유 상태 없음)
- **Rate limit 오차단 시**: `rack_attack.rb`에서 해당 throttle 블록 주석 처리 + 재배포

---

## 7. Security Considerations

| 항목 | 보장 |
|------|-----|
| 타이밍 공격 | `secure_compare` 적용 ✅ |
| DB 유출 | SHA256 digest만 저장, preimage 복원 불가 ✅ |
| 이메일 폭탄 | rack-attack email 5/h ✅ |
| IP 기반 공격 | rack-attack IP 10/h ✅ |
| Brute force verify | rack-attack verify 20/min ✅ |
| Email enumeration | 200 동일 응답 ✅ |
| URL 토큰 잔존 | `history.replaceState` ✅ |
| 이중 execution | useRef guard ✅ |
| FRONTEND_URL 오설정 | `ENV.fetch` fail-fast ✅ |
| Single-use | `consume_magic_link_token!` ✅ |

---

## 8. Next Phase

`/pdca do magic-link-hardening` — 위 Implementation Order 1-24번을 순차 실행
