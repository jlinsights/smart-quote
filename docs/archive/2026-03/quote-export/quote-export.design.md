# Design: Quote Export 기능 개선

> Feature: `quote-export`
> Created: 2026-03-10
> Plan Reference: `docs/01-plan/features/quote-export.plan.md`

---

## 1. 아키텍처 개요

### 변경 범위 다이어그램

```
src/lib/
  pdfService.ts          ← [핵심 수정] 전면 리팩토링
  pdfFontLoader.ts       ← [신규] 한글 폰트 로더 (lazy)
  csvExportService.ts    ← [신규] 클라이언트 측 CSV 생성

src/config/
  ui-constants.ts        ← [수정] PDF_LAYOUT 확장

src/pages/
  QuoteCalculator.tsx    ← [수정] referenceNo 전달 개선

src/features/quote/components/
  CarrierComparisonCard.tsx  ← [수정] EMAX 3-carrier 비교 지원
  PdfPreviewModal.tsx    ← [신규] PDF 미리보기 모달 (P1)

src/features/history/components/
  QuoteHistoryPage.tsx   ← [수정] 클라이언트 CSV 버튼 추가

public/
  fonts/NotoSansKR-Regular.ttf  ← [신규] 한글 폰트 (~1.5MB)
  goodman-gls-logo.png   ← [기존] 회사 로고

src/lib/__tests__/
  pdfService.test.ts     ← [수정] 테스트 확장
  csvExportService.test.ts ← [신규] CSV 테스트
```

---

## 2. Phase 1: P0 — 한글 폰트 + 레이아웃 + 파일명

### 2.1 한글 폰트 로더 (`src/lib/pdfFontLoader.ts`)

```typescript
// 설계 의도: 폰트를 lazy load하여 초기 번들에 포함시키지 않음
// Noto Sans KR Regular만 사용 (bold는 jsPDF setFont("bold") 시뮬레이션)

let fontLoaded = false;

export async function loadKoreanFont(doc: jsPDF): Promise<void> {
  if (fontLoaded) {
    doc.setFont('NotoSansKR');
    return;
  }

  // Vite의 dynamic import로 base64 폰트 로드
  const fontModule = await import('@/assets/fonts/NotoSansKR-Regular-base64');
  doc.addFileToVFS('NotoSansKR-Regular.ttf', fontModule.default);
  doc.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
  doc.setFont('NotoSansKR');
  fontLoaded = true;
}
```

**폰트 준비 작업**:
1. Google Fonts에서 Noto Sans KR Regular 다운로드
2. `npx fonttools subset` 또는 `pyftsubset`으로 서브셋 (한글 완성형 2,350자 + 영문 + 숫자 + 기호)
3. 서브셋 후 예상 크기: ~300-500KB (원본 ~1.5MB 대비 70% 감소)
4. base64 인코딩 → `src/assets/fonts/NotoSansKR-Regular-base64.ts` 저장

### 2.2 PDF 레이아웃 리팩토링 (`src/lib/pdfService.ts`)

**현재 구조** → **개선 구조**:

```
Before: 개별 draw 함수들이 yPos를 수동 관리
After:  섹션 기반 렌더링 + jspdf-autotable 테이블
```

#### 주요 변경 사항

| 섹션 | Before | After |
|------|--------|-------|
| 헤더 | 텍스트만 | **로고 이미지** + 회사명 + 날짜/참조번호 |
| 화물 정보 | 수동 좌표 텍스트 | `autoTable` 구조화 테이블 |
| 비용 내역 | 수동 좌표 텍스트 | `autoTable` + 합계 행 강조 |
| 합계 | 텍스트 기반 | **블루 박스** 강조 디자인 |
| 푸터 | 텍스트 1줄 | 면책 고지 + 담당자 연락처 + 페이지 번호 |

#### 로고 삽입 방식

