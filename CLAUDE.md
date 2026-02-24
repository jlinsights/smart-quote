# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Quote System for **Goodman GLS & J-Ways** - an internal logistics quoting tool that calculates international shipping costs across carriers (UPS, DHL, EMAX). React frontend with a Rails API backend, sharing mirrored calculation logic.

## Development Commands

### Frontend (React 19 + TypeScript 5.8 + Vite 6)
```bash
npm run dev          # Dev server on http://localhost:5173
npm run build        # tsc + vite build
npm run lint         # ESLint (--max-warnings 0)
npm run test         # Vitest in watch mode
npx vitest run       # Run tests once (7 files, 69 tests)
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
    api/quoteApi.ts            # API client (fetch-based, VITE_API_URL env)
    types.ts                   # All shared TypeScript types & enums
    config/                    # Rate tables, business rules, UI constants
      ups_tariff.ts            # UPS Z1-Z10 rate tables (synced with backend)
      dhl_tariff.ts            # DHL zone rate tables
      emax_tariff.ts           # EMAX zone rate tables
      rates.ts                 # KRW cost constants (packing, labor, handling)
      business-rules.ts        # Thresholds (margin warning, weight limits)
      zones.ts                 # Country groupings per carrier
    features/
      quote/
        components/            # CargoSection, RouteSection, FinancialSection, ResultSection, SaveQuoteButton, etc.
        services/              # calculationService.ts (mirrored calculation logic)
      history/
        components/            # QuoteHistoryPage, QuoteHistoryTable, QuoteSearchBar, QuotePagination, QuoteDetailModal
    components/layout/         # DesktopLayout, MobileLayout, NavigationTabs
    lib/pdfService.ts          # jsPDF-based PDF generation
smart-quote-api/               # Backend (Rails 8 API-only, Ruby 3.4, PostgreSQL)
  app/services/
    quote_calculator.rb        # Main orchestrator
    calculators/
      item_cost.rb             # Packing dimensions, volumetric weight, material/labor
      surge_cost.rb            # UPS-specific surcharge logic
      ups_cost.rb / ups_zone.rb
      dhl_cost.rb / dhl_zone.rb
      emax_cost.rb
      domestic_cost.rb         # Domestic pickup cost
  lib/constants/               # Tariff tables (ups_tariff.rb, dhl_tariff.rb, emax_tariff.rb)
```

### Data Flow
1. User edits input -> frontend `calculateQuote()` runs instantly via `useMemo` (no debounce, pure function)
2. "Save Quote" -> `POST /api/v1/quotes` -> backend `QuoteCalculator.call(params)` recalculates + persists to PostgreSQL (ref: `SQ-YYYY-NNNN`)
3. History tab -> `GET /api/v1/quotes` with pagination/search/filter params

### Mirrored Calculation Logic
Frontend (`src/features/quote/services/calculationService.ts`) and backend (`smart-quote-api/app/services/`) implement **identical** calculation logic. The frontend runs calculations instantly for UI responsiveness; the Rails API is the source of truth for saved quotes.

### Calculation Pipeline
1. **Item Costs** - Packing dimensions (+10/+10/+15cm), volumetric weight (L*W*H / 5000 for UPS, /6000 for EMAX), packing material/labor, surge charges (UPS-only)
2. **Carrier Costs** - Zone lookup (country -> zone code), exact rate table (0.5-20kg in 0.5kg steps) or range rate (>20kg per-kg), FSC% surcharge, war risk (5%)
3. **Margin** - `revenue = cost / (1 - margin%)`, rounded up to nearest KRW 100
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB), EMAX country support

### Surge Logic (UPS-specific)
Priority order: Over Max (>70kg or length >274cm) -> Large Package (girth >300cm) -> AHS Weight (>25kg) -> AHS Dimension (longest >122cm or second >76cm) -> AHS Packing (wood/skid)

### UPS Zone Mapping (Z1-Z10)
Z1: SG/TW/MO/CN, Z2: JP/VN, Z3: TH/PH, Z4: AU/IN, Z5: CA/US, Z6: ES/IT/GB/FR, Z7: DK/NO/SE/FI/DE/NL/BE/IE/CH/AT/PT/CZ/PL/HU/RO/BG, Z8: AR/BR/CL/CO/AE/TR, Z9: ZA/EG/BH/IL/JO/LB/SA/PK, Z10: HK+default

## Key Types

```typescript
// src/types.ts
enum Incoterm { EXW, FOB, CNF, CIF, DAP, DDP }
enum PackingType { NONE, WOODEN_BOX, SKID, VACUUM }
type DomesticRegionCode = 'A' | 'B' | ... | 'T'
interface QuoteInput { originCountry, destinationCountry, destinationZip, incoterm, packingType, items, marginUSD, dutyTaxEstimate, exchangeRate, fscPercent, overseasCarrier?, manualPackingCost?, manualSurgeCost? }
interface QuoteResult { totalQuoteAmount, totalCostAmount, profitMargin, billableWeight, appliedZone, carrier, warnings[], breakdown: CostBreakdown }
// History types: QuoteSummary, QuoteDetail, QuoteListResponse, QuoteListParams
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
- **Environment**: `VITE_API_URL` for API base URL (defaults to `http://localhost:3000`)
- **Tariff sync**: Frontend tariff files in `src/config/` must stay in sync with backend `lib/constants/`

## Testing

- **Frontend**: Vitest + @testing-library/react, jsdom environment, setup in `src/test/setup.ts`
  - Tests use `vitest/globals` (no imports needed for `describe`, `it`, `expect`)
  - 7 test files, 69 tests: calculationService (35), SaveQuoteButton (9), QuoteHistoryTable (7), QuoteSearchBar (7), QuotePagination (6), quoteApi (4), pdfService (1)
- **Backend**: RSpec + FactoryBot + Shoulda Matchers, factories in `spec/factories/`

## Deployment

- **Frontend**: Vercel (production: `smart-quote-main.vercel.app`)
- **Backend**: Render.com (Docker, Singapore region, PostgreSQL)
- **Config**: `render.yaml` for backend infrastructure

## Commit Messages

Always record a one-line Korean description with emoji in `.commit_message.txt` after code changes.
