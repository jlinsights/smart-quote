# Design: auth-passwordless (Magic Link 인증)

> Phase: Design | Feature: auth-passwordless  
> Plan 참조: `docs/01-plan/features/auth-passwordless.plan.md`

---

## 1. 개요

기존 이메일+비밀번호 로그인을 유지하면서, Magic Link (이메일 원클릭 로그인)를 추가한다.  
사용자가 이메일을 입력하면 1회용 보안 링크를 발송하고, 링크 클릭 시 JWT를 발급해 자동 로그인된다.

---

## 2. DB 스키마 변경

### 마이그레이션 파일
`smart-quote-api/db/migrate/YYYYMMDDHHMMSS_add_magic_link_to_users.rb`

```ruby
class AddMagicLinkToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :magic_link_token, :string
    add_column :users, :magic_link_token_expires_at, :datetime
    add_index :users, :magic_link_token, unique: true
  end
end
```

**추가 컬럼**:

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `magic_link_token` | string (nullable) | 256-bit 난수 토큰 (urlsafe_base64) |
| `magic_link_token_expires_at` | datetime (nullable) | 만료 시각 (발급 후 15분) |

**인덱스**: `magic_link_token`에 unique index → 토큰 조회 O(log n) + 중복 방지

---

## 3. 백엔드 설계

### 3-1. User 모델

**파일**: `smart-quote-api/app/models/user.rb`  
**추가 메서드**:

```ruby
def generate_magic_link_token!
  self.magic_link_token = SecureRandom.urlsafe_base64(32)  # 256-bit 엔트로피
  self.magic_link_token_expires_at = 15.minutes.from_now
  save!
  magic_link_token
end

def magic_link_valid?(token)
  magic_link_token.present? &&
    magic_link_token == token &&
    magic_link_token_expires_at > Time.current
end

def consume_magic_link_token!
  update!(magic_link_token: nil, magic_link_token_expires_at: nil)
end
```

**스코프 추가**:
```ruby
scope :find_by_magic_token, ->(token) { find_by(magic_link_token: token) }
```

---

### 3-2. AuthMailer

**신규 파일**: `smart-quote-api/app/mailers/auth_mailer.rb`

```ruby
class AuthMailer < ApplicationMailer
  def magic_link(user, token, locale: :ko)
    @user = user
    @magic_link_url = "#{ENV.fetch('FRONTEND_URL', 'http://localhost:5173')}/auth/verify?token=#{token}"
    @expires_in = "15분"

    mail(
      to: user.email,
      subject: "[Goodman GLS] 로그인 링크입니다"
    )
  end
end
```

**뷰 파일** (HTML):  
`smart-quote-api/app/views/auth_mailer/magic_link.html.erb`

```erb
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Goodman GLS 로그인</h2>
  <p>안녕하세요, <%= @user.name || @user.email %>님</p>
  <p>아래 버튼을 클릭하면 자동으로 로그인됩니다. 링크는 <strong><%= @expires_in %></strong> 후 만료됩니다.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="<%= @magic_link_url %>"
       style="background-color: #1e40af; color: white; padding: 12px 24px;
              text-decoration: none; border-radius: 6px; font-size: 16px;">
      로그인하기
    </a>
  </p>
  <p style="color: #666; font-size: 12px;">
    이 링크를 요청하지 않으셨다면 이 이메일을 무시하세요.<br>
    버튼이 작동하지 않으면 아래 URL을 브라우저에 직접 붙여넣으세요:<br>
    <a href="<%= @magic_link_url %>"><%= @magic_link_url %></a>
  </p>
</body>
</html>
```

**뷰 파일** (Text):  
`smart-quote-api/app/views/auth_mailer/magic_link.text.erb`

```erb
Goodman GLS 로그인

안녕하세요, <%= @user.name || @user.email %>님

아래 링크를 클릭하면 자동으로 로그인됩니다. 링크는 <%= @expires_in %> 후 만료됩니다.

<%= @magic_link_url %>

이 링크를 요청하지 않으셨다면 이 이메일을 무시하세요.
```

**환경변수 추가**:
```
FRONTEND_URL=https://bridgelogis.com  # production
FRONTEND_URL=http://localhost:5173    # development
```

---

### 3-3. Routes