```typescript
// public/goodman-gls-logo.png (기존 파일 활용)
// 빌드 시 base64로 임포트하여 doc.addImage() 사용

import logoBase64 from '@/assets/logo-base64'; // 빌드 시 생성

const drawHeader = (doc: jsPDF, yPos: number, referenceNo?: string): number => {
  // 로고 (좌측)
  doc.addImage(logoBase64, 'PNG', MARGIN_X, yPos - 8, 40, 12);

  // 타이틀 (우측)
  doc.setFont('NotoSansKR');
  doc.setFontSize(18);
  doc.text('견적서 / Quotation', PAGE_WIDTH - MARGIN_X, yPos, { align: 'right' });

  // 메타데이터
  yPos += 15;
  doc.setFontSize(9);
  doc.text(`Date: ${new Date().toLocaleDateString('ko-KR')}`, MARGIN_X, yPos);
  doc.text(`Ref: ${referenceNo || 'DRAFT'}`, PAGE_WIDTH - MARGIN_X, yPos, { align: 'right' });

  return yPos + 10;
};
```

#### Cargo Manifest 테이블 (jspdf-autotable)

```typescript
import autoTable from 'jspdf-autotable';

const drawCargoTable = (doc: jsPDF, items: CargoItem[], result: QuoteResult, yPos: number): number => {
  autoTable(doc, {
    startY: yPos,
    head: [['#', '규격 (L×W×H cm)', '중량 (kg)', '수량', '용적중량 (kg)']],
    body: items.map((item, i) => [
      i + 1,
      `${item.length} × ${item.width} × ${item.height}`,
      formatNum(item.weight),
      item.quantity,
      formatNumDec((item.length * item.width * item.height) / 5000 * item.quantity),
    ]),
    foot: [[
      '', '',
      `실중량: ${formatNum(result.totalActualWeight)} kg`, '',
      `청구중량: ${formatNum(result.billableWeight)} kg`
    ]],
    theme: 'grid',
    headStyles: { fillColor: [2, 132, 199], font: 'NotoSansKR', fontSize: 9 },
    bodyStyles: { font: 'NotoSansKR', fontSize: 9 },
    footStyles: { font: 'NotoSansKR', fontSize: 9, fontStyle: 'bold' },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  return (doc as any).lastAutoTable.finalY + 10;
};
```

#### 비용 내역 테이블

```typescript
const drawCostTable = (doc: jsPDF, result: QuoteResult, yPos: number): number => {
  const bd = result.breakdown;
  const rows = [
    ['포장/핸들링', formatKRW(bd.packingMaterial + bd.packingLabor + bd.packingFumigation + bd.handlingFees)],
    [`국제운송 (${result.carrier})`, formatKRW(bd.intlBase)],
    ['유류할증료 (FSC)', formatKRW(bd.intlFsc)],
  ];

  if (bd.intlSurge > 0) rows.push(['할증료 (Surge)', formatKRW(bd.intlSurge)]);
  if (bd.intlWarRisk > 0) rows.push(['전쟁위험할증', formatKRW(bd.intlWarRisk)]);
  if (bd.pickupInSeoul > 0) rows.push(['서울 픽업비', formatKRW(bd.pickupInSeoul)]);
  if (bd.destDuty > 0) rows.push(['관세/세금 (예상)', formatKRW(bd.destDuty)]);

  autoTable(doc, {
    startY: yPos,
    head: [['항목', '금액 (KRW)']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [2, 132, 199], font: 'NotoSansKR', fontSize: 9 },
    bodyStyles: { font: 'NotoSansKR', fontSize: 9, halign: 'right' },
    columnStyles: { 0: { halign: 'left', cellWidth: 100 }, 1: { halign: 'right' } },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  return (doc as any).lastAutoTable.finalY + 8;
};
```

### 2.3 동적 파일명 + 참조번호 연동

