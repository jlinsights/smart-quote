# Plan: auth-passwordless (Magic Link 인증)

## 개요

기존 비밀번호 기반 JWT 인증을 유지하면서, 비밀번호 없이 이메일 Magic Link로 로그인할 수 있는 옵션을 추가한다.

## 목표

- 사용자가 비밀번호를 잊어도 이메일 링크 하나로 로그인 가능
- 기존 `email + password` 로그인 흐름을 그대로 유지 (코이존)
- 새 사용자도 비밀번호 없이 가입 가능 (Magic Link로 첫 로그인 시 자동 생성)

## 배경 / 현황

- **인증 스택**: Rails 8 `has_secure_password` + 커스텀 JWT (`encode_token` / `encode_refresh_token`)
- **User 모델**: `password_required?` 이미 구현되어 새 레코드이거나 password 존재 시에만 검증 → 비밀번호 없는 사용자 생성 가능
- **현재 라우트**: `POST auth/login`, `POST auth/register`, `GET auth/me`, `POST auth/refresh`, `PUT auth/password`, `POST auth/promote`
- **메일러**: ActionMailer (Rails 기본 내장)

## 범위

### 백엔드 (Rails API)

| 항목 | 내용 |
|------|------|
| DB 마이그레이션 | `users` 테이블에 `magic_link_token`, `magic_link_token_expires_at` 컬럼 추가 |
| 라우트 추가 | `POST /api/v1/auth/magic_link` (요청), `GET /api/v1/auth/magic_link/verify` (검증) |
| AuthController | `request_magic_link`, `verify_magic_link` 액션 추가 |
| User 모델 | `generate_magic_link_token!` 메서드, 만료 시간 15분 |
| ActionMailer | `AuthMailer#magic_link` — 링크 포함 이메일 발송 |
| 보안 | `SecureRandom.urlsafe_base64(32)`, 1회 사용 후 즉시 무효화, 만료 체크 |

### 프론트엔드 (React)

| 항목 | 내용 |
|------|------|
| 로그인 페이지 | "Magic Link로 로그인" 버튼/탭 추가 |
| 이메일 입력 폼 | 이메일만 입력 → 전송 요청 |
| 확인 화면 | "이메일을 확인하세요" 메시지 |
| 토큰 검증 라우트 | `/auth/verify?token=xxx` → API 호출 → JWT 저장 → 리다이렉트 |

## 범위 외 (이번 구현 제외)

- 기존 비밀번호 로그인/회원가입 변경 없음
- SMS/OTP 방식
- OAuth / Social Login
- Passkeys / WebAuthn

## 기술적 고려사항

1. **토큰 보안**: `SecureRandom.urlsafe_base64(32)` → 256비트 엔트로피, DB에 해시 저장 고려
2. **만료 시간**: 15분 (이후 재요청 필요)
3. **1회 사용**: 검증 즉시 `magic_link_token = nil` 로 무효화
4. **이메일 발송**: 개발 환경 `letter_opener` / 운영 환경 SMTP or SendGrid
5. **프론트 라우팅**: `/auth/verify?token=xxx` 페이지가 마운트 시 자동으로 verify API 호출

## 구현 단계

### Phase 1: 백엔드 기반
1. DB 마이그레이션 (`magic_link_token`, `magic_link_token_expires_at`)
2. User 모델 메서드 추가
3. AuthMailer 생성 (이메일 템플릿 포함)
4. 라우트 추가
5. AuthController 액션 2개 구현

### Phase 2: 프론트엔드 연동
1. `authService` Magic Link API 함수 추가
2. LoginPage에 Magic Link 탭/버튼 추가
3. `/auth/verify` 라우트 + 페이지 컴포넌트 생성
4. 토큰 검증 후 JWT 저장 + 홈 리다이렉트

### Phase 3: 검증 및 테스트
1. RSpec: `request_magic_link`, `verify_magic_link` 액션 테스트
2. 만료/재사용 엣지 케이스 테스트
3. 프론트 E2E 흐름 확인

## 성공 기준

- [ ] 이메일 입력 → Magic Link 이메일 수신
- [ ] 링크 클릭 → 자동 로그인 (JWT 발급)
- [ ] 만료된 링크 클릭 → 적절한 오류 메시지
- [ ] 같은 링크 재클릭 → 오류 (1회 사용)
- [ ] 기존 비밀번호 로그인 정상 동작 유지

## 의존성

- `letter_opener` gem (개발 환경 이메일 미리보기)
- 운영 환경 SMTP 설정 (환경 변수)

## 예상 작업량

- 백엔드: 약 2-3시간
- 프론트엔드: 약 2-3시간
- 테스트: 약 1-2시간

---

*Created: 2026-04-09*
*Feature: auth-passwordless*
*Phase: Plan*
