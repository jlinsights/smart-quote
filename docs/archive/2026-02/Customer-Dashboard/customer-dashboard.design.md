# Customer Dashboard Design Document

> **Summary**: Dedicated customer portal with live weather/news widgets and filtered quote history
>
> **Project**: smart-quote-main
> **Version**: 1.0
> **Author**: Claude Code
> **Date**: 2026-02-26
> **Status**: Draft
> **Planning Doc**: [customer-dashboard.plan.md](../../01-plan/features/customer-dashboard.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. Replace `/dashboard` dual-purpose QuoteCalculator with a dedicated `CustomerDashboard` page
2. Integrate Open-Meteo API for live port weather data (replacing mock)
3. Integrate RSS-to-JSON proxy for live logistics news (replacing mock)
4. Provide customer-scoped quote history
5. Extend i18n to support Chinese (cn) and Japanese (ja)

### 1.2 Design Principles

- **Separation of Concerns**: Customer dashboard is independent from admin QuoteCalculator
- **Graceful Degradation**: API failures fall back to meaningful error states, never crash
- **Reuse Existing Patterns**: Follow project's established patterns (contexts, api module, feature-based structure)
- **No Backend Changes**: Phase 1 is frontend-only + Vercel serverless

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite)                                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  App.tsx (Router)                                       │ │
│  │    /dashboard → ProtectedRoute → CustomerDashboard      │ │
│  │    /admin    → ProtectedRoute(admin) → QuoteCalculator  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  WeatherWidget   │  │  NoticeWidget    │                  │
│  │  (Open-Meteo)    │  │  (RSS proxy)     │                  │
│  └────────┬─────────┘  └────────┬─────────┘                  │
│           │                      │                            │
│  ┌────────▼─────────┐  ┌────────▼─────────┐                  │
│  │  weatherApi.ts   │  │  noticeApi.ts    │                  │
│  └────────┬─────────┘  └────────┬─────────┘                  │
└───────────┼──────────────────────┼────────────────────────────┘
            │                      │
   ┌────────▼─────────┐  ┌────────▼──────────────┐
   │  Open-Meteo API  │  │  Vercel Serverless     │
   │  (free, no key)  │  │  /api/logistics-news   │
   └──────────────────┘  │  (RSS → JSON proxy)    │
                         └────────┬───────────────┘
                                  │
                         ┌────────▼─────────┐
                         │  RSS Feeds       │
                         │  FreightWaves    │
                         │  The Loadstar    │
                         │  gCaptain        │
                         └──────────────────┘
```

### 2.2 Data Flow

```
1. CustomerDashboard mounts
   ├── WeatherWidget: useEffect → weatherApi.fetchPortWeather() → Open-Meteo → setState
   ├── NoticeWidget:  useEffect → noticeApi.fetchLogisticsNews() → /api/logistics-news → setState
   └── QuoteHistory:  useEffect → quoteApi.listQuotes({user_email}) → Rails API → setState

2. Auto-refresh (WeatherWidget only):
   setInterval(30min) → weatherApi.fetchPortWeather() → update state

3. Language change:
   LanguageContext.setLanguage('ja') → all components re-render with new translations
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| CustomerDashboard | AuthContext | Get user email/role for welcome banner + quote filter |
| CustomerDashboard | LanguageContext | Translations |
| WeatherWidget | weatherApi.ts | Open-Meteo data fetching |
| NoticeWidget | noticeApi.ts | RSS proxy data fetching |
| QuoteHistoryCompact | quoteApi.ts | Existing quote list API |
| /api/logistics-news | (none - serverless) | RSS-to-JSON proxy |

---

## 3. Data Model

### 3.1 Weather Data Types

