# Product Roadmap

## Phase 0: Already Completed

The following features have been implemented and are production-ready:

- [x] **Multi-Carrier Calculation Engine** - UPS (Z1-Z10), DHL (Z1-Z8), EMAX (CN/VN flat rate) with instant frontend computation
- [x] **Packing & Volumetric Weight** - Dimension padding (+10/+10/+15cm), carrier-specific divisor (5000 for UPS/DHL, 6000 for EMAX)
- [x] **Incoterm Support** - EXW, FOB, CNF, CIF, DAP, DDP with collect-term warnings and duty handling
- [x] **Margin Protection** - Low margin alerts (<10%), USD-based margin with KRW conversion, real-time slider
- [x] **Manual Surge Charges** - Manual input applicable to all 3 carriers equally
- [x] **Quote Persistence** - PostgreSQL storage with auto-generated reference numbers (SQ-YYYY-NNNN)
- [x] **Quote History & Search** - Paginated list with filters (destination, status, date range, text search), detail modal
- [x] **PDF Export** - Branded jsPDF with route, manifest, breakdown, warnings, footer
- [x] **CSV Export** - Bulk download via GET /api/v1/quotes/export with filters
- [x] **Authentication (Frontend Mock)** - Email/password login with localStorage persistence, role-based access (user/admin). Backend auth (JWT, bcrypt) is Phase 2.
- [x] **User Registration** - Self-service sign-up page (/signup) for external customers with user role
- [x] **Internationalization (2 of 4)** - English and Korean (en/ko) implemented. Chinese (cn) and Japanese (ja) planned but not yet added.
- [x] **Domestic Cost Calculator** - Domestic pickup cost with truck tier logic (1t-11t), A-T region codes, Jeju island surcharge (backend service exists, currently disabled in orchestrator)
- [x] **Dark Mode** - Class-based Tailwind dark mode with localStorage persistence
- [x] **Mobile Responsive** - Separate mobile layout with stacked sections and sticky result bar
- [x] **Landing Page** - Public marketing page with feature cards and CTA
- [x] **Rails API** - 6 REST endpoints (calculate, create, list, show, delete, export) with RSpec tests
- [x] **Mirrored Calculation** - Identical logic on frontend (TypeScript) and backend (Ruby)
- [x] **Exchange Rate & FSC** - Vercel serverless functions for real-time USD/KRW and UPS FSC
- [x] **Deployment** - Vercel (frontend) + Render (Rails API + PostgreSQL, Singapore region)

## Phase 1: Customer Dashboard

**Goal:** Provide external customers with a self-service portal featuring quoting and logistics intelligence
**Success Criteria:** Customer-facing /dashboard operational with live weather and news widgets

### Features

- [ ] Customer dashboard page (/dashboard) with dedicated layout and role-based routing `M`
- [ ] Global Port Weather & Alerts widget — replace mock data with Open-Meteo API (component scaffolded at `src/features/quote/components/widgets/WeatherWidget.tsx`) `M`
- [ ] Logistics Insights & Notices widget — replace mock data with RSS-to-JSON API (component scaffolded at `src/features/quote/components/widgets/NoticeWidget.tsx`) `M`
- [ ] Customer-specific quote history view (filtered by user) `S`
- [ ] Dashboard layout with responsive grid for widgets `S`
- [ ] Chinese (cn) and Japanese (ja) translation files for i18n completion `S`

### Dependencies

- Open-Meteo API access (free, no API key required)
- RSS-to-JSON service selection and endpoint configuration
- Auth role differentiation between admin and customer views

## Phase 2: Security & Authentication Hardening

**Goal:** Production-grade security for multi-tenant customer access
**Success Criteria:** JWT-based auth with proper session management, API rate limiting

### Features

- [ ] JWT token authentication (replace localStorage email) `L`
- [ ] API rate limiting and request throttling `M`
- [ ] CORS policy hardening for production domains `S`
- [ ] Password hashing and secure credential storage (Rails has_secure_password) `M`
- [ ] Session expiry and refresh token flow `M`
- [ ] Audit logging for quote operations `S`

### Dependencies

- Phase 1 dashboard completion (customer access patterns defined)
- SSL/TLS certificate configuration on Render

## Phase 3: Rate Management Admin

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

## Phase 4: Enhanced Features (As Needed)

**Goal:** Extended capabilities based on business requirements
**Success Criteria:** Features deployed as requested by stakeholders

### Features

- [ ] Customer management (CRM lite) `XL`
- [ ] Quote templates for frequent routes `M`
- [ ] Multi-currency support beyond USD/KRW `L`
- [ ] Email quote delivery with branded templates `M`
- [ ] Webhook integrations for ERP systems `L`
- [ ] Analytics dashboard with charts (quote volume, margins, popular routes) `L`

### Dependencies

- Phase 2 security hardening (customer data protection)
- Phase 3 rate management (for analytics data)

## Effort Scale

| Label | Duration |
|-------|----------|
| XS | 1 day |
| S | 2-3 days |
| M | 1 week |
| L | 2 weeks |
| XL | 3+ weeks |
