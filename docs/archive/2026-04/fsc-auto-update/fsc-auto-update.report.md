# PDCA 완료 보고서: fsc-auto-update

**생성일**: 2026-04-14  
**Feature**: FSC DB-first 연동 + Admin 편집 UI  
**최종 Match Rate**: 97%  
**상태**: ✅ 완료

---

## 1. 개요 (Plan)

### 문제 정의
- UPS (48.50%) / DHL (46.00%) FSC 요율이 코드에 하드코딩
- 매주 월요일 변경 시마다 코드 수정 → Vercel + Render 배포 필요
- Admin이 매번 개발자에게 수동 입력 요청해야 하는 비효율

### 목표
- DB를 단일 진실 소스로 사용 (DB-first + 상수 fallback)
- Admin 페이지에서 직접 FSC% 수정 → 배포 없이 즉시 반영

---

## 2. 설계 (Design)

### 선택된 방법: Option B (DB-first + Constants Fallback)
```
FscFetcher.current_rates
  → fsc_rates 테이블 조회
  → 실패 시 DEFAULT_RATES 상수 사용
```

### 아키텍처
- **Backend**: `FscFetcher` → `QuoteCalculator` 연동
- **Frontend**: `useFscRates()` 훅 → `FscRateWidget` 표시 + 편집
- **API**: `POST /api/v1/fsc/update` (carrier, international, domestic)

---

## 3. 구현 (Do)

### 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `smart-quote-api/app/services/quote_calculator.rb` | `FscFetcher.current_rates` 연동 |
| `smart-quote-api/app/services/calculators/ups_cost.rb` | DB FSC 요율 적용 |
| `smart-quote-api/app/services/calculators/dhl_cost.rb` | DB FSC 요율 적용 |
| `smart-quote-api/lib/constants/rates.rb` | Fallback DEFAULT_RATES 유지 |
| `src/config/rates.ts` | Frontend 상수 → API 훅으로 전환 |
| `src/features/dashboard/hooks/useFscRates.ts` | no-op stub → 실 API 훅 |
| `src/features/admin/components/FscRateWidget.tsx` | hardcoded → useFscRates() |

### 테스트 결과
- **RSpec**: 189/190 통과 (1개는 기존 무관 실패)
- **Vitest**: 1241/1241 통과

---

## 4. Gap 분석 (Check)

### 1차 분석: 94% Match Rate

**일치 항목**:
- ✅ Backend FscFetcher DB 조회 연동
- ✅ QuoteCalculator FSC 동적 적용
- ✅ useFscRates() 실 API 훅
- ✅ FscRateWidget 실시간 표시

**미달 항목 (6% Gap)**:
- ❌ FscRateWidget 편집 UI 없음 (Admin이 Widget에서 직접 수정 불가)

---

## 5. 자동 개선 (Act)

### 추가 구현: FscRateWidget 편집 UI

**`src/features/admin/components/FscRateWidget.tsx`** 에 추가:

```typescript
// 상태
const [isEditing, setIsEditing] = useState(false);
const [saving, setSaving] = useState(false);
const [editRates, setEditRates] = useState({ UPS: '', DHL: '' });

// 편집 시작: 현재 DB값으로 초기화
const handleEditStart = () => {
  setEditRates({
    UPS: String(data?.rates.UPS.international ?? ''),
    DHL: String(data?.rates.DHL.international ?? ''),
  });
  setIsEditing(true);
};

// 저장: updateFscRate API 호출 후 UI 갱신
const handleSave = async () => {
  setSaving(true);
  try {
    const upsRate = parseFloat(editRates.UPS);
    const dhlRate = parseFloat(editRates.DHL);
    if (!isNaN(upsRate)) await updateFscRate('UPS', upsRate, upsRate);
    if (!isNaN(dhlRate)) await updateFscRate('DHL', dhlRate, dhlRate);
    await fetchRates();
    setIsEditing(false);
  } finally {
    setSaving(false);
  }
};
```

**UX 흐름**:
1. 연필 아이콘 클릭 → 편집 모드 진입
2. 숫자 입력 필드에 현재 DB값 자동 채움
3. 값 수정 후 체크 아이콘 클릭 → `POST /api/v1/fsc/update` 호출
4. 저장 완료 후 UI 자동 갱신 (fetchRates 재호출)
5. X 아이콘으로 취소 가능

### 2차 분석: 97% Match Rate ✅

---

## 6. 성과 요약

### Before
- FSC 변경 시: 코드 수정 → Git 커밋 → Vercel 배포 → Render 배포 (약 10-15분)
- 개발자 의존도: 매주 월요일 수동 개입 필요

### After
- FSC 변경 시: `/admin` 접속 → FscRateWidget 연필 클릭 → 값 입력 → 저장 (약 30초)
- 개발자 의존도: 없음 (Admin 자율 운영)

### 주요 지표
| 항목 | 값 |
|------|-----|
| 최종 Match Rate | 97% |
| 배포 없이 요율 변경 | ✅ 가능 |
| TypeScript 에러 | 0 |
| RSpec 통과율 | 189/190 |
| Vitest 통과율 | 1241/1241 |

---

## 7. Admin 운영 가이드

### 매주 월요일 FSC 업데이트 절차

1. UPS 공식 사이트에서 최신 FSC% 확인
2. DHL 공식 사이트에서 최신 FSC% 확인
3. `/admin` → 대시보드의 **FSC Rate Widget** 이동
4. 연필(✏️) 아이콘 클릭
5. UPS / DHL 값 입력 (예: 48.50, 46.00)
6. 체크(✓) 아이콘 클릭 → 저장
7. 위젯에서 업데이트된 값 즉시 확인

> **배포 불필요** — DB에 즉시 반영되며 다음 견적 계산부터 적용됩니다.

---

## 8. 잔여 개선 사항 (Optional)

- [ ] `useFscRates.test.ts` 단위 테스트 4개 추가
- [ ] `quote_calculator_spec.rb` DB FSC 테스트 케이스 추가
- [ ] FSC 변경 이력 로그 테이블 (audit trail)
- [ ] 변경 시 Slack 알림 (선택)
