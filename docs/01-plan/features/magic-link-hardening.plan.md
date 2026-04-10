# Plan — magic-link-hardening

**Created**: 2026-04-10
**Status**: Plan
**Owner**: jaehong
**Parent feature**: auth-passwordless (archived 2026-04-09, Match 95%)
**Source**: Deep dive analysis 2026-04-10 (MagicLinkVerifyPage + AuthController + User model)

---

## 1. Background

매직링크 인증 기능(`auth-passwordless`)은 `docs/archive/2026-04/auth-passwordless/`로 아카이브되었으나, end-to-end deep dive 결과 **보안/품질/i18n 공백 8건**이 발견됨. 본 사이클은 이를 체계적으로 경화(hardening)하는 것을 목표로 한다.

### 발견된 공백 요약

| # | 항목 | 심각도 | 근거 파일 |
|---|------|-------|---------|
| 1 | 타이밍 공격 가능 (`==` 비교) | 🔴 High | `smart-quote-api/app/models/user.rb:29` |
| 2 | Rate limit 부재 (이메일 폭탄 벡터) | 🔴 High | `auth_controller.rb:73-83` |
| 3 | LoginPage / AuthMailer 한국어 잔존 | 🔴 High | `LoginPage.tsx:227`, `auth_mailer.rb:5-6` |
| 4 | 평문 토큰 DB 저장 | 🟡 Med | `user.rb:21`, 마이그레이션 `20260409073241` |
| 5 | 테스트 커버리지 0건 | 🟡 Med | `spec/requests/api/v1/auth_spec.rb` (magic 언급 0) |
| 6 | URL 토큰 히스토리 잔존 | 🟡 Med | `MagicLinkVerifyPage.tsx` (history.replaceState 없음) |
| 7 | FRONTEND_URL 프로덕션 fallback = localhost | 🟢 Low | `auth_mailer.rb:4` |
| 8 | 이메일 프리뷰어 GET 자동소비 가능 | 🟢 Low | `routes.rb:14` (get 메서드) |

---

## 2. Goal

**매직링크 인증의 보안 등급을 "동작 가능"에서 "프로덕션 경화"로 끌어올린다.**

### 측정 가능한 목표

- [ ] Rubocop + Brakeman 통과 (신규 경고 0건)
- [ ] 타이밍 공격에 안전한 상수시간 비교 적용
- [ ] 토큰 요청 엔드포인트에 rate limit 적용 (IP당 10req/hour, 이메일당 5req/hour)
- [ ] DB에 평문 토큰 미저장 (SHA256 digest만)
- [ ] 매직링크 관련 테스트 스위트 신규 작성
  - [ ] Model spec (4 cases): 생성, 만료, 소비, 유효성
  - [ ] Request spec (6 cases): enumeration 방지, 유효/만료/소비/잘못된 토큰, 성공 JWT 발급
  - [ ] Component test: useRef 가드 + queueMicrotask 경로
  - [ ] E2E: request → verify → dashboard 진입
- [ ] LoginPage + AuthMailer 영어 통일 (default=en 원칙 유지)
- [ ] 검증 후 URL 토큰 파라미터 즉시 제거 (`history.replaceState`)
- [ ] `FRONTEND_URL` 프로덕션 미설정 시 fail-fast

### Non-goals

- 토큰 UX 전면 개편 (GET→POST 이메일 프리뷰어 대응은 별도 사이클)
- SMS OTP, WebAuthn 등 신규 인증 방식
- 세션 관리 (refresh token rotation 등 — 이미 별도 backlog)

---

## 3. Scope

### In scope

#### Backend (Rails 8 API)
- `db/migrate/{new}_rename_magic_link_token_to_digest.rb` — 컬럼명 변경 + SHA256 해시 저장 전환
- `app/models/user.rb`
  - `generate_magic_link_token!`: 원본 토큰 반환, DB에는 digest 저장
  - `magic_link_valid?(token)`: `ActiveSupport::SecurityUtils.secure_compare`로 교체
  - `consume_magic_link_token!`: 기존 유지
- `app/controllers/api/v1/auth_controller.rb`
  - `request_magic_link`: digest 조회 로직 반영
  - `verify_magic_link`: digest 조회 로직 반영
- `config/initializers/rack_attack.rb` — rate limit 신규 (또는 controller throttle)
- `Gemfile` — `rack-attack` 추가
- `app/mailers/auth_mailer.rb`
  - Subject/본문 영어화
  - `FRONTEND_URL` fetch without default (fail-fast)
- `app/views/auth_mailer/magic_link.{html,text}.erb` — 영어 템플릿
- `spec/models/user_spec.rb` — magic link 메서드 4 cases
- `spec/requests/api/v1/auth_spec.rb` — magic link 6 cases
- `spec/mailers/auth_mailer_spec.rb` — 이메일 렌더링 + URL 생성

