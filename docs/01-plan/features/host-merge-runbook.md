# Host Merge Runbook — Phase 1.5 SEO Infra + Build Chunk Split → main

> **목적**: VM에서 `.git/index.lock`을 해제할 수 없어 git write 명령이 막힘. 호스트(macOS) 터미널에서 사용자가 직접 실행해야 하는 머지 시퀀스를 정리한다.
> **마지막 갱신**: 2026-05-01 / 작성자: Claude (Cowork) + 재홍

---

## 1. 사전 진단 결과

| 항목 | 값 |
|---|---|
| 활성 브랜치 (VM) | `feature/build-chunk-split` |
| 마지막 커밋 | `44a39ad ⚡ perf(build): 메인 번들 760KB→86KB` |
| 미커밋 변경 | `src/index.tsx` (Prettier 포맷팅만) |
| `.git/index.lock` | **VM 제거 불가** (Operation not permitted) |
| origin/main | `82e5c4b 📋 docs: smart-quote-monorepo-cleanup Design v0.2` |
| origin/feature/phase15-seo-infra | `323ea9a` (16 files +1318/-11) |
| origin/feature/build-chunk-split | `44a39ad` (perf 작업) |
| GitHub PR | **PR #3** = phase15-seo-infra (이미 열려 있을 가능성 높음) |

두 브랜치 모두 **origin에 이미 푸시된 상태**라 GitHub UI에서 PR 머지만 하면 main 반영 완료.

---

## 2. 머지 순서 (필수)

```
main (82e5c4b)
  │
  ├─ STEP 1: feature/phase15-seo-infra (PR #3) → main   ← Squash & merge
  │
  └─ STEP 2: feature/build-chunk-split → main           ← rebase 후 새 PR 머지
```

**왜 이 순서인가?**
- phase15-seo-infra 가 먼저 들어가야 Lighthouse SEO ≥ 0.90 게이트가 main 에 적용됨.
- 그 다음 build-chunk-split 이 그 위에서 검증되면 perf 회귀가 SEO 점수에 미치는 영향까지 자동 체크 가능.

---

## 3. 호스트 실행 명령 시퀀스

### Step 0 — lock 해제 + 미커밋 정리

```bash
# 호스트(macOS) 터미널
cd /Users/jaehong/Developer/Projects/smart-quote-main

# .git/index.lock 제거 (호스트 권한이면 즉시 가능)
rm -f .git/index.lock

# 현재 상태 확인
git status

# src/index.tsx 미커밋 변경(Prettier 포맷)을 build-chunk-split에 정리
# 옵션 A: 별도 커밋으로 보존
git add src/index.tsx
git commit -m "💄 chore: src/index.tsx prettier auto-format (trailing comma + EOL)"

# 옵션 B: 만약 perf(build) 커밋의 일부였다면 amend
# git commit --amend --no-edit
```

### Step 1 — phase15-seo-infra → main (PR #3 머지)

GitHub UI에서:

1. https://github.com/jlinsights/smart-quote/pull/3 접속
2. CI 결과 확인 (Vercel preview, Lighthouse SEO ≥ 0.90, seo-checks 통과)
3. **Squash and merge** 선택 (Lighthouse 게이트 통과 시에만)
4. 머지 커밋 메시지 예시:
   ```
   🔍 feat(seo): Phase 1.5 SEO 인프라 + /quote deep-link prefill (#3)

   - public/robots.txt + dynamic api/sitemap.ts (Vercel Edge)
   - index.html JSON-LD (Organization/WebSite) inline
   - lighthouserc.json SEO ≥ 0.90 error gate
   - vercel.json /sitemap.xml rewrite + headers
   - src/components/seo/JsonLdNewsArticle.tsx
   - src/features/quote/hooks/useQuoteDeepLink.{ts,test.ts}
   - .github/workflows/seo-checks.yml (6 jobs)
   - scripts/seo-audit.mjs
   ```
5. PR 머지 후 origin/main 갱신 확인

### Step 2 — main pull + build-chunk-split rebase

```bash
# main 최신화
git checkout main
git pull origin main

# build-chunk-split을 main 위로 rebase
git checkout feature/build-chunk-split
git rebase main

# 충돌 시: 파일 수정 → git add → git rebase --continue
# 충돌 가능 영역:
#   - vite.config.ts (perf manualChunks vs SEO 빌드 메타)
#   - src/index.tsx (perf Sentry idle defer vs prettier)
#   - package.json (둘 다 수정 가능성)

# rebase 완료 후 force push
git push origin feature/build-chunk-split --force-with-lease
```

### Step 3 — build-chunk-split PR 생성 + 머지

```bash
# GitHub CLI로 PR 생성 (gh가 설치되어 있다면)
gh pr create \
  --base main \
  --head feature/build-chunk-split \
  --title "⚡ perf(build): 메인 번들 760KB→86KB (manualChunks + Sentry defer + LandingPage lazy)" \
  --body-file docs/01-plan/features/build-chunk-split.plan.md
```

또는 GitHub UI에서:
1. https://github.com/jlinsights/smart-quote/compare/main...feature/build-chunk-split 접속
2. New PR → 본문에 build-chunk-split.plan.md 요약 붙여넣기
3. CI 통과 확인 (특히 Lighthouse SEO ≥ 0.90 — phase15 가 main 에 들어간 뒤에 측정)
4. **Squash and merge**