**파일**: `smart-quote-api/config/routes.rb`  
**추가 위치**: 기존 `auth` namespace 안에 추가

```ruby
namespace :api do
  namespace :v1 do
    # 기존 auth 라우트들 ...
    post 'auth/login', to: 'auth#login'
    post 'auth/register', to: 'auth#register'
    put  'auth/password', to: 'auth#update_password'
    post 'auth/refresh', to: 'auth#refresh'

    # Magic Link 신규
    post 'auth/magic_link',        to: 'auth#request_magic_link'
    get  'auth/magic_link/verify', to: 'auth#verify_magic_link'
  end
end
```

---

### 3-4. AuthController — 신규 액션 2개

**파일**: `smart-quote-api/app/controllers/api/v1/auth_controller.rb`

#### `request_magic_link`

```ruby
def request_magic_link
  user = User.find_by(email: params[:email]&.downcase&.strip)

  # 보안: 사용자 존재 여부 노출 방지 (항상 200 반환)
  if user
    token = user.generate_magic_link_token!
    AuthMailer.magic_link(user, token).deliver_later
  end

  render json: { message: "로그인 링크를 이메일로 발송했습니다." }, status: :ok
end
```

**보안 고려**: 사용자 미존재 시에도 동일한 응답 반환 (이메일 존재 여부 열거 방지)

#### `verify_magic_link`

```ruby
def verify_magic_link
  token = params[:token]
  return render json: { error: "토큰이 없습니다." }, status: :bad_request if token.blank?

  user = User.find_by(magic_link_token: token)

  if user.nil? || !user.magic_link_valid?(token)
    return render json: { error: "링크가 만료되었거나 유효하지 않습니다." }, status: :unauthorized
  end

  user.consume_magic_link_token!  # 즉시 무효화 (1회용)

  access_token = encode_token(user)
  refresh_token = encode_refresh_token(user)

  render json: {
    token: access_token,
    refresh_token: refresh_token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company: user.company,
      nationality: user.nationality,
      networks: user.networks
    }
  }, status: :ok
end
```

**응답 형식**: 기존 `login` 액션과 동일 → 프론트엔드 통합 간소화

---

## 4. 프론트엔드 설계

### 4-1. API 함수 추가

**파일**: `src/api/apiClient.ts` 또는 신규 `src/api/authApi.ts`

```typescript
export async function requestMagicLink(email: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/magic_link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error('Magic Link 요청 실패')
}

export async function verifyMagicLink(token: string): Promise<{
  token: string
  refresh_token: string
  user: User
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/auth/magic_link/verify?token=${encodeURIComponent(token)}`
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '링크가 만료되었거나 유효하지 않습니다.')
  }
  return res.json()
}
```

---

### 4-2. AuthContext 확장

**파일**: `src/contexts/AuthContext.tsx`

**`AuthContextType` 인터페이스 확장**:
```typescript
interface AuthContextType {
  // 기존 유지
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => void
  updatePassword: (current: string, next: string) => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
  // 신규 추가
  loginWithMagicLink: (token: string, refreshToken: string, userData: User) => void
}
```

**구현**:
```typescript
const loginWithMagicLink = useCallback(
  (accessToken: string, refreshToken: string, userData: User) => {
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)
    setUser(userData)
  },
  []
)
```

Context value에 `loginWithMagicLink` 포함.

---

### 4-3. MagicLinkVerifyPage (신규)

**파일**: `src/pages/MagicLinkVerifyPage.tsx`  
**라우트**: `/auth/verify` (public — ProtectedRoute 없음)

**상태 머신**:

```
loading → (API 호출 성공) → success → 2초 후 /dashboard or /admin
        → (API 호출 실패) → error
```

**컴포넌트 설계**:

```typescript
type VerifyState = 'loading' | 'success' | 'error'

