# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Quote System for **Goodman GLS & J-Ways** - an internal logistics quoting tool that calculates international shipping costs across carriers (UPS, DHL, EMAX). React frontend with a Rails API backend, sharing mirrored calculation logic. Includes customer dashboard with live exchange rates, weather, notices, and account manager widgets.

## Development Commands

### Frontend (React 19 + TypeScript 5.8 + Vite 6)
```bash
npm run dev          # Dev server on http://localhost:5173
npm run build        # tsc + vite build
npm run lint         # ESLint (--max-warnings 0)
npm run test         # Vitest in watch mode
npx vitest run       # Run tests once (16 files, 138 tests)
npx tsc --noEmit     # Type check only
```

### Backend (Rails 8 API-only - from smart-quote-api/)
```bash
bundle install           # Install gems
bin/rails db:prepare     # Create + migrate DB
bin/rails server         # API on http://localhost:3000
bundle exec rspec        # RSpec tests
bin/rubocop              # Ruby linting
```

### Running a single test
```bash
# Frontend
npx vitest run src/features/quote/services/calculationService.test.ts
# Backend
bundle exec rspec spec/requests/api/v1/quotes_spec.rb
```

## Architecture

### Monorepo Structure
```
/                              # Frontend
  src/
    api/                       # API clients
      quoteApi.ts              # Rails backend (fetch-based, VITE_API_URL)
      exchangeRateApi.ts       # open.er-api.com (KRW base, localStorage cache for previous rates)
      weatherApi.ts            # Open-Meteo API (47 global ports/airports)
      noticeApi.ts             # Company announcements
    types.ts                   # Core TypeScript types & enums (QuoteInput, QuoteResult, Incoterm, etc.)
    types/dashboard.ts         # Dashboard types (ExchangeRate, PortWeather, LogisticsNews, AccountManager)
    i18n/translations.ts       # 4-language dictionary (en/ko/cn/ja, 390+ keys)
    config/                    # Rate tables, business rules, UI constants
      ups_tariff.ts            # UPS Z1-Z10 rate tables (synced with backend)
      dhl_tariff.ts            # DHL Z1-Z8 rate tables (synced with backend)
      emax_tariff.ts           # EMAX per-country rate tables (CN, VN only)
      rates.ts                 # KRW cost constants, DEFAULT_EXCHANGE_RATE=1400, DEFAULT_FSC_PERCENT=30
      business-rules.ts        # Surge thresholds (AHS weight/dim, large package, over max)
      options.ts               # Country options, carrier options, incoterm options
    contexts/                  # React Context providers
      AuthContext.tsx           # Supabase auth (user, session, login/logout)
      LanguageContext.tsx       # i18n (useLanguage hook, localStorage persistence)
      ThemeContext.tsx          # Dark/light mode (useTheme hook)
    features/
      quote/
        components/            # InputSection, ResultSection, SaveQuoteButton
        components/widgets/    # ExchangeRateWidget, WeatherWidget, NoticeWidget, AccountManagerWidget
        services/              # calculationService.ts (mirrored calculation logic, lookupCarrierRate)
      history/
        components/            # QuoteHistoryPage, QuoteHistoryTable, QuoteSearchBar, QuotePagination, QuoteDetailModal
        constants.ts           # Shared constants (STATUS_COLORS)
      dashboard/
        components/            # WelcomeBanner, QuoteHistoryCompact, WidgetError, WidgetSkeleton
        hooks/                 # useExchangeRates, usePortWeather, useLogisticsNews
    pages/                     # Route-level pages
      LandingPage.tsx          # Public landing (/)
      LoginPage.tsx            # Auth login (/login)
      SignUpPage.tsx            # Auth signup (/signup)
      CustomerDashboard.tsx    # Dashboard with widgets (/dashboard)
      QuoteCalculator.tsx      # Calculator + history (/quote, /admin)
    components/
      layout/                  # Header, MobileLayout, NavigationTabs
      ProtectedRoute.tsx       # Auth guard (requireAdmin prop for /admin)
    lib/
      format.ts                # Currency/number formatters (formatKRW, formatUSD, formatNum, formatUSDInt)
      pdfService.ts            # jsPDF-based PDF generation (optional referenceNo pass-through)
      fetchWithRetry.ts        # Generic fetch retry wrapper
smart-quote-api/               # Backend (Rails 8 API-only, Ruby 3.4, PostgreSQL)
  app/services/
    quote_calculator.rb        # Main orchestrator
    calculators/
      item_cost.rb             # Packing dimensions, volumetric weight, material/labor
      surge_cost.rb            # Surcharge logic
      ups_cost.rb / ups_zone.rb
      dhl_cost.rb / dhl_zone.rb
      emax_cost.rb
      domestic_cost.rb         # Domestic pickup cost
  lib/constants/               # Tariff tables (ups_tariff.rb, dhl_tariff.rb, emax_tariff.rb)
```