### Step 4 — Vercel 배포 검증

main 머지 직후 Vercel 자동 배포가 트리거됨. 다음을 확인:

```bash
# 배포 URL 접근 가능 확인
curl -I https://bridgelogis.com/robots.txt
curl -I https://bridgelogis.com/sitemap.xml
curl -s https://bridgelogis.com/sitemap.xml | head -20

# JSON-LD 검증
curl -s https://bridgelogis.com/ | grep -o 'application/ld+json' | wc -l
# 기댓값: 2 (Organization + WebSite)

# Lighthouse 자동 측정 (선택)
npx lighthouse https://bridgelogis.com/ \
  --only-categories=seo \
  --chrome-flags="--headless" \
  --output=json \
  --output-path=./lighthouse-prod-seo.json
cat lighthouse-prod-seo.json | jq '.categories.seo.score'
# 기댓값: 0.90 이상
```

---

## 4. 충돌 시 대응 매뉴얼

### 4-1. `vite.config.ts` 충돌

phase15 가 vite 빌드 메타를 건드리지는 않지만, build-chunk-split 의 `manualChunks` 함수가 추가됐으므로 main에서 충돌이 안 날 가능성이 높습니다. 충돌이 나면 **build-chunk-split 쪽 (HEAD)** 을 채택하고 phase15 의 SEO 관련 메타가 있다면 함께 보존.

### 4-2. `src/index.tsx` 충돌

build-chunk-split 의 Sentry idle defer 로직과 phase15 가 충돌할 가능성은 낮음(phase15 는 index.tsx 미수정). 그래도 충돌이 나면 **build-chunk-split 쪽 유지** + JSON-LD 인라인은 `index.html` 에 있으므로 영향 없음.

### 4-3. `package.json` 충돌

phase15 는 `"scripts"` 에 `seo:audit`, `seo:baseline`, `seo:compare` 추가. build-chunk-split 은 의존성/스크립트 변경 없을 가능성. 충돌 시 양쪽을 모두 살린 합집합으로 해결.

### 4-4. `lighthouserc.json` 충돌

build-chunk-split 은 lighthouserc 미수정. phase15 는 SEO ≥ 0.90 error 강화. **phase15 쪽 채택**.

---

## 5. 롤백 (Plan B)

머지 후 프로덕션에서 문제 발생 시:

```bash
# Option 1: PR revert (GitHub UI)
# 머지 커밋 페이지 → "Revert" 버튼 → 자동 revert PR 생성 → 머지

# Option 2: 로컬 revert
git checkout main
git pull origin main
git revert <merge-commit-sha>
git push origin main

# Option 3: hard reset (force, 위험)
git checkout main
git reset --hard 82e5c4b
git push origin main --force-with-lease
```

권장: **Option 1 (GitHub UI revert)** — 추적성 확보.

---

## 6. 검증 체크리스트

### 6-1. phase15 머지 직후

- [ ] `https://bridgelogis.com/robots.txt` 200 응답
- [ ] `https://bridgelogis.com/sitemap.xml` 200 + valid XML
- [ ] `https://bridgelogis.com/` HTML 에 `application/ld+json` 2개
- [ ] Lighthouse SEO 점수 ≥ 0.90
- [ ] `/quote?origin=KR&dest=US&weight=10` 접근 시 폼 자동 채움 확인
- [ ] GA4 / GSC 에서 sitemap 제출 (수동)

### 6-2. build-chunk-split 머지 직후

- [ ] 메인 번들 크기 < 100KB (네트워크 탭 확인)
- [ ] LandingPage / Sentry idle defer 정상 동작
- [ ] Lighthouse SEO 점수 유지 ≥ 0.90 (perf 회귀가 SEO 영향 주지 않는지 확인)
- [ ] /dashboard, /quote, /admin, /schedule 4개 라우트 정상

---

## 7. 다음 단계 (이 런북 완료 후)

→ **feature/insights-scaffold** 브랜치 생성

```bash
git checkout main
git pull origin main
git checkout -b feature/insights-scaffold
```

이 브랜치 위에서 다음 작업이 진행됨:
- `apps/insights/` Next.js 14 App Router 스캐폴드 (9 files)
- `scripts/pillar-validate.mjs` (12-point validator)
- `scripts/pillar-patch.mjs` (auto-patcher)
- `scripts/rss-healthcheck.mjs` (8 RSS feed validator)
- `package.json` "workspaces": ["apps/*"] + insights/pillar/rss 스크립트
- `apps/insights/lib/components/Disclaimer.tsx` + `RelatedPillars.tsx` + `Disclaimer.test.tsx`

→ Phase 3 Pillar 콘텐츠 발행 사이클 시작 (output/phase3/pillars/ 의 20개 MDX 사용)

---

## 8. 참고 — VM에서 실행 가능한 작업

VM(이 세션)은 다음만 가능:
- ✅ git read 명령 (status, log, diff, ls-remote)
- ✅ 파일 작성/수정 (Write/Edit)
- ✅ 빌드/테스트 명령 (`npm run build`, `vitest run`) — 단 .git/index.lock 영향 없는 한
- ❌ git checkout / branch / commit / merge / push / rebase

호스트 작업이 끝나고 main 이 갱신되면, VM 에서 다음 작업 (`feature/insights-scaffold`) 을 자동화 가능.

---

**End of Runbook**