```typescript
// pdfService.ts
export const generatePDF = async (
  input: QuoteInput,
  result: QuoteResult,
  referenceNo?: string
) => {
  // ... PDF 생성 로직 ...

  // 동적 파일명
  const date = new Date().toISOString().slice(0, 10);
  const ref = referenceNo || 'DRAFT';
  const filename = `JWays_Quote_${ref}_${date}.pdf`;
  doc.save(filename);
};
```

**QuoteCalculator.tsx 수정**:
```typescript
// 저장된 견적의 referenceNo를 PDF 생성 시 전달
const handleDownloadPdf = async () => {
  await generatePDF(input, result, savedReferenceNo);
  //                                ^^^^^^^^^^^^^^^^ 새 매개변수
};
```

### 2.4 의존성 추가

```bash
npm install jspdf-autotable
# devDependencies
npm install -D @types/jspdf-autotable  # (필요 시)
```

---

## 3. Phase 2: P1 — 클라이언트 CSV + 3-Carrier 비교

### 3.1 클라이언트 측 CSV 내보내기 (`src/lib/csvExportService.ts`)

```typescript
interface CsvExportOptions {
  quotes: QuoteListItem[];
  filename?: string;
}

export function exportQuotesToCsv({ quotes, filename }: CsvExportOptions): void {
  const headers = [
    'Reference', 'Date', 'Destination', 'Carrier', 'Weight (kg)',
    'Cost (KRW)', 'Quote (KRW)', 'Quote (USD)', 'Margin %', 'Status'
  ];

  const rows = quotes.map(q => [
    q.referenceNo,
    new Date(q.createdAt).toLocaleDateString('ko-KR'),
    q.destinationCountry,
    q.carrier,
    q.billableWeight,
    q.totalCostAmount,
    q.totalQuoteAmount,
    q.totalQuoteAmountUSD,
    q.profitMargin?.toFixed(1),
    q.status,
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // BOM 추가로 Excel에서 한글 깨짐 방지
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**QuoteHistoryPage 통합**:
- 기존 서버 CSV: 필터 + 전체 데이터 (유지)
- 신규 클라이언트 CSV: 현재 화면에 보이는 데이터만 빠르게 다운로드

### 3.2 3-Carrier 비교 PDF

**CarrierComparisonCard.tsx 확장**:

```typescript
// EMAX 지원 국가인 경우 3-carrier 비교 활성화
const emaxCountries = ['CN', 'VN'];
const showEmax = emaxCountries.includes(input.destinationCountry);

// 비교 PDF 생성 시 EMAX 포함
export const generateTripleComparisonPDF = async (
  input: QuoteInput,
  upsResult: QuoteResult,
  dhlResult: QuoteResult,
  emaxResult?: QuoteResult  // CN/VN일 때만 전달
) => { ... };
```

**PDF 레이아웃**:
- 2-carrier: 현재와 동일한 2열 비교
- 3-carrier: 3열 비교 (UPS | DHL | EMAX), 컬럼 너비 자동 조정

### 3.3 PDF 미리보기 모달 (`PdfPreviewModal.tsx`)

```typescript
interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  input: QuoteInput;
  result: QuoteResult;
  referenceNo?: string;
}

// jsPDF의 output('bloburl')을 iframe으로 렌더링
// 다운로드/닫기 버튼 제공
```

---

## 4. 데이터 흐름

### PDF 생성 플로우 (개선 후)

```
User clicks "Download PDF"
  ↓
QuoteCalculator.handleDownloadPdf(referenceNo)
  ↓
pdfService.generatePDF(input, result, referenceNo)
  ↓
pdfFontLoader.loadKoreanFont(doc)   ← [신규] lazy 폰트 로드
  ↓
drawHeader(doc, yPos, referenceNo)  ← [개선] 로고 + 한글 타이틀
  ↓
drawCargoTable(doc, items, result)  ← [개선] autoTable
  ↓
drawCostTable(doc, result)          ← [개선] autoTable
  ↓
