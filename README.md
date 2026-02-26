# Smart Quote System

<div align="center">
  <img src="/public/goodman-gls-logo.png" alt="Goodman GLS Logo" height="60" />
</div>

<br />

The **Smart Quote System** is a full-stack logistics quoting application for **Goodman GLS** and **J-Ways**. It calculates international shipping costs across multiple carriers (UPS, DHL, EMAX), including export packing, surcharges, and margin analysis. React frontend with a Rails API backend and mirrored calculation logic.

**Live URL**: [https://smart-quote-main.vercel.app](https://smart-quote-main.vercel.app)

---

## Key Features

### Multi-Carrier Quoting (UPS, DHL, EMAX)

- **Zone-based pricing**: Country-to-zone mapping (Z1-Z10 for UPS, Z1-Z8 for DHL, per-country for EMAX) with exact rate tables (0.5-20kg in 0.5kg steps) and range rates (>20kg per-kg)
- **Shared rate lookup**: Common `lookupCarrierRate()` engine for UPS/DHL (exact table -> range table -> fallback)
- **Surcharges**: FSC% fuel surcharge, war risk (5%), manual surge fees (applied to all carriers)

### Calculation Pipeline

1. **Item Costs** - Packing dimensions (+10/+10/+15cm), volumetric weight (L×W×H / 5000 for UPS & DHL, /6000 for EMAX), packing material/labor, manual surge charges (all carriers)
2. **Carrier Costs** - Zone lookup -> `lookupCarrierRate()` -> FSC -> war risk
3. **Margin** - USD-based margin added to cost, rounded up to nearest KRW 100
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB), EMAX country support

### Dashboard & Widgets

- **Customer Dashboard**: Landing page after login with welcome banner, recent quotes, and live widgets
- **Exchange Rate Widget**: Real-time KRW rates for 6 currencies (USD, EUR, JPY, CNY, GBP, SGD) via open.er-api.com with localStorage caching, stale detection (6min threshold), visibility/online auto-refresh, and live indicator
- **Weather Widget**: 47 global port/airport weather conditions via Open-Meteo API with paginated carousel
- **Notice Widget**: Company announcements with paginated display
- **Account Manager Widget**: Contact information for assigned logistics managers

### Internationalization (i18n)

- 4 languages: English, Korean, Chinese, Japanese
- Context-based language switching with localStorage persistence
- 390+ translation keys covering all UI strings

### Quote History & Management

- Save quotes with auto-generated reference numbers (`SQ-YYYY-NNNN`), duplicate detection
- Search, filter by country/date/status, paginated list
- Detail modal with keyboard (Esc) support, CSV export, quote deletion

### Professional Output

- **PDF Generator**: Branded PDF with route, cargo manifest, cost breakdown, compliance warnings, optional reference number pass-through

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS |
| **Backend** | Rails 8 API-only, Ruby 3.4, PostgreSQL |
| **Testing** | Vitest + Testing Library (16 files, 138 tests), RSpec + FactoryBot (backend) |
| **Deploy** | Vercel (frontend), Render.com (backend, Docker, Singapore) |
| **APIs** | open.er-api.com (exchange rates), Open-Meteo (weather), Supabase (auth) |
| **Other** | jsPDF, Lucide React, React Router v6, Zustand |

## Project Structure

