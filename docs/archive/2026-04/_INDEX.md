# Archive Index — 2026-04

| Feature | Match Rate | Archived | Documents |
|---------|-----------|----------|-----------|
| code-quality-fixes | 96% | 2026-04-05 | Plan, Design, Analysis, Report |
| cargoai-roadmap-m1 | 97% | 2026-04-05 | Do, Analysis, Report (M1 only; Plan+Design remain active for M2-M6) |
| auth-passwordless | 95% | 2026-04-09 | Plan, Design, Analysis, Report |
| magic-link-hardening | 99% | 2026-04-11 | Plan, Design, Analysis, Report — auth-passwordless 후속 경화 (secure_compare, SHA256 digest, rack-attack 3 throttle, i18n 15 keys × 4 langs, 26 신규 테스트, 보안 10/10) |
| schema-drift-recovery | 95% | 2026-04-11 | Plan, Design, Analysis, Report — bb93c45 환각 schema.rb 손상 복원 (margin_rules/discount_rules 정정, networks/margin_percent/profit_amount 복원). rspec 114→10 failures (104건 해결). Rails 8 db:migrate schema.rb fallback 동작 발견. |
| ups-dhl-tariff-update | 100% | 2026-04-11 | Report only (비공식 PDCA, 요율 데이터 업데이트 작업) — UPS/DHL 공시 정가 반영. 4개 파일 완전 재작성 (TS 2 + Ruby 2), 903개 값 100% TS↔Ruby 동기화, Vercel+Render 동시 배포. |
| test-suite-fixes | 96% | 2026-04-11 | Plan, Design, Analysis, Report — schema-drift-recovery 후 잔여 10 RSpec failures 해결 (166/166 통과). C1 shoulda matcher 정정, C2 memory_store+cache.clear hook, C3 pickup_in_seoul_cost+manual_surge_cost || 0 fallback. Hard gaps 0, 회귀 0, rubocop 0 위반. |
| calculation-parity-fix | 100% | 2026-04-11 | Report only (비공식 PDCA) — calculation_parity_spec 경로 수정 (../../../../→../../../) + UpsSurgeFee nil 가드 추가 (&.dig(:total) \|\| 0). RSpec 187/187, Vitest 1229/1229 통과. |
| flight-schedule-effective-window | 100% | 2026-04-11 | Plan, Design, Analysis, Report — Goodman GLS SU(555) LJ001 10-14 APR vs 15-25 APR rollover 해결. FlightSchedule에 effectiveFrom/To 추가, useFlightSchedules 로컬 날짜 기준 isActiveOn 필터 + legacy id idempotent rename, FlightFormModal 유효기간 2 필드, i18n 4언어, 신규 12 테스트 (단위 8 + rollover 4). Vitest 1241/1241, 0 iterations. |
