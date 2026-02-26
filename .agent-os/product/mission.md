# Product Mission

## Pitch

Smart Quote System is an international logistics quoting platform for **Goodman GLS & J-Ways** that enables operations staff and external customers to instantly calculate accurate shipping costs across UPS, DHL, and EMAX carriers, with real-time cost breakdowns, margin analysis, and quote persistence.

## Users

### Primary Customers

- **Internal Operations Staff (via /admin)**: Goodman GLS / J-Ways logistics coordinators who generate, manage, and analyze quotes daily
- **External Customers (via /dashboard)**: Clients who need self-service quote generation, shipment tracking insights, and logistics intelligence

### User Personas

**Operations Coordinator** (25-45)
- **Role:** Logistics Coordinator at Goodman GLS
- **Context:** Handles 20-50 quote requests daily across multiple carriers and destinations
- **Pain Points:** Manual rate table lookups, error-prone spreadsheet calculations, slow turnaround
- **Goals:** Generate accurate quotes in under 30 seconds, maintain healthy margins (>10%), track quote history

**External Client** (30-55)
- **Role:** Import/Export Manager at client company
- **Context:** Needs competitive shipping quotes for international shipments from Korea
- **Pain Points:** Waiting for manual quotes from forwarders, no visibility into cost breakdown, lack of real-time logistics intelligence
- **Goals:** Self-service instant quotes, understand cost components, stay informed on port conditions and logistics news

**Sales Manager** (35-50)
- **Role:** Business Development at J-Ways
- **Context:** Reviews pricing competitiveness and margin performance across quotes
- **Pain Points:** No centralized view of quoting activity, difficulty spotting margin erosion
- **Goals:** Monitor quote volume, analyze margin trends, ensure pricing consistency

## The Problem

### Slow and Error-Prone Manual Quoting

International shipping quotes require looking up zone-specific carrier rates, calculating volumetric weights, applying surcharges, converting currencies, and computing margins. Manual calculations across 3 carriers and 200+ destination countries take 10-15 minutes per quote and are error-prone.

**Our Solution:** Real-time automated calculation engine that mirrors identical logic on frontend (instant UI) and backend (source of truth), producing accurate quotes in under 1 second.

### No Customer Self-Service

External customers must contact operations staff and wait for email quotes, creating bottlenecks and poor customer experience.

**Our Solution:** Customer-facing /dashboard with self-service quoting, plus real-time port weather alerts and logistics news to provide added value beyond basic quoting.

### Lack of Logistics Intelligence

Customers and operators lack real-time visibility into port conditions, weather disruptions, and industry news that affect shipping decisions.

**Our Solution:** Dashboard widgets integrating Open-Meteo weather API for major port conditions and RSS-to-JSON feeds for logistics news and alerts.

## Differentiators

### Instant Multi-Carrier Comparison

Unlike traditional freight forwarder quoting (manual, single-carrier), Smart Quote calculates UPS, DHL, and EMAX rates simultaneously with zone-based pricing, FSC surcharges, and carrier-specific volumetric divisors. Operators can compare carriers in real-time.

### Mirrored Calculation Architecture

Unlike API-dependent tools that require network round-trips, Smart Quote runs identical calculation logic on both frontend (TypeScript) and backend (Ruby). Frontend provides instant (<100ms) UI responsiveness; backend serves as source of truth for persisted quotes. This ensures both speed and accuracy.

### Integrated Logistics Intelligence

Unlike pure quoting tools, the customer dashboard provides real-time port weather conditions (Open-Meteo) and logistics industry news (RSS feeds), giving customers actionable context alongside their quotes.

## Key Features

### Core Quoting

- **Multi-Carrier Calculation:** UPS (Z1-Z10), DHL (Z1-Z8), EMAX (CN/VN flat rate) with instant comparison
- **Packing & Volumetric Weight:** Dimension padding, carrier-specific divisors (5000/6000), actual vs volumetric comparison
- **Incoterm Handling:** EXW/FOB/CNF/CIF/DAP/DDP with collect-term warnings and duty calculation
- **Margin Protection:** Real-time margin slider with <10% low-margin alerts, USD-based margin with KRW conversion
- **Surge Charges:** Manual surge input applicable to all carriers equally

### Data & Export

- **Quote Persistence:** Auto-generated reference numbers (SQ-YYYY-NNNN), PostgreSQL storage
- **Quote History:** Paginated list with search, filters (destination, status, date range), detail modal
- **PDF Export:** Branded jsPDF output with shipment details, cargo manifest, cost breakdown, warnings
- **CSV Export:** Bulk download with configurable filters

### Customer Dashboard (Planned)

- **Global Port Weather & Alerts:** Real-time weather conditions at major ports via Open-Meteo API
- **Logistics Insights & Notices:** Industry news and disruption alerts via RSS-to-JSON integration

### Domestic Logistics (Backend Service)

- **Domestic Pickup Cost:** Truck tier logic (1t-11t) based on weight/CBM, A-T region codes, Jeju island surcharge (service implemented, currently disabled in orchestrator)

### Platform

- **Authentication:** Frontend email/password login with localStorage mock, role-based access (user/admin). Backend JWT auth planned in Phase 2.
- **User Registration:** Self-service sign-up page (/signup) for external customer onboarding
- **Internationalization:** 2 languages implemented (en/ko). Chinese (cn) and Japanese (ja) planned for Phase 1.
- **Dark Mode:** Class-based Tailwind dark mode with localStorage persistence
- **Mobile Responsive:** Separate mobile layout with stacked sections and sticky result bar