export default function MagicLinkVerifyPage() {
  const [state, setState] = useState<VerifyState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const { loginWithMagicLink } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setState('error')
      setErrorMessage('유효하지 않은 링크입니다.')
      return
    }

    verifyMagicLink(token)
      .then(({ token: accessToken, refresh_token, user }) => {
        loginWithMagicLink(accessToken, refresh_token, user)
        setState('success')
        setTimeout(() => {
          navigate(user.role === 'admin' ? '/admin' : '/dashboard')
        }, 1500)
      })
      .catch((err) => {
        setState('error')
        setErrorMessage(err.message)
      })
  }, [])

  if (state === 'loading') return <VerifyLoadingUI />
  if (state === 'success') return <VerifySuccessUI />
  return <VerifyErrorUI message={errorMessage} />
}
```

**UI 상태별 표시**:
- `loading`: 스피너 + "로그인 중..."
- `success`: 체크 아이콘 + "로그인 성공! 잠시 후 이동합니다..."
- `error`: 경고 아이콘 + 오류 메시지 + "다시 시도" 버튼 (`/login` 이동)

---

### 4-4. LoginPage 수정

**파일**: `src/pages/LoginPage.tsx`  
**변경 위치**: 기존 비밀번호 폼 아래에 구분선 + Magic Link 섹션 추가

```typescript
// Magic Link 섹션 상태
const [magicLinkEmail, setMagicLinkEmail] = useState('')
const [magicLinkSent, setMagicLinkSent] = useState(false)
const [magicLinkLoading, setMagicLinkLoading] = useState(false)

const handleMagicLinkRequest = async (e: React.FormEvent) => {
  e.preventDefault()
  setMagicLinkLoading(true)
  try {
    await requestMagicLink(magicLinkEmail)
    setMagicLinkSent(true)
  } catch {
    // 오류 시에도 "발송됨" 표시 (보안: 이메일 존재 여부 숨김)
    setMagicLinkSent(true)
  } finally {
    setMagicLinkLoading(false)
  }
}
```

**JSX 추가 구조**:
```tsx
{/* 기존 password 폼 */}
<form onSubmit={handleSubmit}>...</form>

{/* 구분선 */}
<div className="flex items-center my-4">
  <hr className="flex-1 border-gray-300 dark:border-gray-600" />
  <span className="px-3 text-sm text-gray-400">또는</span>
  <hr className="flex-1 border-gray-300 dark:border-gray-600" />
</div>

{/* Magic Link 섹션 */}
{!magicLinkSent ? (
  <form onSubmit={handleMagicLinkRequest}>
    <input
      type="email"
      value={magicLinkEmail}
      onChange={(e) => setMagicLinkEmail(e.target.value)}
      placeholder="이메일 주소"
      required
    />
    <button type="submit" disabled={magicLinkLoading}>
      {magicLinkLoading ? '전송 중...' : '✉️ Magic Link로 로그인'}
    </button>
  </form>
) : (
  <div className="text-center text-green-600">
    <p>✅ 이메일을 확인해 주세요</p>
    <p className="text-sm text-gray-500">링크는 15분간 유효합니다</p>
  </div>
)}
```

---

### 4-5. App.tsx 라우트 추가

**파일**: `src/App.tsx`  
**추가 위치**: public 라우트 섹션

```tsx
// 기존 public 라우트들
<Route path="/" element={<LandingPage />} />
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignUpPage />} />
<Route path="/guide" element={<UserGuidePage />} />

// 신규 추가
<Route path="/auth/verify" element={<MagicLinkVerifyPage />} />
```

`import MagicLinkVerifyPage from '@/pages/MagicLinkVerifyPage'` 추가.

---

## 5. 데이터 흐름

```
[LoginPage]
    │ 이메일 입력 + "Magic Link로 로그인" 클릭
    ▼
POST /api/v1/auth/magic_link { email }
    │
    ▼
