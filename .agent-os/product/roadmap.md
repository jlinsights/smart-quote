# Smart Quote System - Product Roadmap

## Phase 0: Already Completed

- [x] **Core Calculation Engine** - Domestic pickup, packing, UPS freight, surcharges, margin
- [x] **Smart Truck Selection** - Auto-assigns optimal vehicle (1t-11t) based on weight/CBM
- [x] **UPS Zone Pricing** - 2025 tariff with C3-C11 zones, exact + range rate lookup
- [x] **Surge Detection** - AHS (weight/dimension), Large Package, Over Max Limits
- [x] **Incoterm Support** - EXW, FOB, C&F, CIF, DAP, DDP with duty handling
- [x] **Volumetric Weight** - Automatic actual vs. volumetric comparison (Dim Factor 5000)
- [x] **Margin Protection** - Low margin alerts (<10%), target revenue calculation
- [x] **PDF Quote Generation** - Branded PDF with route, manifest, cost breakdown
- [x] **Dark Mode** - Full dark/light theme toggle
- [x] **Responsive Layout** - Desktop + Mobile views
- [x] **Exchange Rate Auto-Update** - Real-time USD/KRW via Naver Finance API
- [x] **Fuel Surcharge Auto-Update** - UPS FSC scraping
- [x] **Rails API Migration** - Backend ported to Rails 8 with service objects
- [x] **Deployment** - Vercel (frontend) + Render (Rails API + PostgreSQL, Singapore)
- [x] **Manual Override** - Domestic cost + packing cost manual input
- [x] **Domestic 20-Region System** - A-T region codes with full rate tables

## Phase 1: Quote History & Data Persistence
Priority: HIGH | Estimated: 1-2 weeks

- [ ] Database schema for quotes (Rails migrations)
- [ ] Save calculated quotes with metadata
- [ ] Quote listing page with search/filter
- [ ] Quote detail view with re-calculation
- [ ] Quote versioning (track changes over time)
- [ ] Export quote history to CSV/Excel

## Phase 2: User Authentication & Multi-Tenant
Priority: HIGH | Estimated: 2-3 weeks

- [ ] Rails 8 authentication (has_secure_password or Devise)
- [ ] User registration and login
- [ ] Role-based access (admin, operator, viewer)
- [ ] Company/tenant isolation
- [ ] Per-user quote ownership
- [ ] Session management and security

## Phase 3: Rate Management Admin
Priority: MEDIUM | Estimated: 2-3 weeks

- [ ] Admin dashboard for rate tables
- [ ] UPS tariff CRUD (zone rates, surcharges)
- [ ] Domestic rate CRUD (A-T regions, truck tiers)
- [ ] Business rules configuration (margins, thresholds)
- [ ] Rate version history and rollback
- [ ] Bulk import/export for rate updates

## Phase 4: Enhanced Features
Priority: LOW | Estimated: Ongoing

- [ ] Customer management (CRM lite)
- [ ] Quote templates for frequent routes
- [ ] Multi-currency support beyond USD/KRW
- [ ] Analytics dashboard (quote volume, margins, popular routes)
- [ ] Email quote delivery
- [ ] Webhook integrations for ERP systems
