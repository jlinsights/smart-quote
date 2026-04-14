# Plan: fsc-auto-update

**작성일**: 2026-04-14
**담당**: Jaehong
**Phase**: Plan

---

## 1. 문제 정의

### 현재 상태 (As-Is)

FSC(Fuel Surcharge)가 코드 두 곳에 하드코딩되어 있다.

| 위치 | 파일 | 상수 |
|------|------|------|
| 프론트엔드 | `src/config/rates.ts` | `DEFAULT_FSC_PERCENT=48.50`, `DEFAULT_FSC_PERCENT_DHL=46.00` |
| 백엔드 | `smart-quote-api/lib/constants/rates.rb` | 동일 값 |

**업데이트 주기**: UPS/DHL 모두 **매주 월요일** 변경.

**현재 업데이트 절차**:
1. 두 파일 동시 수정 (코드 변경)
2. git commit + push
3. Vercel (프론트) + Render (백) 배포 대기

→ 배포 없이는 FSC 반영 불가. 주 1회 강제 배포 발생.

### 인프라 현황

이미 DB 인프라가 존재하지만 **비활성화** 상태:

| 컴포넌트 | 위치 | 상태 |
|---------|------|------|
| `FscRate` 모델 | DB 테이블 (carrier, international, domestic, source, updated_by) | 활성 |
| `FscFetcher` 서비스 | `app/services/fsc_fetcher.rb` | 활성 (DB read + 상수 fallback) |
| `fsc_controller.rb` | `GET /api/v1/fsc/rates`, `POST /api/v1/fsc/update` | 활성 |
| `FscRateWidget` | `src/features/admin/components/FscRateWidget.tsx` | **비활성** — useMemo 하드코딩 |
| `useFscRates` hook | `src/features/dashboard/hooks/useFscRates.ts` | **비활성** — no-op, 상수만 반환 |
| `quote_calculator.rb` | `default_fsc = @carrier == 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT` | **비활성** — 상수 사용 |
| `calculationService.ts` | `const defaultFsc = carrier === 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT` | **비활성** — 상수 사용 |

---

## 2. 목표 (To-Be)

### 핵심 목표

**매주 월요일 FSC 업데이트 시 코드 변경/배포 없이 Admin UI에서 즉시 적용**

### 변경 흐름

```
[Admin] FscRateWidget → POST /api/v1/fsc/update → DB 저장
                                                      ↓
[Backend] quote_calculator.rb → FscFetcher.current_rates → DB 값 사용
                                                      ↓
[Frontend] calculationService.ts → GET /api/v1/fsc/rates → DB 값 사용
```

### 선택 옵션: **Option B — DB 우선 + 수동 업데이트**

- 웹 스크래핑(자동)은 1차 구현에서 제외 (사이트 구조 변경 리스크)
- Admin이 UPS/DHL 공식 사이트에서 % 확인 후 UI에서 입력
- DB 값 없으면 상수(hardcoded) fallback 유지

---

## 3. 범위 (Scope)

### 변경 대상 파일 (5개)

#### 백엔드 (2개)

1. **`smart-quote-api/app/services/quote_calculator.rb`**
   - 현재: `DEFAULT_FSC_PERCENT`, `DEFAULT_FSC_PERCENT_DHL` 상수 직접 사용 (line 83, 109)
   - 변경: `FscFetcher.current_rates` 호출 → DB 값 우선, 상수 fallback

2. **`smart-quote-api/app/services/calculators/ups_cost.rb`** / **`dhl_cost.rb`**
   - FSC percent가 상위에서 주입되는 구조 확인 후 필요 시 수정

#### 프론트엔드 (2개)

3. **`src/features/dashboard/hooks/useFscRates.ts`**
   - 현재: no-op, 상수만 반환
   - 변경: `GET /api/v1/fsc/rates` 실제 호출, DB 값 반환 (상수 fallback 포함)

4. **`src/features/admin/components/FscRateWidget.tsx`**
   - 현재: DB fetch 비활성화 (useMemo 하드코딩)
   - 변경: `useFscRates` hook 실제 사용, "새로고침" 버튼 활성화

