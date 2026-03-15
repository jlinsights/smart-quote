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
- **Surcharges**: FSC% fuel surcharge, war risk (5%), manual surge fees, carrier-specific add-ons (AHS, large package, remote area, etc.)
- **Carrier comparison**: Side-by-side cost comparison across all carriers

### Calculation Pipeline

1. **Item Costs** - Packing dimensions (+10/+10/+15cm), volumetric weight (L x W x H / 5000 for UPS & DHL, /6000 for EMAX), packing material/labor, manual surge charges (all carriers)
2. **Carrier Costs** - Zone lookup -> `lookupCarrierRate()` -> FSC -> war risk
3. **Margin** - Dynamic margin resolution via `MarginRuleResolver` (priority-based first-match-wins algorithm with 5min cache), admin CRUD management, hardcoded fallback if API unavailable. Revenue = cost / (1 - margin%), rounded up to nearest KRW 100
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB), EMAX country support

### Role-Based Access

| Feature | Admin | Member |
|---------|:-----:|:------:|
| Customer Dashboard | O | O |
| Quote Calculator | O | O |
| Margin breakdown visible | O | X |
| Margin slider control | O | X |
| Quote History | O | O |
| PDF Export | O | O |
| Admin Management Panel | O | X |
| Slack notification on save | X | O (auto) |

### Dashboard & Widgets

- **Customer Dashboard**: Landing page after login with welcome banner, recent quotes, and live widgets
- **Exchange Rate Widget**: Real-time KRW rates for 6 currencies (USD, EUR, JPY, CNY, GBP, SGD) via open.er-api.com with localStorage caching, stale detection, and live indicator
- **Currency Calculator Widget**: Quick currency conversion tool
- **Weather Widget**: 47 global port & airport weather conditions via Open-Meteo API with paginated carousel and delay alerts
- **Notice Widget**: Real-time logistics news RSS feed with paginated display
- **Global Header**: Dark mode/i18n toggles, account settings modal

### Admin Management Panel (Admin only)

| Widget | Purpose |
|--------|---------|
| **Target Margin Rules** | DB-driven margin rule CRUD with priority tiers (P100/P90/P50/P0) |
| **FSC Rate Management** | Track/update DHL & UPS fuel surcharge percentages |
| **Surcharge Management** | Carrier-specific surcharge CRUD |
| **Customer Management** | Customer records with quote count badges |
| **User Management** | Role assignment, company, nationality, network access |
| **Rate Table Viewer** | Read-only carrier rate table reference |
| **Audit Log** | Full audit trail of all admin actions |

### Slack Notifications

When a **Member** saves a quote, a Slack notification is automatically sent to the admin channel with reference number, carrier, destination, billable weight, total quote amount, and margin percentage.

### Internationalization (i18n)

- 4 languages: English, Korean, Chinese, Japanese
- Context-based language switching with localStorage persistence
- 390+ translation keys covering all UI strings

### Quote History & Management

- Save quotes with auto-generated reference numbers (`SQ-YYYY-NNNN`), duplicate detection
- Search, filter by country/date/status, paginated list
- Detail modal with status tracking (Draft -> Sent -> Accepted), CSV export, email, deletion

### Professional Output

- **PDF Generator**: Branded PDF with route, cargo manifest, cost breakdown, compliance warnings, optional reference number

### Error Tracking

- **Sentry** integration across all error boundaries and catch blocks for production monitoring

## Tech Stack

| Layer        | Stack                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS                               |
| **Backend**  | Rails 8 API-only, Ruby 3.4, PostgreSQL                                       |
| **Testing**  | Vitest + Testing Library (28 files, 1,166 tests), RSpec + FactoryBot (backend) |
| **Deploy**   | Vercel (frontend), Render.com (backend, Docker, Singapore)                   |
| **APIs**     | open.er-api.com (exchange rates), Open-Meteo (weather), Supabase (auth)      |
| **Other**    | jsPDF, Sentry, Lucide React, React Router v7, ChannelTalk                    |

## Project Structure

