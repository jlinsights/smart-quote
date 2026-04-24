# Plan: jways-brand-migration (DESIGN.md Phase 2)

> Legacy `jways-*` / `accent-*` Tailwind 토큰을 BridgeLogis Brand 토큰(`brand-blue-*` / `cyan-*`)으로 전면 마이그레이션.
> DESIGN.md v1.0.1-alpha Phase 1(non-breaking) 완료 이후의 후속 작업.

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | `jways-brand-migration` |
| 우선순위 | Medium (시각적 breaking change, 브랜드 일관성 정립 목적) |
| 유형 | Refactor / Design token migration |
| 영향 범위 | Frontend 약 40+ 파일, 262 occurrences (jways-207 + accent-55) |
| 선행 조건 | DESIGN.md v1.0.1-alpha Phase 1 완료 (✅ 2026-04-24, commit `f3d54b5`) |

### 배경

- 현재 `tailwind.config.cjs` 는 3개 레이어가 공존: Brand(신) / Semantic / Legacy(`jways-*`, `accent-*`) / Neutral
- Legacy 토큰은 Tailwind 기본 blue/sky 색상에 alias 되어 **BridgeLogis 브랜드 팔레트와 시각적으로 불일치**
  - `jways-500 = #3b82f6` (blue-500) ↔ Brand `brand-blue = #1D6FD1`
  - `accent-500 = #0ea5e9` (sky-500) ↔ Brand `cyan = #00B4D8`
- 새 UI 에서 Legacy 토큰 사용 금지 상태이지만, **262 occurrences** 가 코드베이스에 잔존하며 섹션마다 다른 파란색을 내고 있음
- CLAUDE.md 및 DESIGN.md 모두 Phase 2 마이그레이션을 명시적으로 남겨둠

### 목표 (Definition of Done)

1. `src/**/*.{tsx,ts,css}` 내 `jways-*` / `accent-*` 사용 0 건 (grep 검증)
2. `tailwind.config.cjs` 에서 `jways` / `accent` 블록 **제거**
3. 시각적 회귀 없음 — BridgeLogis 팔레트로 통일되되 UI 위계/대비 유지 (특히 dark mode)
4. Lint/type-check/test 기존 통과 상태 유지 (1188 tests)
5. `.commit_message.txt` 한국어 기록, DESIGN.md 버전 범프 (1.0.1-alpha → 1.1.0)

## 2. 기존 구현 현황

### Phase 1 완료 분 (현 상태)

| 구성요소 | 상태 | 비고 |
|----------|:----:|------|
| Brand 토큰 정의 (`brand-blue` 10단계, `cyan` 9단계, `gold` 9단계) | ✅ | `tailwind.config.cjs:41-83` |
| Semantic 토큰 (`success/warning/destructive/info`) | ✅ | Tailwind 기본 emerald/amber/red alias |
| DESIGN.md YAML+Markdown SSOT | ✅ | `docs/02-design/DESIGN.md` v1.0.1-alpha |
| Legacy 경고 주석 | ✅ | "Phase 2 에서 마이그레이션" 명시 |
| 신규 코드 Legacy 금지 규약 | ✅ | CLAUDE.md §Design System 반영 |

### Phase 2 대상 (본 Plan 범위)

| 대상 | 현황 | 조치 |
|------|------|------|
| `jways-*` 사용 | 207 occurrences, ~35 파일 | → `brand-blue-*` |
| `accent-*` 사용 | 55 occurrences, ~8 파일 | → `cyan-*` |
| `tailwind.config.cjs` Legacy 블록 | 잔존 | 제거 |

#### 사용 빈도 Top 파일 (추정)
- `src/features/quote/components/*.tsx` (InputSection/ResultSection/Widgets 등 ~25 파일)
- `src/pages/LandingPage.tsx`, `LoginPage.tsx`, `SignUpPage.tsx`
- `src/components/layout/Header.tsx`
- `src/features/quote/components/input-styles.ts`, `result-styles.ts` (공통 스타일 상수)

#### 토큰별 점유율 (상위)
```
 89  jways-500   → brand-blue-500
 87  jways-600   → brand-blue-600
 65  jways-700   → brand-blue-700
 54  jways-400   → brand-blue-400
 40  accent-500  → cyan-500
 37  jways-900   → brand-blue-900
 29  accent-600  → cyan-600
 20  jways-50    → brand-blue-50
 19  jways-300   → brand-blue-300
 15  jways-100   → brand-blue-100
```