```typescript
// src/types/dashboard.ts (new file)

export interface PortWeather {
  port: string;           // Display name: "Busan (KR)"
  code: string;           // Port code: "KR-PUS"
  latitude: number;
  longitude: number;
  temperature: number;    // Celsius from Open-Meteo
  weatherCode: number;    // WMO weather code (0-99)
  windSpeed: number;      // km/h from Open-Meteo
  condition: string;      // Derived: "Sunny" | "Cloudy" | "Rain" | "Storm" | "Snow" | "Fog"
  status: PortStatus;     // Derived from weatherCode severity
}

export type PortStatus = 'Normal' | 'Delay' | 'Warning';

export interface LogisticsNews {
  title: string;
  link: string;
  pubDate: string;        // ISO date string
  source: string;         // "FreightWaves" | "The Loadstar" | "gCaptain"
}

// Open-Meteo API response shape (partial)
export interface OpenMeteoResponse {
  latitude: number[];
  longitude: number[];
  current: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
}
```

### 3.2 Port Configuration

```typescript
// src/config/ports.ts (new file)

export interface PortConfig {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  country: string;
}

export const MONITORED_PORTS: PortConfig[] = [
  { name: 'Busan',     code: 'KR-PUS', latitude: 35.1796, longitude: 129.0756, country: 'KR' },
  { name: 'Los Angeles', code: 'US-LAX', latitude: 33.7501, longitude: -118.2500, country: 'US' },
  { name: 'Rotterdam', code: 'NL-RTM', latitude: 51.9225, longitude: 4.4792,   country: 'NL' },
  { name: 'Shanghai',  code: 'CN-SHA', latitude: 31.2304, longitude: 121.4737, country: 'CN' },
  { name: 'Singapore', code: 'SG-SIN', latitude: 1.2644,  longitude: 103.8223, country: 'SG' },
  { name: 'Hamburg',   code: 'DE-HAM', latitude: 53.5511, longitude: 9.9937,   country: 'DE' },
];
```

### 3.3 WMO Weather Code Mapping

```typescript
// src/config/weatherCodes.ts (new file)

export interface WeatherMapping {
  condition: string;
  icon: string;          // Lucide icon name
  status: PortStatus;
}

// WMO Weather interpretation codes (WMO 4677)
export function mapWeatherCode(code: number): WeatherMapping {
  if (code === 0)                    return { condition: 'Clear',      icon: 'Sun',            status: 'Normal' };
  if (code <= 3)                     return { condition: 'Cloudy',     icon: 'Cloud',          status: 'Normal' };
  if (code >= 45 && code <= 48)      return { condition: 'Fog',        icon: 'CloudFog',       status: 'Delay' };
  if (code >= 51 && code <= 57)      return { condition: 'Drizzle',    icon: 'CloudDrizzle',   status: 'Normal' };
  if (code >= 61 && code <= 67)      return { condition: 'Rain',       icon: 'CloudRain',      status: 'Delay' };
  if (code >= 71 && code <= 77)      return { condition: 'Snow',       icon: 'CloudSnow',      status: 'Delay' };
  if (code >= 80 && code <= 82)      return { condition: 'Showers',    icon: 'CloudRain',      status: 'Delay' };
  if (code >= 95 && code <= 99)      return { condition: 'Storm',      icon: 'CloudLightning', status: 'Warning' };
  return                               { condition: 'Unknown',    icon: 'Cloud',          status: 'Normal' };
}
```

---

## 4. API Specification

### 4.1 External APIs

| API | Method | URL | Auth | Cache |
|-----|--------|-----|------|-------|
| Open-Meteo | GET | `https://api.open-meteo.com/v1/forecast` | None | Client: 30min |
| Logistics News | GET | `/api/logistics-news` | None | Vercel: 15min |

### 4.2 Open-Meteo Request

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=35.18,33.75,51.92,31.23,1.26,53.55
  &longitude=129.08,-118.25,4.48,121.47,103.82,9.99
  &current=temperature_2m,weather_code,wind_speed_10m
  &timezone=auto
