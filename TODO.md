# TODO — smart-quote-main

프로젝트 진행 중 기록해 둬야 할 시간 기반 또는 후속 작업 메모.

---

## 📅 Scheduled Tasks (날짜 기반)

### 2026-04-15 — LJ001 transition 노트 제거
- **파일**: `src/config/flight-schedules.ts`
- **대상**: `default-lj-001` 엔트리의 `remarks`
- **작업**: `' · ※ Until 14 APR 2026: DAILY 17:10-21:10'` 부분 제거
- **배경**: 4/15부터 LJ001이 D1,3,4,5,6 19:55-23:55로 완전 전환 (PDF `SU 4월 15일-25일 안내문.pdf`)
- **관련 커밋**: `f8da3d6` (2026-04-11 추가)
- **예상 작업량**: 1줄 수정 + commit/push (< 1분)

---

## 🔄 Follow-up PDCA Cycles

### 🔴 `schema-drift-recovery` (우선)
- **대상**: Rails API 테스트 DB에서 발견된 스키마 드리프트
- **증상**: `users.networks`, `quotes.margin_percent` 컬럼이 `schema_migrations`에는 있지만 실제 DB에 없음
- **영향**: 114 pre-existing rspec 실패 (magic-link-hardening 사이클 중 발견)
- **임시 조치**: 로컬 dev/test DB에 `ALTER TABLE` 수동 적용
- **정식 해결**: 마이그레이션 재실행 + `db/schema.rb` 재생성 + `git commit`
- **파일**: `smart-quote-api/db/schema.rb`

### 🟡 `magic-link-column-cleanup` (1-2주 후)
- **대상**: 레거시 `users.magic_link_token` plaintext 컬럼 drop
- **전제**: `magic-link-hardening` (Match 99%) 프로덕션 안정성 확인 후
- **타이밍**: 2026-04-25 이후 권장 (2주 관찰)
- **작업**: 새 마이그레이션 `RemoveLegacyMagicLinkTokenFromUsers`

### 🟢 `email-sender-domain-auth` (나중)
- **현재**: SendGrid Single Sender Verification (옵션 B) — `jhlim725@gmail.com`
- **목표**: 옵션 A — `bridgelogis.com` 또는 `goodmangls.com` Domain Authentication
- **장점**: 도메인 전체 주소 사용 가능, 스팸 점수 개선, 브랜드 일관성
- **작업**: SendGrid Domain Auth → DNS CNAME 3개 추가 → MAILER_FROM 업데이트

### 🟢 `bootsnap-cache-untrack` (나중)
- **대상**: `smart-quote-api/tmp/cache/bootsnap/` 1496 tracked files
- **작업**: `git rm --cached` + `.gitignore` 확인
- **영향**: 1496 파일 삭제 (런타임 재생성되므로 안전)

---

## 🔍 Investigation Items

### Vercel `bridgelogis.com` 커스텀 도메인 연결 확인
- `LanguageContext.tsx`에 `ENGLISH_ONLY_HOSTS = ['bridgelogis.com']` 추가됨
- 실제로 `bridgelogis.com`이 Vercel에 연결되어 있는지 확인 필요
- Vercel Dashboard → smart-quote-main → Settings → Domains

### `default-5y-8527` 엔트리의 `departureDays` 주석 오류
- `src/config/flight-schedules.ts:448` 부근
- 주석: `[2], // D3 = Tuesday` ← IATA 표준에서 D3 = Wednesday
- 배열과 주석 중 어느 쪽이 맞는지 원본 스케줄 확인 필요
