# Design: jwt-security-improvement

> Plan 문서 기반 상세 구현 설계 — 메모리 저장 + Refresh Token 패턴

## 1. 토큰 흐름 설계

### 1-1. Login/Register 응답 변경

```
Before: { token, user }
After:  { token, refresh_token, user }
```

- `token` (Access Token): 15분 만료, 메모리에만 저장
- `refresh_token` (Refresh Token): 7일 만료, localStorage에 저장

### 1-2. 인증 흐름

```
[로그인] → Backend: access_token(15m) + refresh_token(7d) 발급
          → Frontend: access_token → 메모리 변수
                      refresh_token → localStorage

[API 호출] → 메모리에서 access_token → Authorization: Bearer {access_token}

[401 응답] → refresh_token으로 POST /auth/refresh
           → 성공: 새 access_token 발급 → 원래 요청 재시도
           → 실패: 로그아웃

[새로고침] → localStorage에서 refresh_token 읽기
           → POST /auth/refresh → 새 access_token → 메모리 저장
           → 실패 시: 로그인 페이지로 이동

[Access Token 자동 갱신] → 만료 1분 전 타이머로 refresh 호출
```

---

## 2. Backend 변경

### 2-1. `jwt_authenticatable.rb` — 토큰 발급 변경

```ruby
# Access Token: 15분 만료
def encode_token(user)
  payload = {
    user_id: user.id,
    role: user.role,
    exp: 15.minutes.from_now.to_i
  }
  JWT.encode(payload, jwt_secret, "HS256")
end

# Refresh Token: 7일 만료
def encode_refresh_token(user)
  payload = {
    user_id: user.id,
    type: "refresh",
    exp: 7.days.from_now.to_i
  }
  JWT.encode(payload, jwt_secret, "HS256")
end

# Refresh Token 디코딩 (type 검증 포함)
def decode_refresh_token(token)
  decoded = JWT.decode(token, jwt_secret, true, algorithm: "HS256")
  payload = decoded[0]
  return nil unless payload["type"] == "refresh"
  return nil if payload["exp"] < Time.current.to_i
  User.find_by(id: payload["user_id"])
rescue JWT::DecodeError, JWT::ExpiredSignature
  nil
end
```

### 2-2. `auth_controller.rb` — 응답 변경 + refresh 엔드포인트

```ruby
# login/register 응답에 refresh_token 추가
def login
  user = User.find_by(email: params[:email]&.downcase&.strip)
  if user&.authenticate(params[:password])
    render json: {
      token: encode_token(user),
      refresh_token: encode_refresh_token(user),
      user: user_json(user)
    }
  else
    # ... 기존 에러 처리
  end
end

# POST /api/v1/auth/refresh — 신규 엔드포인트
def refresh
  refresh_token = params[:refresh_token]
  user = decode_refresh_token(refresh_token)

  if user
    render json: {
      token: encode_token(user),
      user: user_json(user)
    }
  else
    render json: { error: "Invalid refresh token" }, status: :unauthorized
  end
end
```

### 2-3. `routes.rb` — 라우트 추가

```ruby
post "auth/refresh", to: "auth#refresh"
```

---

## 3. Frontend 변경

### 3-1. `authStorage.ts` — 메모리 + Refresh Token 분리

```typescript
const REFRESH_KEY = 'smartQuoteRefresh';

// Access Token: 메모리만 (XSS 접근 불가)
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

// Refresh Token: localStorage (서버 검증 필수)
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_KEY);
}

export function clearAllTokens(): void {
  accessToken = null;
  localStorage.removeItem(REFRESH_KEY);
}
```

**주의**: 기존 `TOKEN_KEY = 'smartQuoteToken'`은 삭제. 마이그레이션 시 기존 localStorage 토큰도 정리:
```typescript
// 마이그레이션: 기존 localStorage 토큰 제거
localStorage.removeItem('smartQuoteToken');
```

### 3-2. `apiClient.ts` — 401 재시도 로직

