# Plan: Quote Export 기능 개선

> Feature: `quote-export`
> Created: 2026-03-10
> Status: Draft

---

## 1. 배경 및 문제 정의

### 현재 상태
- **단일 견적 PDF**: `generatePDF()` — 기본 견적서 PDF 다운로드 (jsPDF)
- **캐리어 비교 PDF**: `generateComparisonPDF()` — UPS vs DHL 비교표 PDF
- **이력 CSV**: `exportQuotesCsv()` — 서버 측 CSV 내보내기 (`GET /api/v1/quotes/export`)
- **저장**: `SaveQuoteButton` → `POST /api/v1/quotes` → PostgreSQL 저장 + `SQ-YYYY-NNNN` 참조번호 생성

### 문제점
1. **PDF 품질**: jsPDF 텍스트 기반 렌더링 → 디자인 한계 (표, 로고 없음, 한글 미지원)
2. **한글 폰트 미지원**: jsPDF 기본 Helvetica만 사용 → 한국어 고객에게 부적합
3. **고정 파일명**: `jways_smart_quote.pdf` 하드코딩 → 구분 불가
4. **참조번호 미연동**: DRAFT 상태 PDF에 저장된 참조번호 반영 안 됨
5. **CSV 제한**: 서버 측만 가능, 프론트엔드 필터 기반 클라이언트 측 내보내기 없음
6. **이메일 전송 없음**: 견적서를 고객에게 직접 이메일로 보내는 기능 부재

---

## 2. 목표

### P0 (Must-Have)
- [ ] PDF에 한글 폰트 적용 (Noto Sans KR 또는 Pretendard)
- [ ] 동적 파일명: `JWays_Quote_{referenceNo}_{date}.pdf`
- [ ] 저장된 견적의 참조번호를 PDF에 자동 반영
- [ ] PDF 레이아웃 개선: 회사 로고, 구조화된 테이블, 깔끔한 디자인

### P1 (Should-Have)
- [ ] 클라이언트 측 CSV 내보내기 (현재 화면 데이터 기반, 서버 불필요)
- [ ] 비교 PDF 개선: 3-carrier 비교 (UPS/DHL/EMAX) 지원
- [ ] PDF 미리보기 모달 (다운로드 전 확인)

### P2 (Nice-to-Have)
- [ ] 이메일 전송 기능 (견적서 PDF 첨부)
- [ ] Excel(.xlsx) 내보내기
- [ ] 견적서 템플릿 커스터마이징 (회사별)

---

## 3. 기술 분석

### 3.1 PDF 한글 폰트 옵션

| 방식 | 장점 | 단점 |
|------|------|------|
| **A. jsPDF + 커스텀 폰트** | 기존 코드 활용, 클라이언트 전용 | 폰트 파일 크기 (~2MB), base64 변환 필요 |
| **B. @react-pdf/renderer** | React 컴포넌트 기반, 스타일링 용이 | 새 의존성, 기존 코드 전면 리작성 |
| **C. html2canvas + jsPDF** | HTML/CSS 그대로 캡처 | 품질 저하, 텍스트 선택 불가 |
| **D. 서버 측 PDF (Puppeteer/wkhtmltopdf)** | 완벽한 렌더링 | 서버 부하, Rails 인프라 추가 필요 |

**추천**: **Option A** (jsPDF + Noto Sans KR) — 최소 변경으로 한글 지원 가능

### 3.2 영향 범위

| 파일 | 변경 유형 |
|------|----------|
| `src/lib/pdfService.ts` | 핵심 수정 (폰트, 레이아웃, 파일명) |
| `src/pages/QuoteCalculator.tsx` | 참조번호 전달 로직 |
| `src/features/quote/components/CarrierComparisonCard.tsx` | 3-carrier 비교 |
| `src/features/history/components/QuoteHistoryPage.tsx` | 클라이언트 CSV |
| `public/fonts/` | 한글 폰트 파일 추가 |
| `src/config/ui-constants.ts` | PDF 레이아웃 상수 업데이트 |

### 3.3 의존성

| 패키지 | 현재 | 용도 |
|--------|------|------|
| `jspdf` | ✅ 설치됨 | PDF 생성 |
| `jspdf-autotable` | ❌ 미설치 | 구조화된 테이블 (P0) |

---

## 4. 구현 순서

```
Phase 1: P0 한글 폰트 + 파일명 동적화 + 레이아웃 개선
  ├─ 1a. Noto Sans KR 폰트 통합 (base64 임베드)
  ├─ 1b. jspdf-autotable 설치 + 테이블 구조화
  ├─ 1c. 회사 로고 삽입 + 헤더/푸터 개선
  ├─ 1d. 동적 파일명 + 참조번호 연동
  └─ 1e. 테스트 작성

Phase 2: P1 클라이언트 CSV + 비교 PDF 확장
  ├─ 2a. 클라이언트 측 CSV 다운로드 유틸리티
  ├─ 2b. 3-carrier 비교 PDF
  └─ 2c. PDF 미리보기 모달

Phase 3: P2 이메일 + Excel (향후)
```

---

## 5. 성공 지표

| 지표 | 목표 |
|------|------|
| PDF 한글 렌더링 | 깨짐 없이 정상 출력 |
| PDF 파일 크기 | < 500KB (폰트 포함) |
| PDF 생성 시간 | < 2초 |
| 테스트 커버리지 | PDF 유틸 함수 80%+ |
| 사용자 만족도 | 고객 대면용 견적서 품질 확보 |

---

## 6. 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 한글 폰트 크기로 인한 번들 증가 | 높음 | 중간 | 서브셋 폰트 사용, lazy import |
| jsPDF 한글 줄바꿈 이슈 | 중간 | 중간 | 텍스트 길이 사전 계산 |
| 비교 PDF 3-carrier 시 페이지 초과 | 낮음 | 낮음 | 2페이지 레이아웃 |

---

*Next: `/pdca design quote-export`*