```

**Response (200):**
```json
[
  {
    "latitude": 35.2,
    "longitude": 129.0,
    "current": {
      "time": "2026-02-26T10:00",
      "temperature_2m": 4.2,
      "weather_code": 3,
      "wind_speed_10m": 12.5
    }
  }
]
```

### 4.3 Logistics News Serverless Proxy

**File**: `api/logistics-news.ts` (Vercel serverless)

**Request**: `GET /api/logistics-news`

**Response (200):**
```json
{
  "items": [
    {
      "title": "US West Coast port congestion easing",
      "link": "https://freightwaves.com/news/...",
      "pubDate": "2026-02-26T08:30:00Z",
      "source": "FreightWaves"
    }
  ],
  "fetchedAt": "2026-02-26T10:00:00Z"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to fetch RSS feeds",
  "fetchedAt": "2026-02-26T10:00:00Z"
}
```

**Cache Headers**:
```
Cache-Control: s-maxage=900, stale-while-revalidate=300
```

### 4.4 Serverless Function Implementation Design

```typescript
// api/logistics-news.ts

// RSS Sources (fetch in parallel)
const RSS_FEEDS = [
  { url: 'https://www.freightwaves.com/feed', source: 'FreightWaves' },
  { url: 'https://theloadstar.com/feed',       source: 'The Loadstar' },
  { url: 'https://gcaptain.com/feed',           source: 'gCaptain' },
];

// Parse approach: Simple regex extraction from XML
// No npm dependency needed — use native fetch + regex for <title>, <link>, <pubDate>
// Pattern: /<item>.*?<title>(.*?)<\/title>.*?<link>(.*?)<\/link>.*?<pubDate>(.*?)<\/pubDate>.*?<\/item>/gs

// Response: Merge all feeds, sort by pubDate desc, take top 10
// Set Cache-Control: s-maxage=900, stale-while-revalidate=300
```

---

## 5. UI/UX Design

### 5.1 Desktop Layout (lg+)

```
┌─────────────────────────────────────────────────────────────────┐
│  Header (existing: logo, nav, language selector, theme toggle)  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Welcome Banner                                           │  │
│  │  "Welcome back, {email}" + "New Quote" button             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────┐ ┌──────────────────────────────┐  │
│  │  WeatherWidget           │ │  NoticeWidget                │  │
│  │  ┌──────┐ ┌──────┐      │ │  ┌──────────────────────────┐│  │
│  │  │Busan │ │ LAX  │      │ │  │ [!] US Port strike...    ││  │
│  │  │ 4°C  │ │18°C  │      │ │  │ [i] Q1 surcharge...      ││  │
│  │  └──────┘ └──────┘      │ │  │ [*] EU discount event... ││  │
│  │  ┌──────┐ ┌──────┐      │ │  └──────────────────────────┘│  │
│  │  │Rott. │ │Shangh│      │ │  [View All Notices]          │  │
│  │  │ 2°C  │ │ 8°C  │      │ │                              │  │
│  │  └──────┘ └──────┘      │ │                              │  │
│  │  ┌──────┐ ┌──────┐      │ │                              │  │
│  │  │S'pore│ │Hamb. │      │ │                              │  │
│  │  │28°C  │ │ 1°C  │      │ │                              │  │
│  │  └──────┘ └──────┘      │ │                              │  │
│  └──────────────────────────┘ └──────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  My Recent Quotes (last 5)                    [View All]  │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │ SQ-2026-0042 │ US → DE │ UPS │ $1,234 │ 2026-02-25 │ │  │
│  │  │ SQ-2026-0041 │ KR → JP │ DHL │ $890   │ 2026-02-24 │ │  │
│  │  │ ...                                                  │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Mobile Layout (< lg)