```typescript
import { getAccessToken, getRefreshToken, setAccessToken, clearAllTokens } from '@/lib/authStorage';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.token);
    return true;
  } catch {
    return false;
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...(options?.headers || {}) },
    ...options,
  });

  // 401 → Refresh Token으로 재시도 1회
  if (response.status === 401 && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }
    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      const newToken = getAccessToken();
      const retryHeaders = { ...headers, ...(options?.headers || {}), 'Authorization': `Bearer ${newToken}` };
      response = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders });
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAllTokens();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, await getErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
```

**동시 요청 처리**: `isRefreshing` 플래그로 여러 요청이 동시에 401을 받아도 refresh는 1회만 실행.

### 3-3. `AuthContext.tsx` — 초기화 + 자동 갱신

```typescript
// 초기 로드: refresh token으로 access token 재발급
useEffect(() => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    // 마이그레이션: 기존 localStorage 토큰 정리
    localStorage.removeItem('smartQuoteToken');
    setIsLoading(false);
    return;
  }

  fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(res => { if (res.ok) return res.json(); throw new Error('Refresh failed'); })
    .then(data => {
      setAccessToken(data.token);
      setUser(data.user);
    })
    .catch(() => { clearAllTokens(); setUser(null); })
    .finally(() => setIsLoading(false));
}, []);

// Access Token 자동 갱신 (14분마다)
useEffect(() => {
  if (!user) return;
  const interval = setInterval(() => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(res => { if (res.ok) return res.json(); throw new Error(); })
      .then(data => setAccessToken(data.token))
      .catch(() => { /* 다음 API 호출 시 401 → 재시도 로직에서 처리 */ });
  }, 14 * 60 * 1000); // 14분
  return () => clearInterval(interval);
}, [user]);

// login 콜백 수정
const login = useCallback(async (...) => {
  // ... fetch 후
  if (res.ok) {
    const data = await res.json();
    setAccessToken(data.token);
    setRefreshToken(data.refresh_token);  // ← 추가
    setUser(data.user);
    return { success: true, user: data.user };
  }
}, []);

// logout 수정
const logout = useCallback(() => {
  clearAllTokens();  // ← clearAccessToken() → clearAllTokens()
  setUser(null);
}, []);
```

### 3-4. `quoteApi.ts` — export 함수 수정

```typescript
// exportQuotes()에서 직접 localStorage 토큰 참조하던 부분 수정
// Before: const n = localStorage.getItem(TOKEN_KEY);
// After: 메모리에서 가져오기
import { getAccessToken } from '@/lib/authStorage';

const token = getAccessToken();
```

---

## 4. 구현 순서 (확정)

```
1. Backend: jwt_authenticatable.rb — encode_refresh_token, decode_refresh_token 추가, Access Token 15분
2. Backend: auth_controller.rb — refresh 액션 추가, login/register 응답에 refresh_token
3. Backend: routes.rb — post "auth/refresh" 추가
4. Frontend: authStorage.ts — 메모리 저장 전환, Refresh Token 관리
5. Frontend: apiClient.ts — 401 재시도 로직
6. Frontend: AuthContext.tsx — 초기화/자동 갱신/login/logout 수정
7. Frontend: quoteApi.ts — TOKEN_KEY 참조 제거
8. 테스트 업데이트 + 수동 검증
```

## 5. 검증 체크리스트

- [ ] `npx tsc --noEmit` 통과
- [ ] `npm run lint` 통과
- [ ] `npx vitest run` 전체 통과
- [ ] Backend: `bundle exec rspec` 통과
- [ ] 수동: 로그인 후 DevTools → Application → localStorage에 `smartQuoteToken` 없음 확인
- [ ] 수동: 로그인 후 DevTools → Application → localStorage에 `smartQuoteRefresh` 있음 확인
- [ ] 수동: 새로고침 후 로그인 유지 확인
- [ ] 수동: 15분 후 자동 갱신 확인 (또는 Access Token 만료 강제)

---

**작성일**: 2026-03-29
**참조**: `docs/01-plan/features/jwt-security-improvement.plan.md`