[AuthController#request_magic_link]
    │ User.find_by(email)
    │ user.generate_magic_link_token!  → DB: magic_link_token, expires_at
    │ AuthMailer.magic_link(user, token).deliver_later
    ▼
200 OK { message: "..." }
    │
    ▼
[LoginPage] → "이메일을 확인해 주세요" 표시

        ↓↓↓ 사용자가 이메일의 링크 클릭 ↓↓↓

브라우저 → /auth/verify?token=xxxxxxxxxxxxxxxx
    │
    ▼
[MagicLinkVerifyPage]
    │ useEffect → verifyMagicLink(token)
    ▼
GET /api/v1/auth/magic_link/verify?token=xxx
    │
    ▼
[AuthController#verify_magic_link]
    │ User.find_by(magic_link_token: token)
    │ user.magic_link_valid?(token) → 만료/무효 체크
    │ user.consume_magic_link_token!  → token = nil (1회용)
    │ encode_token(user) + encode_refresh_token(user)
    ▼
200 OK { token, refresh_token, user }
    │
    ▼
[MagicLinkVerifyPage]
    │ loginWithMagicLink(token, refresh_token, user)
    │   → setAccessToken / setRefreshToken / setUser
    │ 1.5초 후 navigate('/dashboard' or '/admin')
    ▼
[CustomerDashboard / QuoteCalculator]
```

---

## 6. 보안 설계

| 위협 | 대응 |
|------|------|
| 토큰 추측 (brute force) | `SecureRandom.urlsafe_base64(32)` = 256-bit 엔트로피 |
| 토큰 재사용 | `consume_magic_link_token!` → 검증 즉시 무효화 |
| 토큰 탈취 (만료 전) | 15분 TTL, HTTPS 전송 |
| 이메일 열거 공격 | 사용자 미존재 시에도 동일 200 응답 반환 |
| CSRF | GET verify 요청은 읽기 전용 + CSRF 불필요 (JWT 기반) |
| XSS | 토큰은 URL 파라미터 경유, localStorage 저장은 기존 패턴과 동일 |

---

## 7. 구현 순서 (Do Phase 참조용)

```
Step 1: DB 마이그레이션 생성 + 실행
Step 2: User 모델 메서드 3개 추가 (generate / valid? / consume)
Step 3: AuthMailer + 뷰 파일 생성
Step 4: Routes 추가
Step 5: AuthController 액션 2개 추가 (request / verify)
Step 6: Frontend API 함수 추가 (requestMagicLink / verifyMagicLink)
Step 7: AuthContext loginWithMagicLink 추가
Step 8: MagicLinkVerifyPage 신규 생성
Step 9: LoginPage Magic Link 섹션 추가
Step 10: App.tsx /auth/verify 라우트 추가
Step 11: 통합 테스트 (이메일 발송 → 링크 클릭 → 로그인 완료)
```

---

## 8. 파일 변경 목록

### 신규 생성

| 파일 | 설명 |
|------|------|
| `smart-quote-api/db/migrate/*_add_magic_link_to_users.rb` | DB 마이그레이션 |
| `smart-quote-api/app/mailers/auth_mailer.rb` | Magic Link 이메일 발송 |
| `smart-quote-api/app/views/auth_mailer/magic_link.html.erb` | HTML 이메일 템플릿 |
| `smart-quote-api/app/views/auth_mailer/magic_link.text.erb` | 텍스트 이메일 템플릿 |
| `src/pages/MagicLinkVerifyPage.tsx` | 링크 검증 + 자동 로그인 페이지 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `smart-quote-api/app/models/user.rb` | `generate_magic_link_token!` 등 3개 메서드 추가 |
| `smart-quote-api/app/controllers/api/v1/auth_controller.rb` | `request_magic_link`, `verify_magic_link` 액션 추가 |
| `smart-quote-api/config/routes.rb` | 2개 Magic Link 라우트 추가 |
| `src/contexts/AuthContext.tsx` | `loginWithMagicLink` 함수 + 타입 추가 |
| `src/pages/LoginPage.tsx` | Magic Link 섹션 (구분선 + 이메일 폼 + 완료 메시지) 추가 |
| `src/App.tsx` | `/auth/verify` public 라우트 추가 |
| `src/api/apiClient.ts` (or `authApi.ts`) | `requestMagicLink`, `verifyMagicLink` 함수 추가 |

### 환경변수 추가

| 변수 | 값 |
|------|---|
| `FRONTEND_URL` | `https://bridgelogis.com` (prod) / `http://localhost:5173` (dev) |

---

## 9. 성공 기준 (Plan 연동)

- [ ] Magic Link 발송 후 15분 이내 클릭 시 자동 로그인
- [ ] 15분 초과 토큰 → "만료" 오류 응답
- [ ] 동일 토큰 2회 사용 → 두 번째는 실패
- [ ] 기존 email+password 로그인 영향 없음
- [ ] 사용자 미존재 이메일 입력 시에도 200 응답 (이메일 열거 방지)
- [ ] `/auth/verify` 비로그인 상태에서 직접 접근 가능 (public route)
