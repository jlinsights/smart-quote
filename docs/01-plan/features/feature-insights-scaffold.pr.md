# PR: feature/insights-scaffold — Insights 워크스페이스 + Pillar/RSS 운영 도구

> 이 문서는 GitHub PR 본문 초안입니다. 호스트에서 PR 생성 시 그대로 복사해서 사용하세요.

---

## 요약

`feature/phase15-seo-infra`(SEO 인프라, PR #3) 머지 이후, **Insights 콘텐츠 발행 워크플로**를 가능하게 하는 두 번째 PR입니다.

- ✨ **`apps/insights/`** Next.js 14 App Router 워크스페이스 스캐폴드 추가 (basePath `/insights`)
- ✨ **`scripts/pillar-validate.mjs`** 12-point Pillar MDX 검증기
- ✨ **`scripts/pillar-patch.mjs`** AI/Disclaimer/RelatedPillars 자동 패처
- ✨ **`scripts/rss-healthcheck.mjs`** NoticeWidget RSS 피드 헬스체크 (8 feeds)
- 🔧 **`package.json`** 워크스페이스 + 7개 스크립트 추가 (수동 패치 — 머지 가이드 참조)
- 📋 **운영 문서** 호스트 머지 런북 + package.json 머지 가이드

## 변경 파일 (14개 신규, 1개 수정)

```
apps/insights/
├── README.md
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── lib/components/
│   ├── Disclaimer.test.tsx     # vitest 22 테스트 케이스
│   ├── Disclaimer.tsx          # 4 variant × 2 lang 면책 컴포넌트
│   └── RelatedPillars.tsx      # 연관 Pillar 카드 그리드
├── next.config.mjs             # basePath /insights, MDX, 보안 헤더
├── package.json                # @bridgelogis/insights v0.1.0
└── tsconfig.json               # 워크스페이스 TS 설정

scripts/
├── pillar-validate.mjs         # 12-point validator (CLI + JSON)
├── pillar-patch.mjs            # AI/Disclaimer/Related 자동 패처
└── rss-healthcheck.mjs         # 8 RSS feed 검사 (CI 옵셔널)

docs/01-plan/features/
├── host-merge-runbook.md
├── insights-scaffold-package-json.merge.md
└── feature-insights-scaffold.pr.md   # 이 문서

package.json (수정)             # workspaces + 7 scripts (수동 패치)
```

## 검증 결과

### Pillar Validator (output/phase3/pillars 20개 파일)

```
📋 Pillar Validator — 12-point check on 20 file(s)
✅ PASS  12/12  output/phase3/pillars/01-gssa-complete-guide.en.mdx
✅ PASS  12/12  output/phase3/pillars/01-gssa-complete-guide.ko.mdx
... (생략)
✅ PASS  12/12  output/phase3/pillars/10-ocean-freight-scfi-ccfi.ko.mdx
📊 Summary: 20 PASS / 0 FAIL (total 20)
```

20/20 PASS — Phase 3 콘텐츠가 발행 직전 상태임을 확인.

### Pillar Patcher (dry-run)

```
📊 Summary: 19 would-patch / 1 skipped (total 20)
```

(dry-run 결과 — 실제 콘텐츠는 검증 통과 상태이므로 운영상 패치 불필요. patcher는 향후 신규 Pillar 추가 시 사용)

### RSS Healthcheck

```
📊 Summary: 4 OK / 0 stale / 4 fail (total 8)
```

4개 외부 RSS 피드(STAT Trade Times, IATA Pressroom, KOTRA News, Shippers Journal)는 차단·404 응답으로 실패. CI 에서 **`continue-on-error: true`** 옵셔널 잡으로 처리 권장.

### Syntax / JSON

- ✅ apps/insights/{package.json, tsconfig.json} JSON valid
- ✅ scripts/{pillar-validate, pillar-patch, rss-healthcheck}.mjs syntax OK
- ✅ apps/insights/next.config.mjs syntax OK

### 미실행 (호스트 의존)

- `npm install` (워크스페이스 의존성 설치) — 호스트에서 실행 필요
- `npm run insights:type-check` — 호스트 npm install 후 가능
- `npm run insights:build` — 호스트 npm install 후 가능
- `vitest run apps/insights/lib/components/Disclaimer.test.tsx` — 호스트 npm install 후 가능

## 머지 전 호스트 작업 체크리스트

호스트 (macOS) 터미널에서:

- [ ] PR #3 (feature/phase15-seo-infra) main 머지 완료
- [ ] PR #4 (feature/build-chunk-split) main 머지 완료
- [ ] `git checkout main && git pull origin main`
- [ ] `git checkout -b feature/insights-scaffold`
- [ ] 14개 untracked 파일이 새 브랜치에 따라옴 (`git status` 확인)
- [ ] `package.json` 수동 패치 (`docs/01-plan/features/insights-scaffold-package-json.merge.md` 참조)
- [ ] `npm install` (워크스페이스 의존성 설치)
- [ ] `npm run insights:type-check` PASS
- [ ] `npm run insights:build` PASS
- [ ] `npm run pillar:validate -- --dir=output/phase3/pillars` 20/20 PASS
- [ ] `git add` + `git commit` + `git push -u origin feature/insights-scaffold`

## 머지 후 효과

1. `output/phase3/pillars/*.mdx` 콘텐츠를 `apps/insights/content/{ko,en}/pillars/` 로 이동하면 즉시 발행 가능 (별도 PR)
2. CI 의 `pillar:validate` 잡이 모든 신규 Pillar 에 자동 적용됨
3. NoticeWidget RSS 갱신 모니터링 (주 1회 정기 잡)
4. `apps/insights/lib/components/Disclaimer` + `RelatedPillars` 를 MDX에서 직접 import 가능

## 영향 범위 / 위험

| 항목 | 평가 |
|---|---|
| 메인 SPA (`bridgelogis.com/`) | 영향 없음 — `/insights` 는 별도 워크스페이스 |
| 기존 라우트 (`/quote`, `/dashboard`) | 영향 없음 |
| 빌드 시간 | `+1~2분` (apps/insights 별도 빌드) |
| 번들 크기 | 영향 없음 — 메인 SPA 와 분리됨 |
| Vercel 배포 | apps/insights 빌드는 별도 배포 단위로 설정 필요 (다음 PR) |

## 다음 PR 후보

1. **콘텐츠 이전 PR**: `output/phase3/pillars/*.mdx` → `apps/insights/content/{ko,en}/pillars/`
2. **Vercel 배포 설정 PR**: `apps/insights/` 별도 배포 (또는 main 도메인 `/insights/` rewrite)
3. **MDX 라우터 PR**: `app/pillars/[slug]/page.tsx` 동적 라우팅 + JSON-LD `NewsArticle`
4. **OG 이미지 PR**: `app/api/og/route.tsx` (`@vercel/og`)

## 롤백

```bash
git checkout main
git branch -D feature/insights-scaffold
git push origin --delete feature/insights-scaffold
```

(main 에 영향 없음 — 새 워크스페이스 전체가 별도 디렉터리이므로 단순 삭제 가능)

---

## 호스트 실행 명령 시퀀스

### 0. 사전 작업 (PR #3, #4 머지 완료 후)

```bash
cd /Users/jaehong/Developer/Projects/smart-quote-main
rm -f .git/index.lock
git status
```

### 1. main 최신화 + 새 브랜치

```bash
git checkout main
git pull origin main
git checkout -b feature/insights-scaffold
```

### 2. 14개 신규 파일 스테이징

```bash
git add apps/insights \
        scripts/pillar-validate.mjs \
        scripts/pillar-patch.mjs \
        scripts/rss-healthcheck.mjs \
        docs/01-plan/features/host-merge-runbook.md \
        docs/01-plan/features/insights-scaffold-package-json.merge.md \
        docs/01-plan/features/feature-insights-scaffold.pr.md
```

### 3. package.json 수동 패치 + 스테이징

`docs/01-plan/features/insights-scaffold-package-json.merge.md` 의 가이드대로 수정 후:

```bash
git add package.json
node -e "JSON.parse(require('fs').readFileSync('package.json'))" && echo "✅ valid"
```

### 4. 의존성 설치 + 검증

```bash
npm install                                                       # workspaces 인식
npm run pillar:validate -- --dir=output/phase3/pillars            # 20 PASS 확인
npm run insights:type-check                                       # apps/insights TS
npm run insights:build                                            # 프로덕션 빌드
npx vitest run apps/insights/lib/components/Disclaimer.test.tsx   # 22 케이스 PASS
```

### 5. 커밋

```bash
echo "✨ feat(insights): apps/insights 스캐폴드 + pillar/rss 운영 도구 + workspaces 통합" > .commit_message.txt
git add .commit_message.txt

git commit -m "$(cat <<'COMMIT_EOF'
✨ feat(insights): apps/insights 스캐폴드 + pillar/rss 운영 도구 + workspaces 통합

- apps/insights/ Next.js 14 App Router 워크스페이스 (basePath /insights)
  - app/layout.tsx, app/page.tsx
  - lib/components/Disclaimer.tsx (4 variant × 2 lang)
  - lib/components/RelatedPillars.tsx
  - lib/components/Disclaimer.test.tsx (22 vitest 케이스)
  - next.config.mjs, tsconfig.json, package.json, README.md
- scripts/pillar-validate.mjs — 12-point Pillar MDX 검증기 (output/phase3/pillars 20/20 PASS)
- scripts/pillar-patch.mjs — AI/Disclaimer/RelatedPillars 자동 패처
- scripts/rss-healthcheck.mjs — NoticeWidget 8 RSS feed 헬스체크
- package.json — workspaces ["apps/*"] + insights:* / pillar:* / rss:* 7개 스크립트
- docs/01-plan/features/ — 호스트 머지 런북, package.json 머지 가이드, PR 본문

검증:
- pillar-validate: output/phase3/pillars 20/20 PASS (12/12 each)
- pillar-patch dry-run: 19 would-patch / 1 NO-OP
- rss-healthcheck: 4/8 OK (외부 피드 4개 차단/404, CI 옵셔널 잡 권장)
- JSON 유효성, .mjs syntax 모두 OK
COMMIT_EOF
)"
```

### 6. 푸시 + PR 생성

```bash
git push -u origin feature/insights-scaffold

# GitHub CLI 사용 가능 시
gh pr create \
  --base main \
  --head feature/insights-scaffold \
  --title "✨ feat(insights): apps/insights 스캐폴드 + pillar/rss 운영 도구" \
  --body-file docs/01-plan/features/feature-insights-scaffold.pr.md
```

GitHub CLI 가 없다면:
1. https://github.com/jlinsights/smart-quote/compare/main...feature/insights-scaffold 접속
2. **New PR** → 본문은 위 `docs/01-plan/features/feature-insights-scaffold.pr.md` 내용 복사
3. 라벨: `enhancement`, `insights`, `workspaces`
4. CI 통과 확인 후 **Squash and merge**

### 7. Vercel 배포 검증

- main 브랜치 머지 시 Vercel 자동 배포
- 다음 단계(별도 PR)에서 `apps/insights/` 도 Vercel 배포 단위에 등록

---

**End of PR Body Draft**
