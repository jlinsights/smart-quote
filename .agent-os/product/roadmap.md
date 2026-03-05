# Product Roadmap

## Phase 0: Already Completed

The following features have been implemented and are production-ready:

### Core Quoting Engine
- [x] **Multi-Carrier Calculation Engine** - UPS (Z1-Z10), DHL (Z1-Z8), EMAX (CN/VN flat rate) with instant frontend computation
- [x] **Packing & Volumetric Weight** - Dimension padding (+10/+10/+15cm), carrier-specific divisor (5000 for UPS/DHL, 6000 for EMAX)
- [x] **Incoterm Support** - EXW, FOB, CNF, CIF, DAP, DDP with collect-term warnings and duty handling
- [x] **Margin Protection** - Low margin alerts (<10%), %-based margin calculation (marginPercent), real-time slider
- [x] **Manual Surge Charges** - Manual input applicable to all 3 carriers equally
- [x] **Mirrored Calculation** - Identical logic on frontend (TypeScript) and backend (Ruby)

### Data & Export
- [x] **Quote Persistence** - PostgreSQL storage with auto-generated reference numbers (SQ-YYYY-NNNN)
- [x] **Quote History & Search** - Paginated list with filters (destination, status, date range, text search), detail modal
- [x] **PDF Export** - Branded jsPDF with route, manifest, breakdown, warnings, footer
- [x] **CSV Export** - Bulk download via GET /api/v1/quotes/export with filters

### Customer Dashboard
- [x] **Customer Dashboard Page** - /dashboard with responsive grid layout, role-based routing
- [x] **Welcome Banner** - Personalized greeting with user info
- [x] **Recent Quotes Widget** - QuoteHistoryCompact with quick navigation to full history
- [x] **Exchange Rate Widget** - Live rates from open.er-api.com (USD, EUR, JPY, CNY, GBP, SGD) with change tracking
- [x] **Exchange Rate Calculator Widget** - Interactive currency conversion tool
- [x] **Port Weather Widget** - Open-Meteo API for 47 global ports/airports with paginated carousel
- [x] **Notice Widget** - Curated logistics news with paginated display
- [x] **Account Manager Widget** - Contact info display for assigned manager (Charlie Lee)

### Platform
- [x] **Authentication (Frontend Mock)** - localStorage-based with predefined admin accounts and self-service signup
- [x] **User Registration** - Self-service sign-up page (/signup) for external customers
- [x] **Internationalization (4 languages)** - English, Korean, Chinese, Japanese (en/ko/cn/ja) with 390+ translation keys
- [x] **Dark Mode** - Class-based Tailwind dark mode with localStorage persistence
- [x] **Mobile Responsive** - Separate mobile layout with stacked sections and sticky result bar
- [x] **Landing Page** - Public marketing page with feature cards and CTA

### Backend & Infrastructure
- [x] **Rails 8 API** - 6 REST endpoints (calculate, create, list, show, delete, export) with JWT auth + RSpec tests
- [x] **Domestic Cost Calculator** - Truck tier logic (1t-11t), A-T region codes, Jeju surcharge (backend service, currently disabled)
- [x] **Deployment** - Vercel (frontend) + Render (Rails API + PostgreSQL, Singapore region)

### Testing
- [x] **Frontend Tests** - 16 test files, 138 tests (Vitest + Testing Library)
- [x] **Backend Tests** - RSpec + FactoryBot integration tests

## Phase 1: Security & Authentication Hardening

**Goal:** Production-grade security for multi-tenant customer access
**Status:** Partially started (Rails JWT auth exists, frontend still mock)

### Features

- [ ] Replace frontend localStorage mock auth with real Supabase or Rails JWT integration `L`
- [ ] API rate limiting and request throttling `M`
- [ ] CORS policy hardening for production domains `S`
- [ ] Session expiry and refresh token flow `M`
- [ ] Audit logging for quote operations `S`
- [ ] Admin user management UI (scaffolded at `UserManagementWidget.tsx`) `M`

### Dependencies

- Frontend auth context refactoring (remove PREDEFINED_ADMINS)
- SSL/TLS certificate configuration on Render

## Phase 2: Rate Management Admin

**Goal:** Admin UI for managing carrier rate tables without code deployments
**Success Criteria:** Operations staff can update UPS/DHL/EMAX rates via /admin interface

### Features

- [ ] Admin dashboard overview (quote volume, margin trends, popular routes) `L`
- [ ] UPS tariff CRUD (zone rates, range rates per zone) `L`
- [ ] DHL tariff CRUD (zone rates, range rates per zone) `M`
- [ ] EMAX rate CRUD (per-country flat rates) `S`
- [ ] Business rules configuration (margin thresholds, weight limits) `M`
- [ ] Rate version history and rollback `M`
- [ ] Bulk import/export for rate updates `M`

### Dependencies

- Database migration for rate tables (move from code constants to DB)
- Admin role verification in Rails API

## Phase 3: Enhanced Features (As Needed)

**Goal:** Extended capabilities based on business requirements

### Features

- [ ] Customer management (CRM lite) `XL`
- [ ] Quote templates for frequent routes `M`
- [ ] Multi-currency support beyond USD/KRW `L`
- [ ] Email quote delivery with branded templates `M`
- [ ] Webhook integrations for ERP systems `L`
- [ ] Analytics dashboard with charts (quote volume, margins, popular routes) `L`

### Dependencies

- Phase 1 security hardening (customer data protection)
- Phase 2 rate management (for analytics data)

## Effort Scale

| Label | Duration |
|-------|----------|
| XS | 1 day |
| S | 2-3 days |
| M | 1 week |
| L | 2 weeks |
| XL | 3+ weeks |