#### API 클라이언트 (1개)

5. **`src/api/fscApi.ts`** (신규 또는 기존 확인)
   - `GET /api/v1/fsc/rates` 호출 함수

### 변경 제외 (Out of Scope)

- UPS/DHL 사이트 자동 스크래핑 (2차 계획)
- `src/config/rates.ts` 상수 제거 — fallback용으로 유지
- `lib/constants/rates.rb` 상수 제거 — fallback용으로 유지
- 계산 로직 변경 — FSC % 주입 경로만 변경

---

## 4. 기술 설계 (상위 레벨)

### 백엔드: quote_calculator.rb 수정

```ruby
# 현재 (line 109)
default_fsc = @carrier == 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT

# 변경 후
rates = FscFetcher.current_rates  # DB 우선, 상수 fallback 내장
default_fsc = rates[@carrier]&.[]("international") ||
              (@carrier == 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT)
```

### 프론트엔드: useFscRates 수정

```typescript
// 변경 후: 실제 API 호출
export function useFscRates() {
  const [data, setData] = useState<FscRates>(() => defaultFscRates());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    // GET /api/v1/fsc/rates
    // 성공 시 DB 값 사용, 실패 시 상수 fallback
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  return { data, loading, error, retry: fetchRates };
}
```

### FscRateWidget: DB fetch 재활성화

- `useFscRates()` hook 실제 사용
- "새로고침" 버튼 → `retry()` 호출
- POST 업데이트 성공 후 자동 refresh

---

## 5. 성공 기준

| 기준 | 측정 방법 |
|------|---------|
| Admin FscRateWidget에서 FSC % 변경 후 저장 → 즉시 조회 시 새 값 반영 | UI 검증 |
| 변경된 FSC가 견적 계산에 즉시 반영 (새로고침 없이) | 견적 계산 결과 검증 |
| DB 장애 시 기존 상수값으로 fallback (무중단) | 에러 케이스 테스트 |
| 배포 없이 FSC 업데이트 완료 | 운영 프로세스 검증 |
| 기존 1188개 테스트 모두 통과 | `npx vitest run` + `bundle exec rspec` |

---

## 6. 구현 단계

### Phase 1: 백엔드 (1-2시간)
1. `quote_calculator.rb` — FSC 값 주입 경로 DB로 전환
2. 기존 테스트 통과 확인 (`bundle exec rspec`)

### Phase 2: 프론트엔드 훅 (1시간)
3. `useFscRates.ts` — 실제 API 호출로 전환
4. `fscApi.ts` 확인/생성

### Phase 3: Admin 위젯 (1시간)
5. `FscRateWidget.tsx` — DB fetch 재활성화, 버튼 활성화
6. 프론트 테스트 확인 (`npx vitest run`)

### Phase 4: 통합 검증
7. 로컬 환경에서 FSC 업데이트 → 견적 계산 즉시 반영 확인
8. DB 장애 시뮬레이션 → 상수 fallback 동작 확인

---

## 7. 위험 요소 및 대응

| 위험 | 대응 |
|------|------|
| 프론트 계산(useMemo)과 백엔드 계산 불일치 | `useFscRates` 초기값에 상수 fallback 적용, 서버 값 동기화 |
| API 호출 지연으로 계산 딜레이 | FSC는 캐싱 가능 (5분 TTL), 초기 로드 시 상수 사용 |
| FscRate DB 레코드 없을 때 | `FscFetcher.current_rates`의 rescue 블록이 상수 반환 (기존 로직 활용) |
| 테스트에서 DB 없는 환경 | `FscFetcher.current_rates` 모킹 또는 constants fallback 확인 |

---

## 8. 관련 문서

- `docs/USER_GUIDE_ADMIN.md` — FSC 관리 섹션 업데이트 필요
- `CLAUDE.md` — FSC 업데이트 절차 단순화 업데이트 필요
- `.bkit-memory.json` — feature: fsc-auto-update
