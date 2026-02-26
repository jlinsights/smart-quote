# PDCA Plan: Customer Dashboard (Phase 1)

**Feature**: Customer Dashboard with Logistics Intelligence
**Created**: 2026-02-26
**Status**: Plan
**Priority**: High
**Effort**: M (1 week)

---

## 1. Background & Objectives

### Problem
External customers currently access the same QuoteCalculator component as admins (via `isPublic` prop). There is no dedicated customer experience, no real-time logistics intelligence, and widget data is hardcoded mock.

### Objectives
1. Dedicated `/dashboard` page with customer-focused layout and role-based routing
2. Live weather data for major ports via Open-Meteo API (replace WeatherWidget mock)
3. Live logistics news via RSS-to-JSON API (replace NoticeWidget mock)
4. Customer-specific quote history (filtered by logged-in user)
5. i18n completion: Chinese (cn) and Japanese (ja) translations

### Success Criteria
- [ ] `/dashboard` renders dedicated customer layout (not QuoteCalculator with `isPublic`)
- [ ] WeatherWidget fetches real-time data from Open-Meteo API
- [ ] NoticeWidget fetches real RSS feed data via RSS-to-JSON service
- [ ] Quote history shows only the logged-in customer's quotes
- [ ] cn/ja translation files cover all existing translation keys
- [ ] All existing tests pass + new widget tests added
- [ ] Responsive layout works on mobile/desktop with dark mode

---

## 2. Current State Analysis

### Existing Assets
| Asset | Path | Status |
|-------|------|--------|
| WeatherWidget | `src/features/quote/components/widgets/WeatherWidget.tsx` | Scaffolded with mock data (4 hardcoded ports) |
| NoticeWidget | `src/features/quote/components/widgets/NoticeWidget.tsx` | Scaffolded with mock data (3 hardcoded notices) |
| AuthContext | `src/contexts/AuthContext.tsx` | localStorage mock, `admin`/`user` roles, 3 admin emails |
| LanguageContext | `src/contexts/LanguageContext.tsx` | en/ko supported, single translations.ts file |
| QuoteCalculator | `src/pages/QuoteCalculator.tsx` | Dual-purpose with `isPublic` prop for /dashboard |
| Routing | `src/App.tsx` | `/dashboard` -> QuoteCalculator(isPublic=true), `/admin` -> QuoteCalculator(isPublic=false) |

### What Needs to Change
1. **Routing**: `/dashboard` should render a new `CustomerDashboard` page, not `QuoteCalculator`
2. **WeatherWidget**: Replace `mockWeather` array with Open-Meteo API fetch
3. **NoticeWidget**: Replace `notices` array with RSS-to-JSON API fetch
4. **Quote History**: Add user-filtered view to CustomerDashboard
5. **Translations**: Add `cn` and `ja` language objects to `translations.ts`

---

## 3. Implementation Plan

### Task 1: CustomerDashboard Page & Layout (M)
**Files to create/modify**:
- `src/pages/CustomerDashboard.tsx` (new)
- `src/App.tsx` (modify route)

**Details**:
- Create `CustomerDashboard` component with responsive grid layout
- Top section: Welcome banner with customer name/email
- Main grid: WeatherWidget + NoticeWidget side-by-side (desktop), stacked (mobile)
- Bottom section: Customer quote history (reuse QuoteHistoryTable with user filter)
- Quick-action: "New Quote" button linking to embedded calculator or /admin
- Update `/dashboard` route in App.tsx to render CustomerDashboard

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│  Welcome Banner (user info + quick CTA) │
├────────────────────┬────────────────────┤
│  WeatherWidget     │  NoticeWidget      │
│  (2x2 port grid)   │  (news list)       │
├────────────────────┴────────────────────┤
│  My Quotes (filtered QuoteHistoryTable) │
└─────────────────────────────────────────┘
```

### Task 2: WeatherWidget — Open-Meteo Integration (M)
**Files to create/modify**:
- `src/features/quote/components/widgets/WeatherWidget.tsx` (modify)
- `src/api/weatherApi.ts` (new)
- `src/features/quote/components/widgets/WeatherWidget.test.tsx` (new)

**Details**:
- Open-Meteo API: `https://api.open-meteo.com/v1/forecast`
- No API key required (free tier, 10K requests/day)
- Target ports with coordinates:
  - Busan (KR): 35.1796, 129.0756
  - Los Angeles (US): 33.7501, -118.2500
  - Rotterdam (NL): 51.9225, 4.4792
  - Shanghai (CN): 31.2304, 121.4737
  - Singapore (SG): 1.2644, 103.8223
  - Hamburg (DE): 53.5511, 9.9937
