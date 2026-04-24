# Design: jways-brand-migration (DESIGN.md Phase 2)

> Plan 참조: `docs/01-plan/features/jways-brand-migration.plan.md`
> DESIGN.md SSOT: `docs/02-design/DESIGN.md` v1.0.1-alpha

## 1. 설계 개요

### 1-1. 현황 정량 (2026-04-24 측정)

| 구분 | occurrences | 파일 수 |
|------|:-----------:|:-------:|
| `jways-*` (`src/`) | **207** | 35+ |
| `accent-*` (`src/`) | **55** | 8 |
| **합계** | **262** | 약 40 |
| `dark:.*(jways|accent)` dark mode 조합 | **157** | - |
| `jways-{800,900,950}` 진한 톤 (dark 취약) | **45** | 15 |
| `accent-950` / `jways-950` 특수 case | 1건 (`jways-950` only, WelcomeBanner gradient) | 1 |
| 스냅샷 테스트 영향 | **0건** (`*.test.tsx` 에서 색상 클래스 없음) | 0 |

### 1-2. 파일별 영향도 Top 10

| Rank | 파일 | 건수 | 분류 |
|:----:|------|:----:|------|
| 1 | `src/components/layout/Header.tsx` | 17 | 🔴 Hotspot — Nav active state |
| 2 | `src/pages/guide/GuideVisuals.tsx` | 16 | 🟡 가이드 페이지 (낮은 트래픽) |
| 3 | `src/features/quote/components/widgets/AccountManagerWidget.tsx` | 14 | 🔴 Dashboard Widget |
| 4 | `src/pages/LandingPage.tsx` | 13 | 🔴 Hotspot — 브랜드 첫인상 |
| 5 | `src/pages/SignUpPage.tsx` | 12 | 🟡 Public page |
| 6 | `src/features/quote/components/widgets/NoticeWidget.tsx` | 12 | 🔴 Dashboard Widget |
| 7 | `src/pages/LoginPage.tsx` | 10 | 🟡 Public page |
| 8 | `src/features/quote/components/widgets/ExchangeRateCalculatorWidget.tsx` | 10 | 🔴 Dashboard Widget |
| 9 | `src/features/quote/components/widgets/WeatherWidget.tsx` | 8 | 🔴 Dashboard Widget |
| 10 | `src/features/admin/components/UserManagementWidget.tsx` | 8 | 🟡 Admin only |

## 2. 치환 스크립트 프로토타입

### 2-1. 스크립트 파일 (실행용)

`scripts/migrate-jways-to-brand.sh` (신규, 1회성 — 완료 후 삭제):

```bash
#!/usr/bin/env bash
# DESIGN.md Phase 2 — jways-*/accent-* → brand-blue-*/cyan-* 마이그레이션
# 실행 위치: 프로젝트 루트
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Phase 2 migration 시작"

# 대상 범위 (src/ 만. docs/, tailwind.config.cjs, *.md 는 수동 처리)
TARGETS=(src)
EXTENSIONS=(tsx ts css)

# ─── Pre-flight: 치환 전 카운트 ───
echo "▶ 치환 전 카운트:"
for ext in "${EXTENSIONS[@]}"; do
  cnt=$(grep -rhn "jways-\|accent-" "${TARGETS[@]}" --include="*.${ext}" 2>/dev/null | wc -l | tr -d ' ')
  echo "  .${ext}: ${cnt}"
done

# ─── Step 1. 특수 케이스 우선 처리 ───
# accent-950 → cyan-900 (cyan 팔레트에는 950 없음)
# jways-950 → brand-blue-950 (정상 매핑)
echo "▶ Step 1: accent-950 → cyan-900 (특수)"
find "${TARGETS[@]}" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -print0 \
  | xargs -0 -I{} sed -i '' 's/\baccent-950\b/cyan-900/g' {}

# ─── Step 2. jways-* → brand-blue-* (1:1) ───
echo "▶ Step 2: jways-{0..950} → brand-blue-{0..950}"
find "${TARGETS[@]}" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -print0 \
  | xargs -0 -I{} sed -i '' -E 's/\bjways-([0-9]+)\b/brand-blue-\1/g' {}

# ─── Step 3. accent-* → cyan-* (나머지 50~900) ───
echo "▶ Step 3: accent-{50..900} → cyan-{50..900}"
find "${TARGETS[@]}" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) -print0 \
  | xargs -0 -I{} sed -i '' -E 's/\baccent-([0-9]+)\b/cyan-\1/g' {}

# ─── Post-flight: 잔존 확인 ───
echo "▶ 치환 후 잔존 카운트 (0 이어야 성공):"
remaining=$(grep -rhn "jways-\|accent-" "${TARGETS[@]}" --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null | wc -l | tr -d ' ')
echo "  잔존: ${remaining}"

if [ "$remaining" != "0" ]; then
  echo "❌ 잔존 발견. 수동 점검 필요:"
  grep -rn "jways-\|accent-" "${TARGETS[@]}" --include="*.tsx" --include="*.ts" --include="*.css" 2>/dev/null | head -20
  exit 1
fi

echo "✅ 전체 치환 완료"
```

