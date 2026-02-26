# Global Port Weather Design Document

> **Summary**: 24개 글로벌 항구 기상 위젯 설계 - MONITORED_PORTS 확장, Auto Pagination UI, Open-Meteo 배치 API 활용
>
> **Project**: Smart Quote System (Goodman GLS & J-Ways)
> **Version**: 0.1.0
> **Author**: Claude Code
> **Date**: 2026-02-26
> **Status**: Draft
> **Planning Doc**: [global-port-weather.plan.md](../../01-plan/features/global-port-weather.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 6개 항구에서 24개 항구로 확장하여 22개 도착국가 전체 커버리지 달성
2. Auto Pagination으로 6개 초과 데이터를 사용자 친화적으로 표시
3. 기존 weatherApi / usePortWeather 변경 없이 config 레이어만 확장 (Open/Closed)
4. React 19 ESLint 규칙 (set-state-in-effect, refs-in-render) 준수

### 1.2 Design Principles

- **Open/Closed Principle**: MONITORED_PORTS 배열 확장만으로 API/Hook 자동 확장
- **Single Responsibility**: ports.ts(데이터), weatherApi.ts(통신), usePortWeather.ts(상태), WeatherWidget.tsx(UI) 분리
- **KISS**: safePage 클램핑으로 복잡한 useEffect/useRef 패턴 회피
- **Accessibility**: ARIA label 기반 페이지네이션 컨트롤

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  /quote Page                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  WeatherWidget (Presentation)                              │  │
│  │  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐ │  │
│  │  │ Header   │  │ Port Cards Grid  │  │ Pagination       │ │  │
│  │  │ + Page # │  │ (6 per page)     │  │ Prev/Dots/Next   │ │  │
│  │  └──────────┘  └──────────────────┘  └──────────────────┘ │  │
│  └──────────────┬─────────────────────────────────────────────┘  │
│                 │ usePortWeather()                                │
│  ┌──────────────▼─────────────────────────────────────────────┐  │
│  │  usePortWeather Hook (Application)                         │  │
│  │  - 30분 갱신 interval                                      │  │
│  │  - loading/error/data 상태 관리                             │  │
│  └──────────────┬─────────────────────────────────────────────┘  │
│                 │ fetchPortWeather()                              │
│  ┌──────────────▼─────────────────────────────────────────────┐  │
│  │  weatherApi (Infrastructure)                                │  │
│  │  - Open-Meteo batch API 호출                                │  │
│  │  - fetchWithRetry (1s, 2s, 4s backoff)                     │  │
│  │  - MONITORED_PORTS → lat/lon 쉼표 구분 파라미터             │  │
│  └──────────────┬─────────────────────────────────────────────┘  │
│                 │ MONITORED_PORTS[]                               │
│  ┌──────────────▼─────────────────────────────────────────────┐  │
│  │  ports.ts (Domain/Config)                                   │  │
│  │  - 24 PortConfig entries                                    │  │
│  │  - PORTS_PER_PAGE = 6                                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
MONITORED_PORTS (24 ports)
  → weatherApi: batch coordinates → Open-Meteo API → PortWeather[]
    → usePortWeather: 30min refresh, loading/error state
      → WeatherWidget: paginate(data, PORTS_PER_PAGE) → render grid + pagination
        → Auto-rotate: setInterval(5s) → next page
        → Manual: prev/next buttons, dot indicators → goToPage
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| WeatherWidget | usePortWeather | 기상 데이터 fetch + 상태 |
| WeatherWidget | PORTS_PER_PAGE | 페이지당 항구 수 |
| WeatherWidget | WidgetSkeleton, WidgetError | 로딩/에러 UI |
| usePortWeather | fetchPortWeather | API 호출 |
| fetchPortWeather | MONITORED_PORTS | 항구 좌표 데이터 |
| fetchPortWeather | fetchWithRetry | 재시도 유틸리티 |
| fetchPortWeather | mapWeatherCode | WMO 코드 → 상태 매핑 |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// src/config/ports.ts - Domain/Config Layer
export interface PortConfig {
  name: string;       // 항구/도시 이름 (영문)
  code: string;       // 고유 코드 (CC-XXX format, e.g., KR-ICN)
  latitude: number;   // 위도 (소수점 4자리)
  longitude: number;  // 경도 (소수점 4자리)
  country: string;    // ISO 3166-1 alpha-2 국가 코드
}

export const PORTS_PER_PAGE = 6;  // 페이지당 표시 항구 수

// src/types/dashboard.ts - Domain Layer
export interface PortWeather {
  port: string;           // "Name (CC)" format
  code: string;           // PortConfig.code
  latitude: number;
  longitude: number;
  temperature: number;    // 반올림 정수 (°C)
  weatherCode: number;    // WMO weather code
  windSpeed: number;      // 반올림 정수 (km/h)
  condition: WeatherCondition;  // 'Clear' | 'Cloudy' | 'Rain' | ...
  status: PortStatus;          // 'Normal' | 'Delay' | 'Warning'
}

// Open-Meteo API Response
export interface OpenMeteoResult {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}
```

### 3.2 Port Data Structure (24 Ports)

```
MONITORED_PORTS[24]:
├── Korea (2)
│   ├── KR-ICN: Incheon (37.46, 126.71)
│   └── KR-PUS: Busan (35.18, 129.08)
├── Asia-Pacific (10)
│   ├── CN-SHA: Shanghai (31.23, 121.47)
│   ├── JP-TYO: Tokyo (35.44, 139.64)
│   ├── VN-SGN: Ho Chi Minh (10.82, 106.63)
│   ├── SG-SIN: Singapore (1.26, 103.82)
│   ├── HK-HKG: Hong Kong (22.32, 114.17)
│   ├── TW-KHH: Kaohsiung (22.62, 120.31)
│   ├── TH-LCB: Laem Chabang (13.08, 100.88)
│   ├── PH-MNL: Manila (14.60, 120.98)
│   ├── AU-SYD: Sydney (-33.87, 151.21)
│   └── IN-BOM: Mumbai (19.08, 72.88)
├── Americas (3)
│   ├── US-LAX: Los Angeles (33.75, -118.25)
│   ├── CA-YVR: Vancouver (49.28, -123.12)
│   └── BR-SSZ: Santos (-23.96, -46.33)
├── Europe (6)
│   ├── DE-HAM: Hamburg (53.55, 9.99)
│   ├── GB-FXT: Felixstowe (51.96, 1.35)
│   ├── FR-LEH: Le Havre (49.49, 0.11)
│   ├── IT-GOA: Genoa (44.41, 8.95)
│   ├── ES-BCN: Barcelona (41.39, 2.17)
│   └── NL-RTM: Rotterdam (51.92, 4.48)
└── Middle East (3)
    ├── AE-JEA: Jebel Ali (25.07, 55.17)
    ├── SA-JED: Jeddah (21.54, 39.17)
    └── TR-IST: Istanbul (41.01, 28.98)
```

---

## 4. API Specification

### 4.1 External API: Open-Meteo Forecast

| Method | URL | Description | Auth |
|--------|-----|-------------|------|
| GET | `api.open-meteo.com/v1/forecast` | 배치 기상 데이터 | None (무료) |

### 4.2 Request Format

```
GET /v1/forecast
  ?latitude=37.46,35.18,...(24개 쉼표 구분)
  &longitude=126.71,129.08,...(24개 쉼표 구분)
  &current=temperature_2m,weather_code,wind_speed_10m
  &timezone=auto
```

- 좌표값은 `toFixed(2)`로 소수점 2자리 전달
- 배치 호출: 단일 GET 요청으로 24개 좌표 동시 조회
- 응답: 1개 좌표 → 단일 객체, 2개+ → 배열

### 4.3 Response Format (Array of 24)

```json
[
  {
    "current": {
      "temperature_2m": 2.3,
      "weather_code": 3,
      "wind_speed_10m": 15.2
    }
  },
  ...
]
```

### 4.4 Error Handling

| Scenario | Strategy | Implementation |
|----------|----------|----------------|
| Network failure | fetchWithRetry (3회, 지수 백오프 1s/2s/4s) | `src/lib/fetchWithRetry.ts` |
| HTTP 4xx/5xx | throw Error → WidgetError UI | `weatherApi.ts:16-18` |
| Partial failure | 전체 재시도 (배치 호출 특성) | fetchWithRetry |
| Rate limit | 30분 간격으로 48 req/day (10K 한도 대비 충분) | `usePortWeather.ts` |

---

## 5. UI/UX Design

### 5.1 Widget Layout

```
┌────────────────────────────────────────────────────┐
│  [☀] Global Port Weather              1 / 4        │  ← Header + Page indicator
├────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Incheon  │  │ Busan    │  │ Shanghai │         │  ← Row 1 (3 cols on lg)
│  │ ☁ 2°C   │  │ ☀ 4°C   │  │ 🌧 8°C  │         │
│  │ Normal   │  │ Normal   │  │ Delay    │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Tokyo    │  │ Ho Chi M │  │Singapore │         │  ← Row 2
│  │ ☁ 6°C   │  │ ☀ 30°C  │  │ ☀ 28°C  │         │
│  │ Normal   │  │ Normal   │  │ Normal   │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                    │
│           ◀  ● ○ ○ ○  ▶                           │  ← Pagination controls
│                                                    │
│  * widget.weather.desc                             │  ← Footer description
└────────────────────────────────────────────────────┘
```

### 5.2 Responsive Grid

| Breakpoint | Columns | Cards/Page |
|------------|---------|------------|
| Mobile (<lg) | 2 | 6 (3 rows x 2 cols) |
| Desktop (lg+) | 3 | 6 (2 rows x 3 cols) |

### 5.3 Pagination Behavior

| Condition | Behavior |
|-----------|----------|
| ports <= 6 | No pagination, standard grid |
| ports > 6 | Auto-rotate 5초 + manual prev/next + dot indicators |
| Auto-rotate | `setInterval(5000ms)`, 마지막 → 첫 페이지 순환 |
| Manual click | 즉시 페이지 이동, auto-rotate 계속 |
| Loading/Error | Auto-rotate 비활성화 |

### 5.4 Port Card Design

```
┌─────────────────────────┐
│  Port Name     [Icon]   │  ← text-xs font-bold + weather icon (w-5 h-5)
│                         │
│  18°C         NORMAL    │  ← text-lg font-extrabold + status badge
└─────────────────────────┘
   bg-gray-50 dark:bg-jways-900/40
   border border-gray-100 dark:border-jways-700/50
   rounded-xl p-3
```

### 5.5 Weather Icon Mapping

| Condition | Icon | Color |
|-----------|------|-------|
| Clear | Sun | amber-500 |
| Cloudy | Cloud | gray-400 |
| Rain | CloudRain | blue-500 |
| Drizzle | CloudDrizzle | blue-400 |
| Snow | CloudSnow | cyan-400 |
| Storm | CloudLightning | purple-500 |
| Fog | CloudFog | gray-300 |
| Windy | Wind | teal-400 |

### 5.6 Status Badge Colors

| Status | Light Mode | Dark Mode |
|--------|------------|-----------|
| Normal | bg-green-100 text-green-700 | bg-green-900/30 text-green-400 |
| Delay | bg-red-100 text-red-700 | bg-red-900/30 text-red-400 |
| Warning | bg-amber-100 text-amber-700 | bg-amber-900/30 text-amber-400 |

### 5.7 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| WeatherWidget | `src/features/quote/components/widgets/WeatherWidget.tsx` | 기상 위젯 전체 (페이지네이션 포함) |
| WidgetSkeleton | `src/features/dashboard/components/WidgetSkeleton.tsx` | 로딩 상태 UI |
| WidgetError | `src/features/dashboard/components/WidgetError.tsx` | 에러 상태 + 재시도 UI |

---

## 6. Error Handling

### 6.1 Error States

| State | UI | Recovery |
|-------|-----|---------|
| Loading | WidgetSkeleton (6 pulse lines) | 자동 완료 대기 |
| API Error | WidgetError + "Retry" 버튼 | 사용자 클릭 → retry() |
| Network Timeout | fetchWithRetry 3회 후 에러 | 자동 재시도 → 실패 시 에러 UI |
| Empty Data | 빈 그리드 (edge case) | 30분 후 자동 갱신 |

### 6.2 Page Boundary Safety

```typescript
// safePage 클램핑: 데이터 변경 시 currentPage가 범위 밖이 되는 것을 방지
const totalPages = Math.max(1, Math.ceil(data.length / PORTS_PER_PAGE));
const safePage = Math.min(currentPage, totalPages - 1);
const pageData = data.slice(safePage * PORTS_PER_PAGE, (safePage + 1) * PORTS_PER_PAGE);
```

이 패턴은 React 19의 `set-state-in-effect` 규칙을 우회하면서도 안전한 페이지 범위를 보장한다.

---

## 7. Security Considerations

- [x] Open-Meteo API는 인증 불필요 (공개 무료 API)
- [x] 사용자 입력 없음 (모든 데이터는 서버 config에서 결정)
- [x] XSS 위험 없음 (외부 HTML 렌더링 없음)
- [x] Rate limit: 30분 간격 호출로 일일 48회 (10K 한도 대비 0.48%)
- [x] HTTPS 통신 (`https://api.open-meteo.com`)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | WeatherWidget (7 cases) | Vitest + @testing-library/react |
| Unit Test | weatherApi (6 cases) | Vitest + vi.fn() mock |

### 8.2 Test Cases

**WeatherWidget Tests** (`WeatherWidget.test.tsx`):

- [x] Loading skeleton: 로딩 시 `animate-pulse` 표시
- [x] 6 ports no pagination: 6개 이하 시 페이지네이션 미표시
- [x] Pagination controls: 12개 포트 시 prev/next/dots 표시, "1 / 2"
- [x] Next page navigation: Next 클릭 → page 2 포트 표시, page 1 미표시
- [x] Auto-rotate: 5초 후 자동 페이지 전환 (fake timers)
- [x] Error state: API 실패 시 에러 메시지 + retry 버튼
- [x] Language context: i18n 키 정상 렌더링

**weatherApi Tests** (`weatherApi.test.ts`):

- [x] 정상 응답 시 24개 PortWeather 매핑
- [x] 첫 번째 항구가 Incheon/KR-ICN
- [x] WMO 코드 → condition/status 매핑
- [x] API 에러 시 throw
- [x] 배치 URL 파라미터 검증
- [x] 단일 좌표 응답 처리 (배열 아닌 경우)

### 8.3 Test Patterns

```typescript
// Auto-rotate 테스트: fake timers + synchronous assertions
it('auto-rotates pages', () => {
  vi.useFakeTimers();
  // ... render with 12 ports
  expect(screen.getByText('1 / 2')).toBeInTheDocument();

  act(() => { vi.advanceTimersByTime(5000); });

  expect(screen.getByText('2 / 2')).toBeInTheDocument();
  vi.useRealTimers();
});
// Note: waitFor()와 fake timers를 함께 사용하면 타임아웃 발생
// → synchronous assertions 사용
```

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | WeatherWidget UI, 페이지네이션 | `src/features/quote/components/widgets/` |
| **Application** | usePortWeather hook (상태 관리, 갱신 주기) | `src/features/dashboard/hooks/` |
| **Domain/Config** | PortConfig, MONITORED_PORTS, PORTS_PER_PAGE | `src/config/ports.ts` |
| **Domain/Types** | PortWeather, OpenMeteoResult | `src/types/dashboard.ts` |
| **Infrastructure** | fetchPortWeather, fetchWithRetry | `src/api/weatherApi.ts`, `src/lib/fetchWithRetry.ts` |

### 9.2 Dependency Rules

```
┌─────────────────────────────────────────────────────────────┐
│                    Dependency Direction                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   WeatherWidget ──→ usePortWeather ──→ fetchPortWeather     │
│        │                                      │              │
│        └──→ PORTS_PER_PAGE          MONITORED_PORTS          │
│                    │                      │                   │
│                    └──────── ports.ts ────┘                   │
│                                                              │
│   Rule: Presentation → Application → Infrastructure → Config │
│         Config는 독립적 (외부 의존 없음)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| WeatherWidget | Presentation | `src/features/quote/components/widgets/WeatherWidget.tsx` |
| usePortWeather | Application | `src/features/dashboard/hooks/usePortWeather.ts` |
| fetchPortWeather | Infrastructure | `src/api/weatherApi.ts` |
| MONITORED_PORTS | Config | `src/config/ports.ts` |
| PORTS_PER_PAGE | Config | `src/config/ports.ts` |
| PortConfig | Domain | `src/config/ports.ts` |
| PortWeather | Domain | `src/types/dashboard.ts` |
| mapWeatherCode | Config | `src/config/weatherCodes.ts` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `WeatherWidget`, `WidgetSkeleton` |
| Hooks | camelCase, use- prefix | `usePortWeather` |
| Constants | UPPER_SNAKE_CASE | `MONITORED_PORTS`, `PORTS_PER_PAGE`, `AUTO_ROTATE_MS` |
| Interfaces | PascalCase | `PortConfig`, `PortWeather` |
| Functions | camelCase | `fetchPortWeather`, `mapWeatherCode` |
| Files (component) | PascalCase.tsx | `WeatherWidget.tsx` |
| Files (config) | kebab-case.ts / camelCase.ts | `ports.ts`, `weatherCodes.ts` |

### 10.2 Import Order

```typescript
// 1. React
import React, { useState, useEffect, useCallback } from 'react';

// 2. External libraries
import { Sun, Cloud, ChevronLeft, ChevronRight } from 'lucide-react';

// 3. Internal hooks
import { usePortWeather } from '@/features/dashboard/hooks/usePortWeather';

// 4. Internal components
import { WidgetSkeleton } from '@/features/dashboard/components/WidgetSkeleton';

// 5. Config
import { PORTS_PER_PAGE } from '@/config/ports';

// 6. Type imports
import type { PortWeather } from '@/types/dashboard';
```

### 10.3 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase (`WeatherWidget`) |
| State management | `useState` (로컬 상태, 글로벌 불필요) |
| Side effects | `useEffect` with cleanup (setInterval) |
| Event handlers | `useCallback` (prevPage, nextPage, goToPage) |
| Page safety | `safePage` 클램핑 (useEffect/useRef 회피) |
| Styling | Tailwind + jways-* palette, dark: variant |
| Accessibility | aria-label on all interactive elements |

---

## 11. Implementation Guide

### 11.1 File Structure

```
src/
├── config/
│   ├── ports.ts              ← MONITORED_PORTS (24개), PORTS_PER_PAGE
│   └── weatherCodes.ts       ← WMO 코드 매핑 (변경 없음)
├── api/
│   ├── weatherApi.ts          ← fetchPortWeather (변경 없음 - 자동 확장)
│   └── __tests__/
│       └── weatherApi.test.ts ← 첫 포트 assertion 업데이트
├── features/
│   ├── dashboard/
│   │   ├── hooks/
│   │   │   └── usePortWeather.ts  ← 30분 갱신 (변경 없음)
│   │   └── components/
│   │       ├── WidgetSkeleton.tsx  ← (변경 없음)
│   │       └── WidgetError.tsx     ← (변경 없음)
│   └── quote/
│       └── components/
│           └── widgets/
│               ├── WeatherWidget.tsx          ← Auto Pagination 추가
│               └── __tests__/
│                   └── WeatherWidget.test.tsx ← 7 test cases
├── lib/
│   └── fetchWithRetry.ts      ← (변경 없음)
└── types/
    └── dashboard.ts            ← PortWeather type (변경 없음)
```

### 11.2 Implementation Order

1. [x] `src/config/ports.ts` - MONITORED_PORTS 24개 확장 + PORTS_PER_PAGE 상수 추가
2. [x] `src/features/quote/components/widgets/WeatherWidget.tsx` - Auto Pagination UI 구현
3. [x] `src/features/quote/components/widgets/__tests__/WeatherWidget.test.tsx` - 7 test cases
4. [x] `src/api/__tests__/weatherApi.test.ts` - 첫 포트 assertion 업데이트

### 11.3 Key Design Decisions

| Decision | Options Considered | Selected | Rationale |
|----------|-------------------|----------|-----------|
| Page boundary | useEffect reset / useRef / safePage clamp | safePage clamp | React 19 ESLint 규칙 준수 |
| Auto-rotate | requestAnimationFrame / setInterval | setInterval(5s) | 간단, 충분한 성능 |
| Pagination UI | Swipe / Carousel / Dots+Arrows | Dots+Arrows | 접근성 + 단순성 |
| State scope | Zustand global / useState local | useState | 위젯 내부 상태, 외부 공유 불필요 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-26 | Initial draft (구현 완료 후 역방향 Design) | Claude Code |
