# package.json 머지 가이드 — feature/insights-scaffold

> 이 가이드는 `feature/phase15-seo-infra` 가 main 에 머지된 **이후**, `feature/insights-scaffold` 브랜치에서 적용되어야 합니다.
> phase15 머지 전에 적용하면 `seo:*` 스크립트 충돌이 발생할 수 있습니다.

---

## 적용 시점

```
✅ feature/phase15-seo-infra → main  (PR #3 머지 완료)
✅ feature/build-chunk-split → main  (rebase 후 PR 머지)
└─ git checkout -b feature/insights-scaffold   ← 이 시점부터 아래 적용
```

---

## 적용 후 기대되는 package.json (전체)

```json
{
  "name": "j-ways-smart-quote-system",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "npx playwright test",
    "seo:audit": "node scripts/seo-audit.mjs",
    "seo:baseline": "node scripts/seo-audit.mjs --baseline",
    "seo:compare": "node scripts/seo-audit.mjs --compare",
    "pillar:validate": "node scripts/pillar-validate.mjs",
    "pillar:patch": "node scripts/pillar-patch.mjs",
    "rss:healthcheck": "node scripts/rss-healthcheck.mjs",
    "insights:dev": "npm run dev -w @bridgelogis/insights",
    "insights:build": "npm run build -w @bridgelogis/insights",
    "insights:type-check": "npm run type-check -w @bridgelogis/insights",
    "insights:test": "npm run test -w @bridgelogis/insights"
  }
}
```

(dependencies / devDependencies 는 변경하지 않습니다 — apps/insights 내부에서 자체 관리)

---

## 추가해야 할 항목 (delta)

### 1. 최상위 `workspaces` 키 (신규)

```json
"workspaces": ["apps/*"],
```

**위치**: `"type": "module",` 다음 줄.

### 2. `scripts` 섹션에 7개 스크립트 추가

phase15 머지 후 이미 있는 항목 (수정하지 않음):
```json
"seo:audit": "node scripts/seo-audit.mjs",
"seo:baseline": "node scripts/seo-audit.mjs --baseline",
"seo:compare": "node scripts/seo-audit.mjs --compare"
```

이 뒤에 추가:
```json
"pillar:validate": "node scripts/pillar-validate.mjs",
"pillar:patch": "node scripts/pillar-patch.mjs",
"rss:healthcheck": "node scripts/rss-healthcheck.mjs",
"insights:dev": "npm run dev -w @bridgelogis/insights",
"insights:build": "npm run build -w @bridgelogis/insights",
"insights:type-check": "npm run type-check -w @bridgelogis/insights",
"insights:test": "npm run test -w @bridgelogis/insights"
```

---

## 호스트 적용 명령

```bash
# feature/insights-scaffold 브랜치에서
cd /Users/jaehong/Developer/Projects/smart-quote-main

# package.json 수동 편집 후 검증
node -e "JSON.parse(require('fs').readFileSync('package.json'))" && echo "✅ valid JSON"

# workspaces 인식 확인
npm ls --workspaces --depth=0 2>&1 | head -10
# 기댓값: @bridgelogis/insights 표시

# apps/insights 의존성 설치
npm install
# 기댓값: apps/insights/node_modules/ 생성
```

---

## 검증

```bash
# 신규 스크립트 동작 확인 (apps/insights 가 있는 디렉터리에서만 실행)
npm run pillar:validate -- --dir=output/phase3/pillars
npm run rss:healthcheck                        # ⚠️ 외부 RSS 호출 — CI 에선 옵셔널
npm run insights:type-check                    # apps/insights TS 검증
npm run insights:build                         # 프로덕션 빌드 (basePath /insights)
```

---

## 트러블슈팅

### `workspace 'apps/insights' not found`

apps/insights/package.json 의 `name` 이 `@bridgelogis/insights` 가 아닌 경우 발생.
→ apps/insights/package.json 의 `name` 필드 확인.

### `next: command not found`

apps/insights 의존성이 설치되지 않음.
→ 루트에서 `npm install` 실행 (workspaces 가 있으면 자동으로 apps/insights 의존성도 설치).

### `seo:audit` 와 `pillar:validate` 충돌

scripts/seo-audit.mjs 는 phase15 에서 들어왔고 pillar-validate 는 이 브랜치에서 추가됨.
→ 두 파일이 모두 scripts/ 에 존재하는지 확인 (`ls scripts/`).

---

## 롤백

`feature/insights-scaffold` 브랜치 자체를 삭제 (main 에 영향 없음):

```bash
git checkout main
git branch -D feature/insights-scaffold
git push origin --delete feature/insights-scaffold
```
