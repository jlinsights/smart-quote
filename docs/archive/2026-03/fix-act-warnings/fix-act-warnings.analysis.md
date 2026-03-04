# Gap Analysis: fix-act-warnings

**Date**: 2026-03-04
**Phase**: Check
**Feature**: CustomerDashboard 테스트 act() 경고 수정
**Match Rate**: 100% ✅

---

## 문제 정의

`CustomerDashboard.test.tsx`의 4개 테스트 중 3개(테스트 1~3)에서
`QuoteHistoryCompact` 내부의 비동기 상태 업데이트가 `act()` 외부에서 발생하는 경고:

```
An update to QuoteHistoryCompact inside a test was not wrapped in act(...).
```

**근본 원인**: `QuoteHistoryCompact`의 `useEffect`에서 `listQuotes()`
(mock: `vi.fn().mockResolvedValue(...)`) 를 호출하고, resolve된 Promise 체인 내에서
`setQuotes` / `setLoading` 상태 업데이트가 발생함. 테스트 1~3은 동기 렌더 후
즉시 assert하기 때문에 `act()` 경계 밖에서 flush됨.

---

## 검증 항목

| # | 검증 항목 | 결과 |
|---|-----------|------|
| 1 | `act` import 추가 (`@testing-library/react`) | ✅ PASS |
| 2 | 테스트 1~3 `async` 함수로 변환 | ✅ PASS |
| 3 | `await act(async () => { renderDashboard(); })` 패턴 적용 (테스트 1~3) | ✅ PASS |
| 4 | 테스트 4 `waitFor` 패턴 유지 + `act()` 래핑 추가 | ✅ PASS |
| 5 | 전체 138 테스트 통과 | ✅ PASS |
| 6 | stderr act() 경고 0건 | ✅ PASS |

---

## 구현 결과

```typescript
// Before
it('renders welcome banner with user email', () => {
  renderDashboard();
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
});

// After
it('renders welcome banner with user email', async () => {
  await act(async () => { renderDashboard(); });
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
});
```

`await act(async () => {...})`는 렌더 후 발생하는 모든 microtask
(resolved Promise의 `.then()` 체인)를 flush하므로 상태 업데이트가
`act()` 경계 내에서 완료됨.

---

## 테스트 결과

```
Test Files  16 passed (16)
      Tests 138 passed (138)
   Duration  4.52s
   Warnings  0 (act() warnings eliminated)
```

---

## 갭 분석 결과

- **Missing**: 없음
- **Added (unexpected)**: 없음
- **Changed (deviation)**: 없음

**결론**: 설계 의도와 구현이 100% 일치. 추가 이터레이션 불필요.

---

## 다음 단계

Match Rate ≥ 90% → `/pdca report fix-act-warnings` 실행 권장