#### Frontend (React + Vite)
- `src/pages/LoginPage.tsx` — 한국어 문자열 4종 영어화 ("전송 중...", "로그인 링크 이메일로 받기" 등)
- `src/pages/MagicLinkVerifyPage.tsx`
  - 검증 후 `window.history.replaceState(null, '', '/auth/verify')` 토큰 제거
  - (useRef 가드 + queueMicrotask는 유지)
- `src/pages/__tests__/MagicLinkVerifyPage.test.tsx` — 신규 컴포넌트 테스트
- `e2e/magic-link-auth.spec.ts` — 신규 Playwright E2E (이메일 intercept는 mock)

### Out of scope
- `authApi.ts` 구조 변경 (이미 적절)
- `AuthContext.loginWithMagicLink` 시그니처 (이미 적절)
- 매직링크 세션/refresh token 정책 (별도 사이클)

---

## 4. Risks & Assumptions

### Risks

| 리스크 | 영향 | 완화책 |
|-------|------|-------|
| 기존 발급된 평문 토큰이 DB에 있음 | 마이그레이션 시점 활성 토큰 무효화 | 마이그레이션에서 `UPDATE users SET magic_link_token = NULL, magic_link_token_expires_at = NULL` 선행 (15분 이내 발급된 건만 영향) |
| rack-attack 설정 오류로 정상 사용자 차단 | HTTP 429 대량 발생 | 초기 값 여유롭게 (IP 10/h, email 5/h) + Rails 로그 모니터링 체크리스트 |
| 기존 auth_spec.rb 테스트와 네임스페이스 충돌 | RSpec 실패 | `describe "POST /api/v1/auth/magic_link"` 블록 분리 |
| Playwright 이메일 mock 복잡도 | E2E 구현 지연 | ActionMailer::Base.deliveries를 test API endpoint로 노출 (테스트 env만) 또는 BE에서 마지막 발급 토큰 반환 |
| i18n 영어화가 사용자 경험 변경 | 한국 사용자 혼동 | 본 프로젝트는 4개 언어(en/ko/cn/ja) 지원. 기존 `t()` 키 사용으로 전환 고려 (LoginPage는 이미 `useLanguage()` 사용 중이므로 번역 키 추가가 깔끔) |

### Assumptions

- PostgreSQL 환경 (마이그레이션 호환)
- `FRONTEND_URL` 환경변수는 Render.com 프로덕션에 이미 설정되어 있음 (fail-fast 전환해도 안전)
- rack-attack는 Redis 없이 `Rails.cache`(memory store)로 동작 가능 (단일 인스턴스 환경)
- 기존 `auth-passwordless` 아카이브 문서는 읽기 전용이며 수정하지 않음

---

## 5. Dependencies

- **Gems**: `rack-attack` 신규 추가
- **ENV vars**: `FRONTEND_URL` (이미 존재), `ADMIN_PROMOTE_SECRET` (무관), 신규 없음
- **Routes**: 기존 `auth/magic_link` POST, `auth/magic_link/verify` GET 유지
- **Migrations**: 1개 (`rename_magic_link_token_to_digest`)
- **Frontend deps**: 신규 없음

---

## 6. Success Criteria (Check 단계 목표)

- Match Rate ≥ 90%
- `bundle exec rspec` 전체 통과 + 신규 스펙 10+ cases green
- `npx vitest run` 1224+ tests green (회귀 없음)
- `npx tsc --noEmit` 통과
- `npm run lint` 통과 (`--max-warnings 0`)
- `bin/rubocop` 통과
- `bin/brakeman` 통과 (magic_link 관련 신규 경고 없음)
- 수동 smoke: request → 이메일 수신 → 클릭 → 대시보드 진입 성공
- 수동 negative: 만료된 링크 → 401 + 에러 메시지, 두 번째 클릭 → 401

---

## 7. Open Questions

1. **영어화 vs i18n 키**: LoginPage는 `useLanguage()`를 사용 중. 하드코딩 영어 대신 `t('auth.magicLink.sending')` 패턴으로 갈지? → **결정 필요** (design 단계)
2. **rack-attack 저장소**: Memory store로 충분한가 vs Redis 도입? → Render Hobby 단일 인스턴스면 memory 충분, Pro 다중 인스턴스면 Redis 필수. 현재 상태 확인 필요.
3. **마이그레이션 롤백 전략**: digest 컬럼 추가 후 구 컬럼 drop은 같은 마이그레이션에 포함할지, 별도로 분리할지? → Rails 관행상 1-step 분리 권장
4. **E2E 이메일 mock 방식**: 테스트 전용 endpoint vs ActionMailer 메모리 드라이버 + API 노출? → design 단계 확정

---

## 8. Next Phase

- `/pdca design magic-link-hardening` — DB 마이그레이션 diff, 모델/컨트롤러 코드 레벨 변경, rack-attack 설정, 테스트 케이스 상세 설계