- Parameters: `current=temperature_2m,weather_code,wind_speed_10m`
- Fetch on mount + 30-minute refresh interval
- Loading skeleton while fetching
- Error fallback to "Data unavailable" state
- Map WMO weather codes to icons (Sun, CloudRain, Wind, etc.)
- Derive port status from weather code severity (Normal/Delay/Warning)

**API Call Example**:
```
GET https://api.open-meteo.com/v1/forecast?latitude=35.18,33.75,51.92,31.23,1.26,53.55&longitude=129.08,-118.25,4.48,121.47,103.82,9.99&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto
```

### Task 3: NoticeWidget — RSS-to-JSON Integration (M)
**Files to create/modify**:
- `src/features/quote/components/widgets/NoticeWidget.tsx` (modify)
- `src/api/noticeApi.ts` (new)
- `api/logistics-news.ts` (new Vercel serverless function)
- `src/features/quote/components/widgets/NoticeWidget.test.tsx` (new)

**Details**:
- RSS Sources (logistics industry news):
  - FreightWaves RSS: `https://www.freightwaves.com/feed`
  - The Loadstar: `https://theloadstar.com/feed`
  - gCaptain: `https://gcaptain.com/feed`
- Vercel serverless proxy (`api/logistics-news.ts`) to avoid CORS:
  - Fetches RSS feeds server-side
  - Parses XML to JSON (use `fast-xml-parser` or simple regex)
  - Returns normalized array: `{ title, link, pubDate, source }`
  - Cache response for 15 minutes (Vercel Edge Cache headers)
- Frontend fetches from `/api/logistics-news`
- Display latest 5 items sorted by date
- Loading skeleton + error fallback
- "View More" button links to source

### Task 4: Customer Quote History (S)
**Files to create/modify**:
- `src/pages/CustomerDashboard.tsx` (integrate)
- `src/api/quoteApi.ts` (add user filter param)

**Details**:
- Reuse existing `QuoteHistoryTable` component
- Pass `userEmail` filter param to `GET /api/v1/quotes?user_email=...`
- Show compact view (latest 5 quotes) with "View All" expansion
- If no quotes, show empty state with "Create Your First Quote" CTA

**Backend Consideration**:
- Rails API already supports `q` search param
- May need to add `user_email` filter scope to QuotesController
- Out of scope for Phase 1 if backend change is complex (can filter client-side initially)

### Task 5: i18n — Chinese & Japanese Translations (S)
**Files to modify**:
- `src/contexts/LanguageContext.tsx` (add cn/ja to supported languages)
- `src/config/translations.ts` (add cn/ja translation objects)
- `src/components/layout/Header.tsx` (add cn/ja to language selector if exists)

**Details**:
- Copy `en` translation object as base for `cn` and `ja`
- Translate all keys (~80 keys estimated)
- Translation groups: nav.*, landing.*, auth.*, calc.*, quote.*, widget.*, history.*
- Add language selector options for Chinese (简体中文) and Japanese (日本語)
- Verify fallback mechanism works for missing keys

---

## 4. Technical Decisions

### D1: Open-Meteo vs Other Weather APIs
**Decision**: Open-Meteo
**Rationale**: Free (no API key), reliable, 10K requests/day, supports batch coordinate queries, no CORS issues

