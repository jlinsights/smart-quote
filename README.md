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

- **Zone-based pricing**: Country-to-zone mapping (Z1-Z10 for UPS, Z1-Z9 for DHL, zones for EMAX) with exact rate tables (0.5-20kg in 0.5kg steps) and range rates (>20kg per-kg)
- **Surcharges**: FSC% fuel surcharge, war risk (5%), manual surge fees (applied to all carriers)

### Calculation Pipeline

1. **Item Costs** - Packing dimensions (+10/+10/+15cm), volumetric weight (L×W×H / 5000 for UPS & DHL, /6000 for EMAX), packing material/labor, manual surge charges (all carriers)
2. **Carrier Costs** - Zone lookup → rate table → FSC → war risk
3. **Margin** - `revenue = cost / (1 - margin%)`, rounded up to nearest KRW 100
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB)

### Quote History & Management

- Save quotes with auto-generated reference numbers (`SQ-YYYY-NNNN`)
- Search, filter by country/date/status, paginated list
- Detail modal, CSV export, quote deletion

### Professional Output

- **PDF Generator**: Branded PDF with route, cargo manifest, cost breakdown, compliance warnings

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, Tailwind CSS |
| **Backend** | Rails 8 API-only, Ruby 3.4, PostgreSQL |
| **Testing** | Vitest + Testing Library (frontend), RSpec + FactoryBot (backend) |
| **Deploy** | Vercel (frontend), Render.com (backend, Docker, Singapore) |
| **Other** | jsPDF, Lucide React, Kaminari (pagination) |

## Project Structure

```
/                              # Frontend
  src/
    api/quoteApi.ts            # API client (fetch, VITE_API_URL)
    types.ts                   # All TypeScript types & enums
    config/                    # Rate tables, tariffs, business rules
      ups_tariff.ts            # UPS Z1-Z10 rates
      dhl_tariff.ts            # DHL zone rates
      emax_tariff.ts           # EMAX zone rates
    features/
      quote/
        components/            # CargoSection, RouteSection, FinancialSection, ResultSection, etc.
        services/              # calculationService.ts (mirrored calculation logic)
      history/
        components/            # QuoteHistoryPage, QuoteHistoryTable, QuoteSearchBar, etc.
    components/layout/         # DesktopLayout, MobileLayout, NavigationTabs
    lib/pdfService.ts          # PDF generation
smart-quote-api/               # Backend (Rails 8 API)
  app/services/
    quote_calculator.rb        # Main calculator orchestrator
    calculators/               # Individual calculators
      ups_cost.rb, ups_zone.rb
      dhl_cost.rb, dhl_zone.rb
      emax_cost.rb
      item_cost.rb, surge_cost.rb, domestic_cost.rb
  lib/constants/               # Tariff tables (ups_tariff.rb, dhl_tariff.rb, emax_tariff.rb)
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
npx vitest run       # Run tests once (7 files, 70 tests)
```

### Backend (from `smart-quote-api/`)

```bash
bundle install
bin/rails db:prepare
bin/rails server     # API on http://localhost:3000
bundle exec rspec    # RSpec tests
bin/rubocop          # Ruby linting
```

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

---

## Internal Use Only

This system contains proprietary rate tables and logic for Goodman GLS / J-Ways internal operations.