```
┌─────────────────────────┐
│  Header (hamburger nav) │
├─────────────────────────┤
│  Welcome Banner         │
│  + "New Quote" CTA      │
├─────────────────────────┤
│  WeatherWidget          │
│  (2-col grid, 6 ports)  │
├─────────────────────────┤
│  NoticeWidget           │
│  (full-width list)      │
├─────────────────────────┤
│  My Recent Quotes       │
│  (compact card list)    │
└─────────────────────────┘
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `CustomerDashboard` | `src/pages/CustomerDashboard.tsx` | Page layout, data orchestration |
| `WelcomeBanner` | `src/features/dashboard/components/WelcomeBanner.tsx` | User greeting, quick actions |
| `WeatherWidget` | `src/features/quote/components/widgets/WeatherWidget.tsx` | Port weather display (existing, modify) |
| `NoticeWidget` | `src/features/quote/components/widgets/NoticeWidget.tsx` | Logistics news display (existing, modify) |
| `QuoteHistoryCompact` | `src/features/dashboard/components/QuoteHistoryCompact.tsx` | Compact recent quotes list |
| `WidgetSkeleton` | `src/features/dashboard/components/WidgetSkeleton.tsx` | Loading placeholder for widgets |
| `WidgetError` | `src/features/dashboard/components/WidgetError.tsx` | Error fallback state |

### 5.4 Widget States

Each widget has 3 states:

| State | Display |
|-------|---------|
| **Loading** | Skeleton animation (pulse) matching widget layout |
| **Success** | Live data display |
| **Error** | "Unable to load data. Retry?" message with retry button |

---

## 6. Error Handling

### 6.1 Error Scenarios

| Scenario | Cause | Handling |
|----------|-------|----------|
| Open-Meteo timeout | Network/API down | Show "Weather data unavailable" + last cached data if any |
| Open-Meteo rate limit | >10K req/day | 30-min interval prevents this; fallback to error state |
| RSS proxy failure | RSS feed down | Show "News unavailable" with retry button |
| RSS XML parse error | Feed format change | Defensive regex, skip malformed items, log error |
| Quote API failure | Rails API down | Show "Unable to load quotes" with retry |
| Invalid weather code | Unknown WMO code | Default to "Unknown" condition, "Normal" status |

### 6.2 Retry Strategy

```typescript
// Simple retry with exponential backoff (max 3 attempts)
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Unreachable');
}
```

---

## 7. Security Considerations

- [x] No API keys exposed (Open-Meteo is keyless; RSS proxy is server-side)
- [x] Vercel serverless proxy prevents CORS exposure of RSS endpoints
- [x] RSS content sanitized (text-only title/link/date extraction, no HTML rendering)
- [x] ProtectedRoute ensures auth check before dashboard access
- [ ] Rate limiting on serverless proxy (defer to Phase 2 - Vercel has built-in DDoS protection)
- [ ] Content Security Policy headers (defer to Phase 2)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool |
|------|--------|------|
| Unit Test | weatherApi, noticeApi, mapWeatherCode | Vitest |
| Unit Test | WeatherWidget, NoticeWidget, CustomerDashboard | Vitest + Testing Library |
| Manual Test | Live API integration, dark mode, responsive | Browser |

### 8.2 Test Cases

**weatherApi.ts**:
- [x] `fetchPortWeather()` builds correct URL with all port coordinates
- [x] `fetchPortWeather()` parses Open-Meteo response into PortWeather[]
- [x] `fetchPortWeather()` handles network error gracefully
- [x] `mapWeatherCode(0)` returns Clear/Normal
- [x] `mapWeatherCode(95)` returns Storm/Warning
- [x] `mapWeatherCode(999)` returns Unknown/Normal (defensive)

**noticeApi.ts**:
- [x] `fetchLogisticsNews()` returns normalized LogisticsNews[]
- [x] `fetchLogisticsNews()` handles server error
- [x] Items sorted by pubDate descending

**WeatherWidget**:
- [x] Renders loading skeleton initially
- [x] Renders 6 port cards with temperature + status on success
- [x] Renders error state on API failure
- [x] Respects language context for labels

**NoticeWidget**:
- [x] Renders loading skeleton initially
- [x] Renders news items with title + date + source
- [x] Renders error state on API failure
- [x] "View All" button present

**CustomerDashboard**:
- [x] Renders welcome banner with user email
- [x] Renders both widgets
- [x] Renders quote history section
- [x] Shows empty state when no quotes exist

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Presentation** | Pages, widget components, layout | `src/pages/`, `src/features/*/components/` |
| **Application** | Data fetching hooks, state management | `src/features/dashboard/hooks/` |
| **Domain** | Types, configs, business logic | `src/types/dashboard.ts`, `src/config/ports.ts` |
| **Infrastructure** | API clients, serverless functions | `src/api/`, `api/` |

### 9.2 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| CustomerDashboard | Presentation | `src/pages/CustomerDashboard.tsx` |
| WelcomeBanner | Presentation | `src/features/dashboard/components/WelcomeBanner.tsx` |
| WeatherWidget | Presentation | `src/features/quote/components/widgets/WeatherWidget.tsx` |
| NoticeWidget | Presentation | `src/features/quote/components/widgets/NoticeWidget.tsx` |
| usePortWeather | Application | `src/features/dashboard/hooks/usePortWeather.ts` |
| useLogisticsNews | Application | `src/features/dashboard/hooks/useLogisticsNews.ts` |
| PortWeather, LogisticsNews | Domain | `src/types/dashboard.ts` |
| MONITORED_PORTS | Domain | `src/config/ports.ts` |
| mapWeatherCode | Domain | `src/config/weatherCodes.ts` |
| weatherApi | Infrastructure | `src/api/weatherApi.ts` |
| noticeApi | Infrastructure | `src/api/noticeApi.ts` |
| logistics-news proxy | Infrastructure | `api/logistics-news.ts` |

---

## 10. Coding Convention Reference

### 10.1 Project Conventions (from existing codebase)

| Item | Convention |
|------|-----------|
| Component naming | PascalCase: `CustomerDashboard.tsx`, `WelcomeBanner.tsx` |
| Hook naming | camelCase with `use` prefix: `usePortWeather.ts` |
| API module naming | camelCase: `weatherApi.ts`, `noticeApi.ts` |
| Config files | camelCase: `ports.ts`, `weatherCodes.ts` |
| Type files | camelCase: `dashboard.ts` |
| Import style | `@/` path alias: `import { useAuth } from '@/contexts/AuthContext'` |
| State management | React Context (AuthContext, LanguageContext, ThemeContext) |
| Styling | Tailwind utility classes, `jways-*` palette, `dark:` prefix |
| Error handling | Try/catch in API layer, error state in components |

### 10.2 Import Order (existing pattern)

```typescript
import React, { useState, useEffect } from 'react';           // 1. React
import { useNavigate } from 'react-router-dom';                // 2. External libs
import { CloudRain, Sun } from 'lucide-react';                 // 3. Icons
import { useAuth } from '@/contexts/AuthContext';               // 4. Internal @/ imports
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchPortWeather } from '@/api/weatherApi';
import type { PortWeather } from '@/types/dashboard';           // 5. Type imports
```

---

## 11. Implementation Guide

### 11.1 New File Structure

```
src/
├── api/
│   ├── weatherApi.ts          (NEW) Open-Meteo client
│   └── noticeApi.ts           (NEW) Logistics news client
├── config/
│   ├── ports.ts               (NEW) Monitored port coordinates
│   └── weatherCodes.ts        (NEW) WMO code → condition mapping
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── WelcomeBanner.tsx        (NEW)
│   │   │   ├── QuoteHistoryCompact.tsx  (NEW)
│   │   │   ├── WidgetSkeleton.tsx       (NEW)
│   │   │   └── WidgetError.tsx          (NEW)
│   │   └── hooks/
│   │       ├── usePortWeather.ts        (NEW)
│   │       └── useLogisticsNews.ts      (NEW)
│   └── quote/components/widgets/
│       ├── WeatherWidget.tsx   (MODIFY) Replace mock → API
│       └── NoticeWidget.tsx    (MODIFY) Replace mock → API
├── pages/
│   └── CustomerDashboard.tsx   (NEW) Dashboard page
├── types/
│   └── dashboard.ts            (NEW) Dashboard-specific types
├── i18n/
│   └── translations.ts         (MODIFY) Add cn/ja + new dashboard keys
api/
└── logistics-news.ts           (NEW) Vercel serverless RSS proxy

MODIFIED:
├── src/App.tsx                  Route change: /dashboard → CustomerDashboard
└── src/i18n/translations.ts     Add Language type union + cn/ja objects
```

### 11.2 Implementation Order

1. **Domain layer first**: Types (`dashboard.ts`), configs (`ports.ts`, `weatherCodes.ts`)
2. **Infrastructure**: API clients (`weatherApi.ts`, `noticeApi.ts`), serverless (`api/logistics-news.ts`)
3. **Application hooks**: `usePortWeather.ts`, `useLogisticsNews.ts`
4. **Presentation**: Modify WeatherWidget, NoticeWidget, create dashboard components
5. **Page**: `CustomerDashboard.tsx`
6. **Routing**: Update `App.tsx`
7. **i18n**: Add cn/ja translations + new dashboard keys
8. **Tests**: Unit tests for API, components, and hooks

### 11.3 Checklist

- [ ] Create `src/types/dashboard.ts` with PortWeather, LogisticsNews, OpenMeteoResponse
- [ ] Create `src/config/ports.ts` with MONITORED_PORTS array
- [ ] Create `src/config/weatherCodes.ts` with mapWeatherCode function
- [ ] Create `src/api/weatherApi.ts` with fetchPortWeather
- [ ] Create `src/api/noticeApi.ts` with fetchLogisticsNews
- [ ] Create `api/logistics-news.ts` (Vercel serverless RSS proxy)
- [ ] Create `src/features/dashboard/hooks/usePortWeather.ts`
- [ ] Create `src/features/dashboard/hooks/useLogisticsNews.ts`
- [ ] Create `src/features/dashboard/components/WelcomeBanner.tsx`
- [ ] Create `src/features/dashboard/components/QuoteHistoryCompact.tsx`
- [ ] Create `src/features/dashboard/components/WidgetSkeleton.tsx`
- [ ] Create `src/features/dashboard/components/WidgetError.tsx`
- [ ] Modify `src/features/quote/components/widgets/WeatherWidget.tsx` (replace mock)
- [ ] Modify `src/features/quote/components/widgets/NoticeWidget.tsx` (replace mock)
- [ ] Create `src/pages/CustomerDashboard.tsx`
- [ ] Modify `src/App.tsx` (update /dashboard route)
- [ ] Modify `src/i18n/translations.ts` (add cn/ja + dashboard.* keys)
- [ ] Write tests: weatherApi, noticeApi, WeatherWidget, NoticeWidget, CustomerDashboard
- [ ] Verify: tsc --noEmit, eslint, vitest run

---

## i18n: New Translation Keys

### Dashboard-specific keys to add

```typescript
// Add to all 4 language objects (en, ko, cn, ja)
'dashboard.welcome': 'Welcome back',
'dashboard.newQuote': 'New Quote',
'dashboard.recentQuotes': 'My Recent Quotes',
'dashboard.viewAll': 'View All',
'dashboard.noQuotes': 'No quotes yet. Create your first quote!',
'dashboard.createFirst': 'Create Quote',
'widget.weather.loading': 'Loading weather data...',
'widget.weather.error': 'Unable to load weather data',
'widget.weather.retry': 'Retry',
'widget.weather.lastUpdated': 'Last updated',
'widget.notice.loading': 'Loading logistics news...',
'widget.notice.error': 'Unable to load news',
'widget.notice.retry': 'Retry',
```

### Language type change

```typescript
// Before
export type Language = 'en' | 'ko';

// After
export type Language = 'en' | 'ko' | 'cn' | 'ja';
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-02-26 | Initial draft | Claude Code |