## 3. 매핑 전략

### 3-1. `jways-*` → `brand-blue-*` (1:1, 동일 명도 단계)

| Legacy | New | 비고 |
|--------|-----|------|
| `jways-50` (#eff6ff) | `brand-blue-50` (#eef5fd) | 거의 동일 |
| `jways-100` (#dbeafe) | `brand-blue-100` (#d5e7fa) | 거의 동일 |
| `jways-200` (#bfdbfe) | `brand-blue-200` (#aacff4) | 약간 더 따뜻 |
| `jways-300` (#93c5fd) | `brand-blue-300` (#7fb7ee) | 약간 더 따뜻 |
| `jways-400` (#60a5fa) | `brand-blue-400` (#549fe8) | 미세 차이 |
| `jways-500` (#3b82f6) | `brand-blue-500` (#1D6FD1) | **주요 차이 — 브랜드 CTA 색** |
| `jways-600` (#2563eb) | `brand-blue-600` (#1759a7) | 약간 더 어두움 |
| `jways-700` (#1d4ed8) | `brand-blue-700` (#11437d) | 약간 더 어두움 |
| `jways-800` (#1e40af) | `brand-blue-800` (#0b2d54) | 진한 navy 계열 |
| `jways-900` (#1e3a8a) | `brand-blue-900` (#06182a) | 매우 어두움 |
| `jways-950` (#172554) | `brand-blue-950` (#030c15) | 매우 어두움 |

> ⚠️ 500/600/700/900 은 **BridgeLogis 팔레트가 Tailwind blue 보다 어둡고 채도가 낮음**. Dark mode surface 위에서 대비를 재검증 필요.

### 3-2. `accent-*` → `cyan-*` (1:1, cyan 팔레트 9단계)

| Legacy | New | 비고 |
|--------|-----|------|
| `accent-50` (#f0f9ff) | `cyan-50` (#e6f9fd) | 거의 동일 |
| `accent-100` (#e0f2fe) | `cyan-100` (#ccf3fb) | 거의 동일 |
| `accent-200` (#bae6fd) | `cyan-200` (#99e6f7) | 거의 동일 |
| `accent-300` (#7dd3fc) | `cyan-300` (#66daf3) | 거의 동일 |
| `accent-400` (#38bdf8) | `cyan-400` (#33c7ed) | 거의 동일 |
| `accent-500` (#0ea5e9) | `cyan-500` (#00B4D8) | **브랜드 시그니처 색** |
| `accent-600` (#0284c7) | `cyan-600` (#0090ad) | 약간 차이 |
| `accent-700` (#0369a1) | `cyan-700` (#006c82) | 약간 차이 |
| `accent-800` (#075985) | `cyan-800` (#004857) | 약간 차이 |
| `accent-900` (#0c4a6e) | `cyan-900` (#00242b) | 매우 어두움 |
| `accent-950` (#082f49) | ❌ `cyan` 에는 950 없음 → `cyan-900` 사용 | 단 2건 (검증 후 결정) |

## 4. 실행 계획 (단계별)

### Step 1 — 안전망 구축 (preparation)
1. 현재 브랜치에서 새 브랜치 분기: `feat/jways-brand-migration`
2. Visual baseline: `/`, `/login`, `/dashboard`, `/quote`, `/admin` 5개 페이지 스크린샷(light + dark)
3. 기존 테스트 스냅샷 baseline 확인: `npx vitest run`
4. `tsc --noEmit` 및 `npm run lint` 그린 상태 기록

### Step 2 — 기계적 치환 (automation)

Node/bash 기반 치환 스크립트 작성 후 일괄 적용:

```bash
# jways-* → brand-blue-* (950 → 950 포함)
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -print0 \
  | xargs -0 sed -i '' -E 's/jways-([0-9]+)/brand-blue-\1/g'

# accent-950 → cyan-900 (특수 case, 2건)
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 \
  | xargs -0 sed -i '' -E 's/accent-950/cyan-900/g'

# accent-{50..900} → cyan-{50..900}
find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -print0 \
  | xargs -0 sed -i '' -E 's/accent-([0-9]+)/cyan-\1/g'
```

> 대상: `src/**` 만. `docs/**`, `tailwind.config.cjs`, `*.md` 주석은 별도 수동 처리.

### Step 3 — 수동 보정
1. `tailwind.config.cjs` 주석에서 "jways-*/accent-*" 언급 정리 + Legacy 블록 삭제
2. `DESIGN.md` §colors Legacy 섹션 제거 + 버전 → `1.1.0`
3. `CLAUDE.md` Phase 1 non-breaking 문구 업데이트 → Phase 2 완료
4. `.commit_message.txt` 기록

### Step 4 — 검증
1. `grep -rn "jways-\|accent-" src/` → 0건 확인
2. `npm run lint` (--max-warnings 0) 통과
3. `npx tsc --noEmit` 통과
4. `npx vitest run` 전체 (1188 tests) pass
5. `npm run build` 성공
6. `npm run dev` → 스크린샷 5개 페이지 재촬영, baseline 과 비교
   - CTA(버튼) 색상이 #1D6FD1 로 **의도된 변경** 확인
   - Dark mode 대비 이슈 없는지 확인 (특히 `jways-900/800` 사용 영역)
   - WCAG AA 대비(4.5:1) 유지 여부 육안 + 필요시 axe DevTools

### Step 5 — Hotspot 수동 검수 (High-risk)
Light/Dark 양쪽에서 육안 검수 필수 영역:
- `LandingPage.tsx` hero/CTA (브랜드 첫인상)
- `CarrierComparisonCard`, `KeyMetricsGrid` (`jways-500/600/700` 다수)
- `Header.tsx` nav active state (`accent-500`)
- 위젯 9종(`ExchangeRateWidget` 등) — `jways-400/500` 기반 액센트

## 5. 영향도 / 리스크

| 영역 | 리스크 | 완화책 |
|------|--------|--------|
| 시각적 breaking change | CTA/하이라이트 색이 눈에 띄게 진해짐 (#3b82f6 → #1D6FD1) | 의도된 변경 — BridgeLogis 브랜드 정본. 스크린샷 diff 로 비정상 감지만 확인 |
| Dark mode 대비 저하 | `brand-blue-800/900` 이 Tailwind blue 대비 훨씬 어두움 → navy 위에서 가독성 저하 가능 | Hotspot 수동 검수 + 필요시 해당 사용 건만 `brand-blue-300/400` 으로 격상 |
| Tailwind JIT cache | config 변경 후 stale class 유지 가능 | `rm -rf node_modules/.vite && npm run dev` |
| 스냅샷 테스트 실패 | 색상 class 명이 포함된 스냅샷 업데이트 필요 | `npx vitest run -u` (변경 내역 검토 후) |
| `sed` 실수 | `accent-950 → cyan-950` 로 잘못 치환 시 Tailwind 미정의 class (빌드는 통과, 런타임 투명) | Step 2 에서 `accent-950` 를 **먼저** `cyan-900` 으로 치환하도록 순서 고정 |
| 외부 배포 (Vercel auto-deploy on main) | 머지 즉시 프로덕션 브랜드 색상 변경 | 별도 브랜치에서 작업, PR 리뷰 후 머지 |

## 6. 성공 지표

- [ ] `grep -rn "jways-\|accent-" src/` → 0건
- [ ] `tailwind.config.cjs` 에서 `jways`, `accent` 블록 제거 (약 26 라인 순삭제)
- [ ] `DESIGN.md` 버전 1.1.0 (Legacy 섹션 삭제)
- [ ] `npm run lint && npx tsc --noEmit && npx vitest run && npm run build` 전부 통과
- [ ] 5개 페이지 스크린샷 육안 검수 완료 (light + dark)
- [ ] `.commit_message.txt` 한국어 이모지 포함 메시지 기록

## 7. 비범위 (Out of scope)

- 신규 컴포넌트 추가 / UI 레이아웃 변경
- DESIGN.md Phase 3 작업 (WCAG lint · 토큰 export CLI) — 별도 Plan
- Tailwind v4 업그레이드 검토 — 별도 Plan
- `CHART_COLORS` HEX 직접 사용 영역(`src/lib/chartColors.ts`) 리팩터링 — 본 작업은 **Tailwind class** 만 대상
- Backend(Rails) 변경 사항 없음
- i18n 번역 키 변경 없음

## 8. 다음 단계

1. 본 Plan 리뷰 후 `/pdca design jways-brand-migration` 으로 진행
2. Design 단계에서 ①치환 스크립트 프로토타입 ②Hotspot 검수 체크리스트 ③스냅샷 업데이트 전략 상세화