```
/                              # Frontend
  src/
    api/                       # API clients
      quoteApi.ts              # Rails backend client (VITE_API_URL)
      exchangeRateApi.ts       # Exchange rate API (open.er-api.com, localStorage cache)
      weatherApi.ts            # Open-Meteo weather API (47 ports/airports)
      noticeApi.ts             # Notice/announcement API
    types.ts                   # Core TypeScript types & enums
    types/dashboard.ts         # Dashboard-specific types (ExchangeRate, PortWeather, etc.)
    i18n/translations.ts       # 4-language translation dictionary (en/ko/cn/ja)
    config/                    # Rate tables, tariffs, business rules
      ups_tariff.ts            # UPS Z1-Z10 rates (synced with backend)
      dhl_tariff.ts            # DHL Z1-Z8 rates (synced with backend)
      emax_tariff.ts           # EMAX per-country rates (CN, VN)
      rates.ts                 # KRW cost constants, market defaults
      business-rules.ts        # Surge thresholds, weight limits
      options.ts               # Country/carrier dropdown options
    contexts/                  # React Context providers
      AuthContext.tsx           # Supabase auth state
      LanguageContext.tsx       # i18n language selection
      ThemeContext.tsx          # Dark/light mode
    features/
      quote/
        components/            # InputSection, ResultSection, SaveQuoteButton
        components/widgets/    # ExchangeRateWidget, WeatherWidget, NoticeWidget, AccountManagerWidget
        services/              # calculationService.ts (mirrored calculation logic)
      history/
        components/            # QuoteHistoryPage, QuoteHistoryTable, QuoteSearchBar, QuotePagination, QuoteDetailModal
      dashboard/
        components/            # WelcomeBanner, QuoteHistoryCompact, WidgetError, WidgetSkeleton
        hooks/                 # useExchangeRates, usePortWeather, useLogisticsNews
    pages/                     # Route-level pages
      LandingPage.tsx          # Public landing page (/)
      LoginPage.tsx            # Auth login (/login)
      SignUpPage.tsx            # Auth signup (/signup)
      CustomerDashboard.tsx    # Dashboard with widgets (/dashboard)
      QuoteCalculator.tsx      # Quote calculator (/quote, /admin)
    components/layout/         # Header, MobileLayout, NavigationTabs
    lib/
      format.ts                # Currency/number formatters (formatKRW, formatUSD, etc.)
      pdfService.ts            # jsPDF-based PDF generation
smart-quote-api/               # Backend (Rails 8 API)
  app/services/
    quote_calculator.rb        # Main calculator orchestrator
    calculators/               # Individual calculators (ups, dhl, emax, item, surge, domestic)
  lib/constants/               # Tariff tables (synced with frontend)
```

## Getting Started

### Prerequisites

- Node.js (v18+), npm
- Ruby 3.4+, Bundler, PostgreSQL (for backend)

### Frontend

```bash
npm install
npm run dev          # Dev server on http://localhost:5173
npm run build        # Production build (tsc + vite)
npm run lint         # ESLint (--max-warnings 0)
npm run test         # Vitest watch mode
npx vitest run       # Run tests once (16 files, 138 tests)
npx tsc --noEmit     # Type check only
```

### Backend (from `smart-quote-api/`)

```bash
bundle install
bin/rails db:prepare
bin/rails server     # API on http://localhost:3000
bundle exec rspec    # RSpec tests
bin/rubocop          # Ruby linting
```

### Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/signup` | SignUpPage | Public |
| `/dashboard` | CustomerDashboard | Protected |
| `/quote` | QuoteCalculator (isPublic=true) | Protected |
| `/admin` | QuoteCalculator (isPublic=false) | Admin only |

### API Endpoints

```
POST   /api/v1/quotes/calculate  # Stateless calculation
POST   /api/v1/quotes            # Calculate + save
GET    /api/v1/quotes             # List (page, per_page, q, destination_country, date_from, date_to, status)
GET    /api/v1/quotes/:id         # Detail
DELETE /api/v1/quotes/:id         # Delete
GET    /api/v1/quotes/export      # CSV download
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000` |
| `VITE_SUPABASE_URL` | Supabase project URL | - |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | - |

## Market Defaults

| Setting | Value |
|---------|-------|
| Default Exchange Rate (KRW/USD) | 1,400 |
| Default FSC% | 30% |
| Packing Material | 15,000 KRW/m² |
| Packing Labor | 50,000 KRW/item |

---

## Internal Use Only

This system contains proprietary rate tables and logic for Goodman GLS / J-Ways internal operations.
