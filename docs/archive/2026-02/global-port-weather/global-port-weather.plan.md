# Global Port Weather Planning Document

> **Summary**: /quote 페이지의 글로벌 항구 기상 위젯을 6개에서 24개 항구로 확장하고, Auto Pagination을 구현하여 전체 도착국가의 실시간 기상 정보를 제공
>
> **Project**: Smart Quote System (Goodman GLS & J-Ways)
> **Version**: 0.1.0
> **Author**: Claude Code
> **Date**: 2026-02-26
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

기존 WeatherWidget이 6개 항구(Busan, LA, Rotterdam, Shanghai, Singapore, Hamburg)만 표시하던 것을 한국 ICN(인천), PUS(부산) 포함 22개 도착국가 주요 항구/도시 총 24개로 확장하고, 6개 초과 시 Auto Pagination으로 사용자에게 모든 항구 기상 정보를 제공한다.

### 1.2 Background

- 견적 페이지(`/quote`)의 도착국가 선택지(COUNTRY_OPTIONS)는 22개국이지만, 기상 위젯은 6개 항구만 모니터링
- 사용자가 특정 국가로 견적을 작성할 때, 해당 국가의 기상 상황을 즉시 확인할 수 없음
- 한국 원산지 항구로 ICN(인천)이 누락되어 있었음

### 1.3 Related Documents

- CLAUDE.md: 프로젝트 아키텍처 및 스택 정의
- `src/config/options.ts`: COUNTRY_OPTIONS (22개 도착국가), ORIGIN_COUNTRY_OPTIONS (4개 원산지)
- `docs/archive/2026-02/Customer-Dashboard/`: Customer Dashboard PDCA (기상 위젯 초기 구현)

---

## 2. Scope

### 2.1 In Scope

- [x] `MONITORED_PORTS` 확장: 6 → 24개 항구 (ICN + 22개 도착국가 주요 항구)
- [x] Auto Pagination: 6개 초과 시 자동 페이지 전환 (5초 간격)
- [x] Pagination UI: 이전/다음 버튼 + 도트 인디케이터 + 페이지 번호
- [x] `PORTS_PER_PAGE` 상수화 (설정 가능)
- [x] 기존 테스트 업데이트 + 페이지네이션 테스트 추가

### 2.2 Out of Scope

- 국가별 필터링 (특정 국가만 표시)
- 기상 알림/경보 푸시 기능
- 항구별 상세 날씨 페이지
- 사용자 맞춤 항구 선택 기능

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | ICN(인천) 항구 추가 (KR-ICN, 위도 37.4563, 경도 126.7052) | High | Done |
| FR-02 | PUS(부산) 항구 유지 | High | Done |
| FR-03 | 22개 COUNTRY_OPTIONS 각 국가별 주요 항구 1개씩 추가 | High | Done |
| FR-04 | 항구 데이터: 한국 2, 아시아-태평양 10, 미주 3, 유럽 6, 중동 3 = 총 24개 | High | Done |
| FR-05 | 6개 이하 표시 시 기존 grid 레이아웃 유지 (2x3) | High | Done |
| FR-06 | 6개 초과 시 Auto Pagination 활성화 | High | Done |
| FR-07 | 페이지 자동 전환: 5초 간격 순환 | Medium | Done |
| FR-08 | 수동 페이지 전환: 이전/다음 버튼 | Medium | Done |
| FR-09 | 도트 인디케이터로 현재 페이지 표시 | Medium | Done |
| FR-10 | 헤더에 "N / M" 페이지 번호 표시 | Low | Done |
| FR-11 | PORTS_PER_PAGE 상수 export (향후 설정 변경 용이) | Low | Done |
| FR-12 | safePage 클램핑으로 데이터 변경 시 범위 보장 | Medium | Done |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | Open-Meteo API 배치 호출 24개 좌표 1회 요청 | weatherApi 단일 fetch |
| Performance | 30분 간격 자동 갱신 유지 | usePortWeather hook |
| Reliability | fetchWithRetry 지수 백오프 (1s, 2s, 4s, max 3회) | 기존 유틸리티 |
| Accessibility | ARIA label: "Previous page", "Next page", "Page N" | WeatherWidget 버튼 |
| API Limit | Open-Meteo 무료: 10,000 req/day (30분 간격 = 48 req/day) | API 사용량 모니터링 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] 24개 항구 데이터 MONITORED_PORTS에 정의
- [x] WeatherWidget Auto Pagination 구현
- [x] TypeScript 0 errors
- [x] ESLint 0 errors/warnings
- [x] 기존 + 신규 테스트 100% 통과
- [x] 코드 리뷰 (PDCA Check 단계)

### 4.2 Quality Criteria