### Routing (src/App.tsx)
```
/              → LandingPage (public)
/login         → LoginPage (public)
/signup        → SignUpPage (public)
/dashboard     → CustomerDashboard (ProtectedRoute)
/quote         → QuoteCalculator isPublic=true (ProtectedRoute)
/admin         → QuoteCalculator isPublic=false (ProtectedRoute requireAdmin)
*              → redirect to /
```

Context providers wrap the app: `ThemeProvider > LanguageProvider > BrowserRouter > AuthProvider`

### Data Flow
1. User edits input -> frontend `calculateQuote()` runs instantly via `useMemo` (no debounce, pure function)
2. "Save Quote" -> `POST /api/v1/quotes` -> backend `QuoteCalculator.call(params)` recalculates + persists to PostgreSQL (ref: `SQ-YYYY-NNNN`)
3. History tab -> `GET /api/v1/quotes` with pagination/search/filter params

### Mirrored Calculation Logic
Frontend (`src/features/quote/services/calculationService.ts`) and backend (`smart-quote-api/app/services/`) implement **identical** calculation logic. The frontend runs calculations instantly for UI responsiveness; the Rails API is the source of truth for saved quotes.

### Calculation Pipeline
1. **Item Costs** - Packing dimensions (+10/+10/+15cm), volumetric weight (L*W*H / 5000 for UPS & DHL, /6000 for EMAX), packing material/labor, manual surge charges (all carriers)
2. **Carrier Costs** - Zone lookup (country -> zone code), shared `lookupCarrierRate()` engine (exact table 0.5-20kg -> range table >20kg -> fallback), FSC% surcharge
3. **Margin** - `revenue = cost / (1 - margin%)`, rounded up to nearest KRW 100
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB), EMAX country support

### Surge Charges (All Carriers)
Manual surge input (`manualSurgeCost`) applies to UPS, DHL, and EMAX equally. Reflected in `breakdown.intlSurge` and cost breakdown UI. Auto-calculation is disabled; users enter surge fees manually.

### UPS Zone Mapping (Z1-Z10)
Z1: SG/TW/MO/CN, Z2: JP/VN, Z3: TH/PH, Z4: AU/IN, Z5: CA/US, Z6: ES/IT/GB/FR, Z7: DK/NO/SE/FI/DE/NL/BE/IE/CH/AT/PT/CZ/PL/HU/RO/BG, Z8: AR/BR/CL/CO/AE/TR, Z9: ZA/EG/BH/IL/JO/LB/SA/PK, Z10: HK+default

## Dashboard Widgets

### ExchangeRateWidget
- **API**: `open.er-api.com/v6/latest/KRW` (free tier, 1500 req/month, daily updates)
- **Currencies**: USD, EUR, JPY, CNY, GBP, SGD
- **Rate inversion**: API returns KRW→foreign (e.g., USD: 0.000701), code inverts to "1 USD = X KRW"
- **localStorage caching**: Previous rates stored under `exchange_rates_prev` key for real change calculation
- **Polling**: `useExchangeRates` hook - 5min interval, 6min stale threshold, 30s stale check tick
- **Auto-refresh**: `visibilitychange` + `online` event listeners trigger `refreshIfStale()`
- **Live indicator**: Green pulse (fresh) / gray dot (stale) in widget header

### WeatherWidget
- **API**: Open-Meteo (no API key required)
- **Coverage**: 47 global ports/airports
- **Hook**: `usePortWeather` with paginated carousel (8 ports per page)

