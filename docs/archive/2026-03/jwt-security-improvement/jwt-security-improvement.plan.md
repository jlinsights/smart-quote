# Plan: jwt-security-improvement

> JWT 토큰 보안 강화 — localStorage → 메모리 저장 + Refresh Token 패턴

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | jwt-security-improvement |
| 우선순위 | Critical (보안) |
| 예상 영향 범위 | Frontend 인증 흐름 전체, Backend 토큰 발급 |
| 관련 파일 수 | ~6개 (Frontend 4 + Backend 2) |

### 배경

코드 분석(2026-03-29)에서 Critical 보안 이슈로 식별됨:
- JWT Access Token이 `localStorage`에 저장되어 XSS 공격 시 토큰 탈취 가능
- 현재 토큰 만료: 24시간 (탈취 시 장시간 악용 가능)
- 내부 도구이므로 공격 표면은 제한적이나, 견적/고객 데이터 보호를 위해 개선 필요

## 2. 현재 구조

```
[Login] → Backend: JWT 발급 (24h 만료)
         → Frontend: localStorage.setItem('smartQuoteToken', jwt)

[API 호출] → localStorage.getItem() → Authorization: Bearer {jwt}

[새로고침] → localStorage에서 토큰 복원 → /api/v1/auth/me 로 검증
```

### 취약점
1. XSS 공격 시 `localStorage`에서 토큰 직접 읽기 가능
2. Access Token 만료가 24시간으로 길어 탈취 시 장시간 악용
3. 토큰 무효화 메커니즘 없음 (서버 측 블랙리스트 미구현)

## 3. 개선 방안

### 옵션 비교

| 방안 | 보안 | 구현 난이도 | UX 영향 | 선택 |
|------|:----:|:----------:|:-------:|:----:|
| A. httpOnly Cookie | 최상 | 높음 (CORS, CSRF 처리) | 없음 | - |
| B. **메모리 저장 + Refresh Token** | 상 | 중간 | 새로고침 시 잠깐 로딩 | **선택** |
| C. sessionStorage | 중 | 낮음 | 탭 닫으면 로그아웃 | - |

### 선택: 옵션 B (메모리 저장 + Refresh Token)

**이유:**
- httpOnly Cookie는 백엔드 CORS/CSRF 대대적 변경 필요 (Rails API-only 구조와 충돌)
- 메모리 저장은 프론트엔드만 변경하면 되고, Refresh Token은 백엔드 1개 엔드포인트 추가
- XSS로 메모리 변수는 직접 접근 불가 (localStorage보다 훨씬 안전)

## 4. 변경 범위

### Frontend (4개 파일)

#### 4-1. `src/lib/authStorage.ts` — 메모리 저장으로 전환
- `localStorage` → 모듈 스코프 변수 (`let token: string | null = null`)
- Refresh Token만 `localStorage`에 저장 (긴 만료, 서버 검증 필수)
- 새로고침 시 Refresh Token으로 Access Token 자동 재발급

#### 4-2. `src/contexts/AuthContext.tsx` — Refresh 로직 추가
- 초기 로드 시 `refreshAccessToken()` 호출
- Access Token 만료 전 자동 갱신 (타이머)
- 401 응답 시 Refresh Token으로 재시도 1회

#### 4-3. `src/api/apiClient.ts` — 401 재시도 로직
- 401 응답 → Refresh Token으로 Access Token 재발급 → 원래 요청 재시도
- Refresh도 실패 시 로그아웃

#### 4-4. `src/contexts/__tests__/AuthContext.test.tsx` — 테스트 업데이트

### Backend (2개 파일)

#### 4-5. `smart-quote-api/app/controllers/concerns/jwt_authenticatable.rb`
- Access Token 만료: 24시간 → **15분**
- Refresh Token 발급 로직 추가 (만료: 7일)
- `encode_refresh_token(user)` / `decode_refresh_token(token)` 메서드

#### 4-6. `smart-quote-api/app/controllers/api/v1/auth_controller.rb`
- `POST /api/v1/auth/refresh` 엔드포인트 추가
- Login/Register 응답에 `refresh_token` 추가

## 5. 구현 순서

```
1. Backend: Refresh Token 발급 로직 + /auth/refresh 엔드포인트
2. Frontend: authStorage.ts 메모리 저장 전환
3. Frontend: AuthContext.tsx Refresh 로직
4. Frontend: apiClient.ts 401 재시도
5. 테스트 업데이트
6. 검증: 로그인 → 새로고침 → 토큰 만료 → 자동 갱신
```

## 6. 테스트 전략

- 기존 AuthContext.test.tsx 업데이트
- 새 테스트: Refresh Token 만료 시 로그아웃 확인
- 새 테스트: Access Token 만료 → 자동 갱신 후 API 재시도
- 수동 테스트: 브라우저 DevTools → Application → localStorage에 Access Token 없음 확인
- Backend: `bundle exec rspec spec/requests/api/v1/auth_spec.rb`

## 7. 롤백 계획

- Frontend 변경은 `authStorage.ts`를 localStorage 버전으로 revert하면 즉시 복원
- Backend는 기존 `/auth/login`, `/auth/me` 그대로 유지하므로 하위 호환

## 8. 제약 사항

- Refresh Token은 여전히 localStorage에 저장 (XSS 시 탈취 가능하나, 서버 검증 필수이므로 Access Token보다 안전)
- 완전한 XSS 방어를 위해서는 httpOnly Cookie가 필요하나, 현 아키텍처 제약으로 보류
- 내부 도구 특성상 CSP 헤더 강화로 XSS 자체를 방어하는 것이 더 현실적

---

**작성일**: 2026-03-29
**심각도**: Critical (보안)
**선행 작업**: 없음