- [x] 테스트 커버리지: WeatherWidget 7건 + weatherApi 6건
- [x] Zero lint errors
- [x] Build 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Open-Meteo 24개 좌표 배치 호출 시 응답 시간 증가 | Medium | Low | fetchWithRetry로 재시도, 30분 캐싱 |
| 24개 항구 중 일부 좌표 오류 | Low | Low | 검증된 위도/경도 사용, 테스트로 확인 |
| Auto Pagination 인터벌과 React strict mode 충돌 | Low | Low | useEffect cleanup으로 interval 해제 |
| ESLint React 19 규칙 (set-state-in-effect, refs-in-render) | Medium | High | safePage 클램핑으로 useEffect/ref 없이 해결 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, services layer | Web apps with backend, SaaS MVPs | **X** |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | React 19 + Vite 6 | React 19 | 기존 프로젝트 스택 유지 |
| State Management | useState | useState | 위젯 로컬 상태, 글로벌 불필요 |
| API Client | fetch + fetchWithRetry | fetch | 기존 유틸리티 재사용 |
| Styling | Tailwind (jways-* palette) | Tailwind | 기존 디자인 시스템 |
| Testing | Vitest + @testing-library/react | Vitest | 기존 테스트 프레임워크 |

### 6.3 Clean Architecture Approach

```
Selected Level: Dynamic

변경 영역:
┌─────────────────────────────────────────────────────┐
│ Domain/Config Layer:                                │
│   src/config/ports.ts (24 ports + PORTS_PER_PAGE)   │
├─────────────────────────────────────────────────────┤
│ Infrastructure Layer:                               │
│   src/api/weatherApi.ts (변경 없음 - 자동 확장)      │
├─────────────────────────────────────────────────────┤
│ Application Layer:                                  │
│   src/features/dashboard/hooks/usePortWeather.ts    │
│   (변경 없음 - 자동 확장)                            │
├─────────────────────────────────────────────────────┤
│ Presentation Layer:                                 │
│   src/features/quote/components/widgets/            │
│     WeatherWidget.tsx (Auto Pagination 추가)        │
└─────────────────────────────────────────────────────┘
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (React 19 rules: set-state-in-effect, refs-in-render)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Tailwind with `jways-*` custom palette, class-based dark mode

### 7.2 Conventions Followed

| Category | Convention Applied |
|----------|-------------------|
| **Naming** | PortConfig interface, MONITORED_PORTS const, PORTS_PER_PAGE const |
| **Folder structure** | `src/config/` for data, `src/features/quote/components/widgets/` for UI |
| **Import order** | React → lucide-react → hooks → components → config → types |
| **Error handling** | fetchWithRetry + WidgetError + retry callback |
| **Testing** | Vitest + @testing-library/react, mock hooks, fake timers for auto-rotate |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| (없음) | Open-Meteo API는 키 불필요 | - | - |

---

## 8. Port Coverage Map

### 24 Monitored Ports by Region

| Region | Country | Port | Code | Lat | Lon |
|--------|---------|------|------|-----|-----|
| **Korea** | KR | Incheon | KR-ICN | 37.46 | 126.71 |
| | KR | Busan | KR-PUS | 35.18 | 129.08 |
| **Asia-Pacific** | CN | Shanghai | CN-SHA | 31.23 | 121.47 |
| | JP | Tokyo | JP-TYO | 35.44 | 139.64 |
| | VN | Ho Chi Minh | VN-SGN | 10.82 | 106.63 |
| | SG | Singapore | SG-SIN | 1.26 | 103.82 |
| | HK | Hong Kong | HK-HKG | 22.32 | 114.17 |
| | TW | Kaohsiung | TW-KHH | 22.62 | 120.31 |
| | TH | Laem Chabang | TH-LCB | 13.08 | 100.88 |
| | PH | Manila | PH-MNL | 14.60 | 120.98 |
| | AU | Sydney | AU-SYD | -33.87 | 151.21 |
| | IN | Mumbai | IN-BOM | 19.08 | 72.88 |
| **Americas** | US | Los Angeles | US-LAX | 33.75 | -118.25 |
| | CA | Vancouver | CA-YVR | 49.28 | -123.12 |
| | BR | Santos | BR-SSZ | -23.96 | -46.33 |
| **Europe** | DE | Hamburg | DE-HAM | 53.55 | 9.99 |
| | GB | Felixstowe | GB-FXT | 51.96 | 1.35 |
| | FR | Le Havre | FR-LEH | 49.49 | 0.11 |
| | IT | Genoa | IT-GOA | 44.41 | 8.95 |
| | ES | Barcelona | ES-BCN | 41.39 | 2.17 |
| | NL | Rotterdam | NL-RTM | 51.92 | 4.48 |
| **Middle East** | AE | Jebel Ali | AE-JEA | 25.07 | 55.17 |
| | SA | Jeddah | SA-JED | 21.54 | 39.17 |
| | TR | Istanbul | TR-IST | 41.01 | 28.98 |

---

## 9. Next Steps

1. [x] Plan document 작성
2. [ ] Design document 작성 (`/pdca design global-port-weather`)
3. [ ] Gap Analysis 실행 (`/pdca analyze global-port-weather`)
4. [ ] Completion Report 생성

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-26 | Initial draft (구현 완료 후 역방향 Plan) | Claude Code |