```
/                              # Frontend
  src/
    api/                       # API clients (apiClient, quoteApi, marginRuleApi, exchangeRateApi, weatherApi, noticeApi)
    types.ts                   # Core TypeScript types & enums
    i18n/translations.ts       # 4-language translation dictionary (en/ko/cn/ja)
    config/                    # Rate tables (ups/dhl/emax tariff), business rules, options
    contexts/                  # AuthContext, LanguageContext, ThemeContext
    features/
      quote/
        components/            # InputSection, ResultSection, SaveQuoteButton, CarrierComparisonCard
        components/widgets/    # ExchangeRateWidget, WeatherWidget, NoticeWidget, AccountManagerWidget, ExchangeRateCalculatorWidget
        services/              # calculationService.ts (mirrored calculation logic)
      history/
        components/            # QuoteHistoryPage, QuoteHistoryTable, QuoteSearchBar, QuotePagination, QuoteDetailModal
      admin/
        components/            # TargetMarginRulesWidget, FscRateWidget, UserManagementWidget, CustomerManagement, AuditLogViewer, RateTableViewer
        components/surcharge/  # SurchargeManagementWidget, SurchargeForm, SurchargeTable
      dashboard/
        components/            # WelcomeBanner, QuoteHistoryCompact, AccountSettingsModal
        hooks/                 # useExchangeRates, usePortWeather, useLogisticsNews, useMarginRules, useResolvedMargin, useFscRates, useSurcharges, useAddonRates
    pages/                     # LandingPage, LoginPage, SignUpPage, CustomerDashboard, QuoteCalculator
      components/              # CalculatorActionBar, AdminWidgets, MobileStickyBottomBar
    components/                # Header, ProtectedRoute, ErrorBoundary, ChannelTalk
    lib/                       # format.ts, pdfService.ts, slackNotification.ts, fetchWithRetry.ts
smart-quote-api/               # Backend (Rails 8 API)
  app/models/                  # MarginRule, AuditLog, Quote, User, Customer, Surcharge, AddonRate
  app/services/                # QuoteCalculator, QuoteSearcher, QuoteExporter, QuoteSerializer, MarginRuleResolver
    calculators/               # ItemCost, SurgeCost, UpsCost, DhlCost, EmaxCost, DomesticCost
  app/controllers/api/v1/      # Quotes, MarginRules, Surcharges, AddonRates, Customers, Users, Auth, Fsc, AuditLogs, Notifications
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
npx vitest run       # Run tests once (28 files, 1,166 tests)
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

| Route        | Component                        | Access     |
| ------------ | -------------------------------- | ---------- |
| `/`          | LandingPage                      | Public     |
| `/login`     | LoginPage                        | Public     |
| `/signup`    | SignUpPage                       | Public     |
| `/dashboard` | CustomerDashboard                | Protected  |
| `/quote`     | QuoteCalculator (isPublic=true)  | Protected  |
| `/admin`     | QuoteCalculator (isPublic=false) | Admin only |

### API Endpoints

```
# Quotes
POST   /api/v1/quotes/calculate  # Stateless calculation
POST   /api/v1/quotes            # Calculate + save
GET    /api/v1/quotes            # List (page, per_page, q, destination_country, date_from, date_to, status)
GET    /api/v1/quotes/:id        # Detail
PATCH  /api/v1/quotes/:id        # Update status/notes/customer
DELETE /api/v1/quotes/:id        # Delete
GET    /api/v1/quotes/export     # CSV download

# Authentication
POST   /api/v1/auth/login        # JWT Login
POST   /api/v1/auth/register     # Account creation
PUT    /api/v1/auth/password     # Change Password

# Admin Configuration
GET    /api/v1/fsc/rates         # View Fuel Surcharges
POST   /api/v1/fsc/update        # Update FSC rates
CRUD   /api/v1/margin_rules      # Margin rule management + GET resolve
CRUD   /api/v1/surcharges        # Surcharge management
CRUD   /api/v1/addon_rates       # Add-on rate management
CRUD   /api/v1/customers         # Customer management
GET    /api/v1/users             # User management
GET    /api/v1/audit_logs        # Audit log viewer

# Notifications
POST   /api/v1/notifications/slack  # Slack webhook proxy
```

## Environment Variables

| Variable                 | Purpose              | Default                 |
| ------------------------ | -------------------- | ----------------------- |
| `VITE_API_URL`           | Backend API base URL | `http://localhost:3000` |
| `VITE_SUPABASE_URL`      | Supabase project URL | -                       |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key    | -                       |

## Documentation

| Document | Description |
|----------|-------------|
| [Admin User Guide](docs/USER_GUIDE_ADMIN.md) | Complete guide for Admin users |
| [Member User Guide](docs/USER_GUIDE_MEMBER.md) | Complete guide for Member users |
| [CLAUDE.md](CLAUDE.md) | AI assistant project context |

---

## Internal Use Only

This system contains proprietary rate tables and logic for Goodman GLS / J-Ways internal operations.
