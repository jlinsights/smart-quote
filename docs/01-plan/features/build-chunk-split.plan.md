# Plan: build-chunk-split

> 메인 번들 760KB → <500KB 분할 — Sentry defer + manualChunks 정상화 + LandingPage lazy

## 1. 개요

| 항목 | 내용 |
|------|------|
| Feature | build-chunk-split |
| 우선순위 | Medium (Performance) |
| 영향 범위 | `vite.config.ts`, `src/index.tsx`, `src/App.tsx` |
| 시작일 | 2026-05-01 |
| 차단 | 없음 (main 기반 독립) |

### 배경

`npm run build` 시 chunk size 경고: 메인 번들 `index-*.js` 760KB (gzip 230KB). 랜딩 페이지(`/`) 진입 시 ~1.2MB 다운로드 → LCP 저하.

근본 원인 3가지를 `dist/` 분석으로 확인:
1. **`manualChunks` 미작동** — `vendor-react-*.js`가 37 bytes (빈 chunk). React/ReactDOM이 메인 번들에 흡수됨.
2. **Sentry 즉시 init** — `index.tsx`에서 `browserTracingIntegration` + `replayIntegration` 동기 로드 (~300KB).
3. **LandingPage eager import** — `App.tsx` line 3에서 정적 import. 다른 페이지는 `React.lazy()` 적용되어 있음.

## 2. 현황 (build 결과)

```
dist/assets/index-DJt_6aNm.js          760.07 kB │ gzip: 230.01 kB  ❌
dist/assets/vendor-pdf-CHn8rMuc.js     357.85 kB │ gzip: 117.99 kB  (lazy, OK)
dist/assets/QuoteCalculator-DJiHTYug.js 343.32 kB │ gzip:  58.73 kB  (lazy, OK)
dist/assets/index.es-OnJZYnm7.js       159.43 kB │ gzip:  53.45 kB  ⚠️ Sentry 추정
dist/assets/index-D8GAaJEH.js          158.86 kB │ gzip:  53.74 kB  ⚠️ Sentry 추정
dist/assets/vendor-router-B2S14yIN.js   68.04 kB │ gzip:  22.87 kB
dist/assets/vendor-icons-BrrhNyLG.js    43.30 kB │ gzip:   8.68 kB
dist/assets/vendor-react-qEchQI0D.js         37  B                  ❌ 비정상
```

## 3. 구현 범위

### 안 1 — Sentry init 지연 (`requestIdleCallback`)

**파일**: `src/index.tsx`

**현재**:
```ts
import * as Sentry from "@sentry/react";
Sentry.init({...});  // synchronous, blocks initial render
```

**변경**:
```ts
// Sentry는 사용자 첫 인터랙션 또는 idle 시점까지 지연
const initSentryDeferred = () => {
  import("@sentry/react").then(({ init, browserTracingIntegration, replayIntegration }) => {
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [browserTracingIntegration(), replayIntegration()],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      enabled: import.meta.env.PROD || import.meta.env.VITE_ENABLE_SENTRY === 'true',
    });
  });
};

if ('requestIdleCallback' in window) {
  requestIdleCallback(initSentryDeferred, { timeout: 2000 });
} else {
  setTimeout(initSentryDeferred, 1500);
}
```

**절감 추정**: 메인 번들 -300KB (Sentry SDK 전체가 별도 chunk로 분리)

**리스크**: 첫 1-2초 사이 발생한 에러는 Sentry로 전송되지 않음. 마케팅 랜딩 페이지에서 acceptable. AuthContext의 `Sentry.captureException` 호출은 그 시점엔 `Sentry`가 정의되어 있으므로 영향 없음 (SDK가 globally 등록됨).

### 안 2 — `manualChunks` function 형태로 변경

**파일**: `vite.config.ts`

**현재** (객체 형태, 미작동):
```ts
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-router': ['react-router-dom'],
  'vendor-pdf': ['jspdf'],
  'vendor-icons': ['lucide-react'],
}
```

**변경** (function 형태, node_modules 경로 매칭):
```ts
manualChunks(id) {
  if (!id.includes('node_modules')) return;
  if (id.includes('react-router')) return 'vendor-router';
  if (id.includes('react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
  if (id.includes('jspdf')) return 'vendor-pdf';
  if (id.includes('lucide-react')) return 'vendor-icons';
  if (id.includes('@sentry')) return 'vendor-sentry';
}
```

**절감 추정**: 메인 번들 -140KB (React/ReactDOM이 별도 chunk로 정상 분리)

**리스크**: function 형태는 Vite 권장 방식이므로 안전. 단 Sentry가 함수 매칭으로 vendor-sentry chunk에 들어가는데, 안 1의 `import("@sentry/react")` 동적 import가 우선순위 가짐 — 즉 Sentry는 deferred chunk로 갈 가능성 높음.

### 안 3 — LandingPage `React.lazy()`

**파일**: `src/App.tsx`

**현재**:
```ts
import { LandingPage } from './pages/LandingPage';  // line 3, eager
```

**변경**:
```ts
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
```

(Named export → default export wrapper 필요)

**절감 추정**: 메인 번들 -30~50KB (LandingPage + Header + 일부 contexts cascade)

**리스크**: 매우 낮음. App.tsx의 `<Suspense fallback={spinner}>`이 이미 최상위를 감싸고 있어 loading flash 자연스러움.

## 4. 구현 순서

1. **Plan 문서 작성** ← 현재 단계
2. **`vite.config.ts` 수정** (안 2) — 단독 적용 후 build 확인
3. **`src/App.tsx` LandingPage lazy** (안 3) — build 확인
4. **`src/index.tsx` Sentry defer** (안 1) — build 확인 + dev 모드 동작 확인
5. **최종 build 결과 비교** — before/after table 작성
6. **PR 생성** — base=main

## 5. 검증

- [ ] `npm run build` 통과
- [ ] 메인 번들 `index-*.js` < 500KB
- [ ] `vendor-react-*.js` > 100KB (정상 chunk)
- [ ] 별도 `vendor-sentry-*.js` 생성 (안 1+2 결과)
- [ ] `npm run dev`로 LandingPage 정상 렌더 (Suspense flash 자연스러움)
- [ ] 프로덕션 빌드에서 Sentry init이 1-2초 내 완료됨 (DevTools Network 확인)
- [ ] AuthContext의 `Sentry.captureException` 정상 동작
- [ ] `npx vitest run` 통과

## 6. 비범위 (이번 사이클에서 하지 않는 것)

- jspdf code-splitting 추가 분할 — 이미 `vendor-pdf` chunk로 lazy load됨
- Intercom 지연 로드 — 별도 사이클 후보
- `chunkSizeWarningLimit` 상향 — 안티패턴, 비추천
- vendor-pdf 357KB 자체 압축 — jspdf 라이브러리 한계

## 7. 후속 작업

| 작업 | 트리거 |
|------|--------|
| Design 문서 | 본 plan 후 (구현 단순하면 생략 가능) |
| Gap 분석 | 구현 후 `/pdca analyze` |
| Lighthouse 재측정 | 구현 후, Performance score 변화 확인 |
| Intercom defer (별도 사이클) | 본 PR 머지 후 |