drawQuoteSummary(doc, result)       ← [개선] 블루 박스 합계
  ↓
drawWarnings(doc, warnings)
  ↓
drawFooter(doc)                     ← [개선] 페이지 번호 + 담당자
  ↓
doc.save(`JWays_Quote_${ref}_${date}.pdf`)  ← [개선] 동적 파일명
```

### 클라이언트 CSV 플로우

```
User clicks "Export CSV" in History
  ↓
[기존] 서버 CSV: exportQuotesCsv(params) → GET /api/v1/quotes/export
[신규] 화면 CSV: exportQuotesToCsv({ quotes }) → Blob → download
```

---

## 5. 구현 순서 (체크리스트)

### Phase 1 (P0)

- [ ] **1a.** Noto Sans KR 서브셋 생성 + base64 인코딩
- [ ] **1b.** `src/lib/pdfFontLoader.ts` 작성
- [ ] **1c.** `npm install jspdf-autotable` 설치
- [ ] **1d.** `src/config/ui-constants.ts` — PDF_LAYOUT 상수 확장
- [ ] **1e.** `src/lib/pdfService.ts` — drawHeader 리팩토링 (로고 + 한글)
- [ ] **1f.** `src/lib/pdfService.ts` — drawCargoTable (autoTable 전환)
- [ ] **1g.** `src/lib/pdfService.ts` — drawCostTable (autoTable 전환)
- [ ] **1h.** `src/lib/pdfService.ts` — drawQuoteSummary 개선 (블루 박스)
- [ ] **1i.** `src/lib/pdfService.ts` — drawFooter 개선 (페이지 번호)
- [ ] **1j.** `src/lib/pdfService.ts` — 동적 파일명 적용
- [ ] **1k.** `src/pages/QuoteCalculator.tsx` — referenceNo 전달
- [ ] **1l.** `src/lib/__tests__/pdfService.test.ts` — 테스트 확장
- [ ] **1m.** 수동 QA: PDF 한글 렌더링 + 레이아웃 확인

### Phase 2 (P1)

- [ ] **2a.** `src/lib/csvExportService.ts` 작성
- [ ] **2b.** `src/features/history/components/QuoteHistoryPage.tsx` — 클라이언트 CSV 버튼
- [ ] **2c.** `src/features/quote/components/CarrierComparisonCard.tsx` — EMAX 3-carrier
- [ ] **2d.** `src/lib/pdfService.ts` — generateTripleComparisonPDF
- [ ] **2e.** `src/features/quote/components/PdfPreviewModal.tsx` 작성
- [ ] **2f.** 테스트 작성 (csvExportService, 3-carrier PDF)

---

## 6. 테스트 전략

| 대상 | 테스트 유형 | 검증 항목 |
|------|------------|----------|
| `pdfFontLoader` | Unit | 폰트 로드 성공, 중복 로드 방지 |
| `generatePDF` | Unit (mock jsPDF) | 한글 텍스트 호출, 파일명 패턴, referenceNo 반영 |
| `drawCargoTable` | Unit | autoTable 호출 파라미터, 행 수 일치 |
| `csvExportService` | Unit | BOM 포함, 헤더/행 수, 한글 인코딩 |
| `CarrierComparisonCard` | Component | EMAX 국가 시 3-carrier 표시 |
| PDF 출력 품질 | Manual QA | 한글 깨짐, 로고 위치, 테이블 정렬 |

---

## 7. 성능 고려사항

| 항목 | 목표 | 전략 |
|------|------|------|
| 폰트 로드 | < 500ms | lazy import + 캐싱 (`fontLoaded` 플래그) |
| PDF 생성 | < 2초 | autoTable은 이미 최적화됨 |
| 번들 증가 | < 400KB | 서브셋 폰트, dynamic import |
| CSV 생성 | < 100ms | 클라이언트 측 Blob, 서버 호출 없음 |

---

*Next: `/pdca do quote-export` → Phase 1 구현 시작*
