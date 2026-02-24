# Smart Quote System - Technical Decisions

## Architecture Decisions

### 1. Frontend-First Development
**Decision**: Built the full calculation engine in TypeScript first, then ported to Rails
**Reason**: Rapid prototyping and immediate user feedback without backend dependency
**Trade-off**: Dual maintenance of calculation logic (TS + Ruby), but Rails is now the source of truth

### 2. Rails 8 API-Only Backend
**Decision**: Ruby on Rails 8 in API-only mode
**Reason**: Modern Rails 8 with Solid Cache/Queue/Cable, Kamal deployment, strong ecosystem for future DB features
**Alternative Considered**: Keep Vercel serverless functions for everything
**Why Not**: Need database persistence, background jobs, and admin panel capabilities

### 3. Service Object Pattern (Rails)
**Decision**: Calculator logic split into `QuoteCalculator` + `Calculators::*` modules
**Reason**: Clean separation of concerns, testable units, mirrors TypeScript service structure
**Pattern**: `QuoteCalculator.call(input)` orchestrates `ItemCost`, `DomesticCost`, `UpsCost`, `SurgeCost`, `UpsZone`

### 4. Vercel + Render Split Deployment
**Decision**: Frontend on Vercel, Rails API on Render (Singapore region)
**Reason**: Vercel for optimal static hosting + serverless functions; Render for Rails with free PostgreSQL
**Trade-off**: Cross-origin requests required (rack-cors), but Singapore region minimizes latency for KR users

### 5. UPS Tariff Data as Code
**Decision**: UPS rates stored as TypeScript/Ruby constants, not in database
**Reason**: Rates change annually, code-level version control preferred for audit trail
**Future**: Phase 3 will move rates to database with admin UI

### 6. Real-time Debounced Calculation
**Decision**: 500ms debounce on input changes, auto-recalculate via API
**Reason**: Immediate feedback without submit button improves UX for operators doing rapid quotes
**Trade-off**: More API calls, but calculation is lightweight

### 7. No Database Schema Yet
**Decision**: Rails API is stateless - pure calculation, no persistence
**Reason**: MVP focus on calculation accuracy first, persistence in Phase 1
**Impact**: No migrations, no models beyond ApplicationRecord

### 8. camelCase JSON Response
**Decision**: Rails API returns camelCase keys to match frontend TypeScript types
**Reason**: Zero transformation needed on frontend, direct type mapping
**Trade-off**: Non-standard for Rails conventions, but practical for this use case