### 2-2. 안전 장치

- **`\b` word boundary**: `jways-500bold` 같은 오탐 방지 (현재 코드베이스에는 없지만 안전망)
- **치환 순서 고정**: `accent-950` → `cyan-900` 를 **먼저** 해야 Step 3 에서 `accent-950 → cyan-950` 오탐 방지
- **범위 한정**: `src/` 만. `tailwind.config.cjs` · `*.md` · `docs/` 는 수동
- **BSD sed `-i ''`**: macOS 환경. Linux 에서는 `sed -i` (공백 없이)
- **스크립트 자체를 커밋하지 않음**: 1회성. 실행 후 삭제 또는 `.gitignore` 처리

### 2-3. 드라이런 옵션

스크립트 실행 전 다음 명령으로 영향 미리 확인:

```bash
# jways-500 → brand-blue-500 치환 미리보기 (파일명 + 라인만)
grep -rn "\bjways-500\b" src/ --include="*.tsx" --include="*.ts" | head -30
# 치환될 최종 형태 미리보기
grep -rn "\bjways-500\b" src/ --include="*.tsx" --include="*.ts" | sed 's/jways-500/brand-blue-500/g' | head -30
```

## 3. Hotspot 검수 체크리스트

### 3-1. 🔴 Critical — Light + Dark 양쪽 필수 검수

| 파일 | 검수 항목 | 위험 요소 |
|------|----------|----------|
| `src/pages/LandingPage.tsx` | Hero CTA, gradient, 배경 | **브랜드 첫인상**. `jways-500`→`brand-blue-500` 변경으로 CTA가 어두워짐. 의도된 변경 |
| `src/components/layout/Header.tsx` | Nav active state, logo 색상, 드롭다운 | 전 페이지 공통. `accent-500` (active) 색 변화 |
| `src/features/dashboard/components/WelcomeBanner.tsx` | Gradient `from-gray-900 via-jways-950 to-gray-900` | **유일한 `jways-950` 사용처**. gradient 표현 변화 확인 |
| `src/features/quote/components/CarrierComparisonCard.tsx` | UPS/DHL 카드 하이라이트 | `jways-500/600/700` 집중 사용 |
| `src/features/quote/components/QuoteSummaryCard.tsx` | 저장된 견적 요약 | 다크 모드 위 대비 |
| `src/features/quote/components/CostBreakdownCard.tsx` | 비용 내역 | 다크 모드 위 대비 |
| 위젯 9종 (`ExchangeRateWidget`, `WeatherWidget`, `NoticeWidget`, `AccountManagerWidget`, `JetFuelWidget`, `ExchangeRateCalculatorWidget`, `FscRateWidget`, `TargetMarginRulesWidget`, `SurchargeManagementWidget`) | 위젯 헤더, live indicator, 수치 강조 | 대시보드에 동시 노출. 색 조화 확인 |

### 3-2. 🟡 Medium — Light 중심 검수

| 파일 | 검수 항목 |
|------|----------|
| `src/pages/LoginPage.tsx` | 로그인 폼 CTA |
| `src/pages/SignUpPage.tsx` | 가입 폼 CTA |
| `src/pages/guide/GuideVisuals.tsx` | 사용자 가이드 일러스트 |
| `src/features/admin/components/UserManagementWidget.tsx` | Admin 전용 — Admin 만 보임 |
| `src/features/admin/components/CustomerManagement.tsx` | Admin 전용 |

### 3-3. 🟢 Low — spot check 만

- `src/features/quote/components/input-styles.ts`, `result-styles.ts` (공통 스타일 상수) — 컴파일 타임 문자열
- 기타 단일 건 사용 파일