### NoticeWidget / AccountManagerWidget
- Static/mock data with paginated carousel display

## External APIs

| API | Endpoint | Purpose |
|-----|----------|---------|
| Rails Backend | `VITE_API_URL` (default localhost:3000) | Quote CRUD, persistence |
| open.er-api.com | `/v6/latest/KRW` | Exchange rates (KRW base) |
| Open-Meteo | `api.open-meteo.com/v1/forecast` | Port/airport weather |
| Supabase | `VITE_SUPABASE_URL` | Authentication |

## i18n System

- **Languages**: `en | ko | cn | ja` (defined in `src/i18n/translations.ts`)
- **Hook**: `useLanguage()` from `LanguageContext` returns `{ language, setLanguage, t }`
- **Persistence**: localStorage key `'language'`
- **Usage**: `t('key.name')` in all components
- **Widget keys**: `widget.exchange.*`, `widget.weather.*`, `widget.notice.*`, `widget.manager.*`, `widget.common.*`

## Key Types

```typescript
// src/types.ts
enum Incoterm { EXW, FOB, CNF, CIF, DAP, DDP }
enum PackingType { NONE, WOODEN_BOX, SKID, VACUUM }
type DomesticRegionCode = 'A' | 'B' | ... | 'T'
interface QuoteInput { originCountry, destinationCountry, destinationZip, incoterm, packingType, items, marginUSD, dutyTaxEstimate, exchangeRate, fscPercent, overseasCarrier?, manualPackingCost?, manualSurgeCost? }
interface QuoteResult { totalQuoteAmount, totalCostAmount, profitMargin, billableWeight, appliedZone, carrier, warnings[], breakdown: CostBreakdown }

// src/types/dashboard.ts
interface ExchangeRate { currency, code, flag, rate, previousClose, change, changePercent, trend }
interface PortWeather { port, code, latitude, longitude, temperature, weatherCode, windSpeed, condition, status, type }
interface LogisticsNews { title, link, pubDate, source }
interface AccountManager { name, nameKo, role, department, phone, mobile, email, available, workingHours }
```

## API Endpoints

```
POST   /api/v1/quotes/calculate  # Stateless calculation
POST   /api/v1/quotes            # Calculate + save
GET    /api/v1/quotes             # List (page, per_page, q, destination_country, date_from, date_to, status)
GET    /api/v1/quotes/:id         # Detail
DELETE /api/v1/quotes/:id         # Delete
GET    /api/v1/quotes/export      # CSV download
```

## Configuration

- **Path alias**: `@/` -> `src/` (both vite.config.ts and tsconfig.json)
- **Tailwind**: Custom `jways-*` color palette (blue theme), class-based dark mode
- **Environment**: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Tariff sync**: Frontend tariff files in `src/config/` must stay in sync with backend `lib/constants/`
- **Market defaults**: `DEFAULT_EXCHANGE_RATE=1400`, `DEFAULT_FSC_PERCENT=30` in `src/config/rates.ts`

## Testing

- **Frontend**: Vitest + @testing-library/react, jsdom environment, setup in `src/test/setup.ts`
  - Tests use `vitest/globals` (no imports needed for `describe`, `it`, `expect`)
  - 16 test files, 138 tests:
    - calculationService (34), ExchangeRateWidget (10), exchangeRateApi (10)
    - SaveQuoteButton (9), NoticeWidget (9), AccountManagerWidget (11)
    - WeatherWidget (8), weatherApi (7), weatherCodes (8)
    - QuoteHistoryTable (7), QuoteSearchBar (7), QuotePagination (6)
    - CustomerDashboard (4), quoteApi (4), noticeApi (3), pdfService (1)
- **Backend**: RSpec + FactoryBot + Shoulda Matchers, factories in `spec/factories/`

## Deployment

- **Frontend**: Vercel (production: `smart-quote-main.vercel.app`)
- **Backend**: Render.com (Docker, Singapore region, PostgreSQL)
- **Config**: `render.yaml` for backend infrastructure

## Commit Messages

Always record a one-line Korean description with emoji in `.commit_message.txt` after code changes.