### D2: RSS Proxy via Vercel Serverless
**Decision**: Create `/api/logistics-news.ts` serverless function
**Rationale**: RSS feeds have CORS restrictions. Vercel serverless provides free, fast proxy with edge caching. Keeps frontend clean.

### D3: Client-Side vs Backend Quote Filtering
**Decision**: Start with client-side filtering (Phase 1), migrate to backend `user_email` scope (Phase 2)
**Rationale**: Avoids Rails API changes in Phase 1. Current quote volume is low enough for client-side filtering. Backend filtering moves to Phase 2 with JWT auth.

### D4: Separate CustomerDashboard vs Enhanced QuoteCalculator
**Decision**: New `CustomerDashboard.tsx` page
**Rationale**: Separation of concerns. Customer experience is fundamentally different from admin operations. Prevents `isPublic` prop sprawl.

---

## 5. Dependencies & Risks

### Dependencies
| Dependency | Risk | Mitigation |
|-----------|------|------------|
| Open-Meteo API availability | Low (99.9% uptime, free tier) | Graceful fallback to "unavailable" state |
| RSS feed availability | Medium (third-party feeds) | Cache + fallback to static notices |
| Vercel serverless | Low (already deployed) | Local dev via `vercel dev` |
| i18n translation accuracy | Medium (auto-translation) | Business review before production |

### Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Open-Meteo rate limit | Low | Low | 30-min refresh interval stays well under 10K/day |
| RSS feed format changes | Medium | Low | Defensive parsing with fallback |
| Translation errors | Medium | Medium | Mark cn/ja as "beta" in UI |
| Scope creep (backend changes) | High | Medium | Strict Phase 1 boundary: frontend-only |

---

## 6. Implementation Order

```
Phase 1.1: CustomerDashboard page + route (Task 1)
    └── Basic layout, welcome banner, responsive grid
Phase 1.2: WeatherWidget live data (Task 2)
    └── Open-Meteo integration, loading states, error handling
Phase 1.3: NoticeWidget live data (Task 3)
    └── Vercel serverless proxy, RSS parsing, display
Phase 1.4: Customer quote history (Task 4)
    └── Filtered history table, empty state
Phase 1.5: i18n cn/ja (Task 5)
    └── Translation files, language selector update
```

### Estimated Timeline
| Task | Effort | Dependencies |
|------|--------|-------------|
| Task 1: Dashboard page | 1 day | None |
| Task 2: Weather API | 1-2 days | Task 1 |
| Task 3: News RSS | 1-2 days | Task 1 |
| Task 4: Quote history | 0.5 day | Task 1 |
| Task 5: i18n cn/ja | 1 day | None (parallel) |
| Testing & polish | 0.5 day | All tasks |
| **Total** | **~5-6 days** | |

---

## 7. Testing Strategy

### Unit Tests
- `WeatherWidget.test.tsx`: Mock Open-Meteo response, verify rendering, error states
- `NoticeWidget.test.tsx`: Mock RSS response, verify rendering, error states
- `weatherApi.test.ts`: API call formatting, response parsing, WMO code mapping
- `noticeApi.test.ts`: API call, response normalization

### Integration Tests
- CustomerDashboard renders all widgets
- Route `/dashboard` loads CustomerDashboard for `user` role
- Route `/dashboard` redirects or shows admin view for `admin` role
- Language switching works with cn/ja translations

### Manual Testing
- Verify real Open-Meteo data displays correctly
- Verify RSS feed data displays correctly
- Test dark mode across all new components
- Test mobile responsive layout
- Test with slow network (loading states)

---

## 8. Out of Scope (Phase 2+)

- JWT authentication (Phase 2)
- Backend `user_email` filter scope (Phase 2)
- Admin dashboard analytics (Phase 3)
- Custom port selection per user (Phase 4)
- Notification preferences (Phase 4)
- Real-time WebSocket updates (Phase 4)