### 3-4. Dark mode 대비 재검증 (중요)

**위험**: `brand-blue-800/900` 은 Tailwind `blue-800/900` 대비 훨씬 어두움 (#0b2d54 vs #1e40af).
Navy 배경(#0A1628) 위에 얹힐 때 대비 저하 가능.

| Before (Legacy) | After (Brand) | 예상 이슈 | 검수 액션 |
|-----------------|---------------|----------|----------|
| `bg-jways-800 text-white` | `bg-brand-blue-800 text-white` | 배경이 navy 에 너무 가까워 윤곽 상실 | Light 배경 페이지는 무관, **dark mode 에서만** 육안 확인 |
| `text-jways-400 dark:text-jways-300` | `text-brand-blue-400 dark:text-brand-blue-300` | brand-blue-300/400 은 원본과 거의 동일 | ✅ 대체로 안전 |
| `border-jways-500/20` (alpha) | `border-brand-blue-500/20` | alpha 에서는 차이 거의 없음 | ✅ 안전 |
| `hover:bg-jways-700` | `hover:bg-brand-blue-700` | brand-blue-700 이 더 어두움 → hover 피드백 약해질 수 있음 | 🟡 spot check |

**대비 재검증 대상 45건** (`jways-{800,900,950}`) 이 포함된 15 파일 집중 확인:
- `CarrierComparisonCard`, `QuoteSummaryCard`, `CostBreakdownCard`, `result-styles.ts`
- `SaveQuoteButton`, 위젯 5종 (`ExchangeRateCalculator`, `JetFuel`, `ExchangeRate`, `AccountManager`, `Weather`, `Notice`)
- `CustomerManagement`, `RateTableViewer`, `WelcomeBanner`, `QuoteHistoryPage`

## 4. 단계별 실행 순서

### Step 1 — Baseline 기록 (10분)
```bash
cd ~/Developer/Projects/smart-quote-main
git checkout -b feat/jways-brand-migration

# 검증 baseline
npm run lint
npx tsc --noEmit
npx vitest run 2>&1 | tail -5

# 스크린샷: npm run dev 후 수동 또는 playwright
# 대상: /, /login, /dashboard, /quote, /admin × light/dark
```

### Step 2 — 스크립트 배치 & 실행 (5분)
```bash
mkdir -p scripts
# 위 2-1 스크립트 저장
chmod +x scripts/migrate-jways-to-brand.sh
./scripts/migrate-jways-to-brand.sh
```

### Step 3 — 수동 보정 (10분)

3-a. `tailwind.config.cjs` — Legacy 블록 삭제

```diff
-// ─── Legacy (Phase 1 non-breaking 유지, Phase 2에서 brand-blue 로 마이그레이션) ───
-jways: {
-  50: '#eff6ff',
-  …
-  950: '#172554',
-},
-accent: {
-  50: '#f0f9ff',
-  …
-  950: '#082f49',
-},
```

헤더 주석에서 "3. Legacy — jways-*/accent-* …" 라인 제거. Brand / Semantic / Neutral 3 레이어로 정리.

3-b. `docs/02-design/DESIGN.md`

- 버전: `1.0.1-alpha` → **`1.1.0`** (Phase 2 완료, breaking 아님 — 레거시 제거)
- `colors` YAML 에서 Legacy 섹션 제거
- 본문에서 "Phase 1 non-breaking" 관련 문구 **"Phase 2 완료"** 로 갱신
- `description` YAML 문자열에서 Phase 1/2 언급 정리

3-c. `CLAUDE.md` §Design System

```diff
-- **Phase 1 non-breaking 상태** (2026-04-24) — 기존 `jways-*`/`accent-*`/기본 `blue-*`/`sky-*` 는 유지, 신규 코드에서 **사용 금지**
+- **Phase 2 완료** (2026-04-24) — 레거시 `jways-*`/`accent-*` 제거. Tailwind 기본 `blue-*`/`sky-*` 는 여전히 **사용 금지**
```

3-d. `.commit_message.txt`
```
🎨 refactor: DESIGN.md Phase 2 완료 — jways-* → brand-blue-*, accent-* → cyan-* 전면 이행 (262건 치환 + Tailwind Legacy 블록 제거)
```

### Step 4 — 자동 검증 (10분)

```bash
# 4-a. grep 검증
grep -rn "jways-\|accent-" src/ --include="*.tsx" --include="*.ts" --include="*.css" | wc -l
# 기대: 0

# 4-b. type/lint
npx tsc --noEmit
npm run lint

# 4-c. 테스트
npx vitest run
# 기대: 1188/1188 pass (스냅샷 영향 0건 확인됨)

# 4-d. 빌드
npm run build
# 기대: 성공. Tailwind 의 undefined class 경고 없음
```

### Step 5 — 수동 Visual 검수 (30분)

```bash
npm run dev
```

체크리스트 (§3.1 Critical 11개 항목):
- [ ] Landing hero — light/dark 모두 CTA 색상 확인 (#1D6FD1 예상)
- [ ] Header nav active state — light/dark
- [ ] WelcomeBanner gradient — `via-brand-blue-950` 적용 결과 확인 (#030c15 — 매우 어두움, 기존 #172554 대비 훨씬 어두워질 수 있음. 필요시 `via-brand-blue-800` 로 **수동 다운그레이드** 고려)
- [ ] CarrierComparisonCard UPS/DHL 구분색 — 여전히 시각적으로 구분되는지
- [ ] 위젯 9종 — 각 위젯 header / live indicator / 강조 수치
- [ ] Dark mode 45건 hotspot — navy 위에서 윤곽/가독성 유지
- [ ] Member 로그인 후 `/dashboard` 풀 페이지
- [ ] Admin 로그인 후 `/admin` 풀 페이지

## 5. 롤백 전략

- 브랜치 단위 작업이므로 `git reset --hard HEAD@{1}` 또는 브랜치 삭제로 롤백
- 단일 커밋 전략 권장: **"1 commit = 전체 마이그레이션"** — 부분 롤백은 의미 없음
- 머지 전 반드시 PR + 시각적 diff 리뷰

## 6. 예외 & 수동 개입 포인트

| 케이스 | 조치 |
|--------|------|
| `WelcomeBanner` gradient `via-jways-950 → via-brand-blue-950` 가 과도하게 어두움 | 육안 확인 후 `via-brand-blue-900` 또는 `via-brand-blue-800` 로 수동 조정 |
| Header `accent-500` nav active underline → `cyan-500` | cyan 이 더 밝은 청록 → 시안 강조가 디자인 의도와 맞는지 확인. 필요시 `brand-blue-500` 로 변경 |
| Admin widget 에서 `accent-*` (sky 계열) 로 UI 상태 구분 (e.g. primary vs secondary) | cyan 으로 이행 후에도 구분 유지되는지 검수 |
| `dark:via-jways-950` 단일 사용 | gradient 이음새 자연스러운지 확인 |

## 7. 산출물

1. **코드 변경**:
   - `src/**` 262건 class 치환
   - `tailwind.config.cjs` Legacy 블록 삭제 (약 26라인 감소)
2. **문서 변경**:
   - `docs/02-design/DESIGN.md` v1.1.0 (Legacy 섹션 삭제)
   - `CLAUDE.md` §Design System 문구 업데이트
3. **스크립트** (1회성, 완료 후 삭제):
   - `scripts/migrate-jways-to-brand.sh`
4. **커밋 메시지**: `.commit_message.txt` 한국어 이모지 포함

## 8. 완료 조건 (DoD 재확인)

- [ ] `grep -rn "jways-\|accent-" src/` → 0
- [ ] `tailwind.config.cjs` `jways`/`accent` 블록 제거
- [ ] `DESIGN.md` v1.1.0 (Legacy 섹션 삭제)
- [ ] `npm run lint` 통과 (--max-warnings 0)
- [ ] `npx tsc --noEmit` 통과
- [ ] `npx vitest run` 1188/1188 통과
- [ ] `npm run build` 성공
- [ ] Critical hotspot 11항목 시각 검수 완료
- [ ] `.commit_message.txt` 기록

## 9. 작업 추정

| 단계 | 소요 |
|------|-----:|
| Step 1 Baseline | 10분 |
| Step 2 스크립트 실행 | 5분 |
| Step 3 수동 보정 | 10분 |
| Step 4 자동 검증 | 10분 |
| Step 5 Visual 검수 | 30분 |
| 예외 대응 (예상) | 15분 |
| **합계** | **약 80분** |

## 10. 다음 단계

Design 리뷰 후 `/pdca do jways-brand-migration` 진행. Do 단계에서 §4 Step 1~5 를 순차 실행하며 실제 변경을 적용.
