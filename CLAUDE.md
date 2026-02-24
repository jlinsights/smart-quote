# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Quote System for **Goodman GLS & J-Ways** - an internal logistics quoting tool that calculates international shipping costs across carriers (UPS, DHL, EMAX). React frontend with a Rails API backend, sharing mirrored calculation logic.

## Development Commands

### Frontend (React + TypeScript + Vite)
```bash
npm run dev          # Dev server on http://localhost:5173
npm run build        # tsc + vite build
npm run lint         # ESLint (--max-warnings 0)
npm run test         # Vitest in watch mode
npx vitest run       # Run tests once
npx tsc --noEmit     # Type check only
```

### Backend (Rails API - from smart-quote-api/)
```bash
bundle install           # Install gems
bin/rails db:prepare     # Create + migrate DB
bin/rails server         # API on http://localhost:3000
bin/rails test           # Run tests
bundle exec rspec        # RSpec tests
bin/rubocop              # Ruby linting
```

### Running a single frontend test
```bash
npx vitest run src/features/quote/services/calculationService.test.ts
```

### Running a single backend test
```bash
bundle exec rspec spec/requests/api/v1/quotes_spec.rb
```

## Architecture

### Monorepo Structure
```
/                        # Frontend (React 19 + TypeScript 5.8 + Vite 6)
  src/
    api/quoteApi.ts      # API client (fetch-based, VITE_API_URL env)
    types.ts             # All shared TypeScript types & enums
    config/              # Rate tables, business rules, UI constants
    features/
      quote/             # Calculator: input forms + result display + calculation logic
      history/           # Quote history: list, search, pagination, detail modal
    components/layout/   # DesktopLayout, MobileLayout, NavigationTabs
    lib/pdfService.ts    # jsPDF-based PDF generation
smart-quote-api/         # Backend (Rails 8 API-only, Ruby 3.4.5, PostgreSQL)
  app/services/          # QuoteCalculator + individual calculators
  lib/constants/         # Tariff tables (ups_tariff.rb, dhl_tariff.rb, emax_tariff.rb)
```

### Data Flow
1. User edits input -> 500ms debounce -> `POST /api/v1/quotes/calculate` (stateless)
2. Backend `QuoteCalculator.call(params)` runs calculation pipeline -> returns `QuoteResult`
3. "Save Quote" -> `POST /api/v1/quotes` (persists to PostgreSQL with auto-generated reference_no `SQ-YYYY-NNNN`)
4. History tab -> `GET /api/v1/quotes` with pagination/search/filter params

### Mirrored Calculation Logic
Frontend (`src/features/quote/services/calculationService.ts`) and backend (`smart-quote-api/app/services/`) implement **identical** calculation logic. The frontend service is used for reference/fallback; the Rails API is the source of truth.

### Calculation Pipeline (QuoteCalculator)
1. **Item Costs** - Packing dimensions (+10/+10/+15cm), volumetric weight (L*W*H / 5000 for UPS, /6000 for EMAX), packing material/labor costs, surge charges
2. **Carrier Costs** - Zone lookup (country -> zone code), exact rate table (0.5-20kg in 0.5kg steps) or range rate (>20kg per-kg), FSC% surcharge, war risk (5%)
3. **Margin** - `revenue = cost / (1 - margin%)`, rounded up to nearest KRW 100
4. **Warnings** - Low margin (<10%), high volumetric weight, surge charges, collect terms (EXW/FOB)

### Surge Logic (UPS-specific)
Priority order: Over Max (>70kg or length >274cm) -> Large Package (girth >300cm) -> AHS Weight (>25kg) -> AHS Dimension (longest >122cm or second >76cm) -> AHS Packing (wood/skid)

## Key Types

```typescript
// src/types.ts
enum Incoterm { EXW, FOB, CNF, CIF, DAP, DDP }
enum PackingType { NONE, WOODEN_BOX, SKID, VACUUM }
interface QuoteInput { /* all calculator inputs */ }
interface QuoteResult { /* calculation output + breakdown + warnings */ }
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
- **Rate constants**: `src/config/rates.ts` (KRW amounts), `src/config/business-rules.ts` (thresholds)
- **Tariff tables**: `src/config/ups_tariff.ts` (frontend), `smart-quote-api/lib/constants/ups_tariff.rb` (backend)

## Testing

- **Frontend**: Vitest + @testing-library/react, jsdom environment, setup in `src/test/setup.ts`
- **Backend**: RSpec + FactoryBot + Shoulda Matchers, factories in `spec/factories/`
- Tests use `vitest/globals` (no imports needed for `describe`, `it`, `expect`)

## Deployment

- **Frontend**: Vercel (auto-deploy)
- **Backend**: Render.com (Docker, Singapore region, free-tier PostgreSQL)
- **Config**: `render.yaml` for backend infrastructure

## Commit Messages

Always record a one-line Korean description with emoji in `.commit_message.txt` after code changes.
