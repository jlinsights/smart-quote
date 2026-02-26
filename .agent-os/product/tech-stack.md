# Technical Stack

## Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI framework |
| TypeScript | ~5.8.2 | Type safety |
| Vite | ^6.2.0 | Build tool + dev server |
| Tailwind CSS | ^3.4.17 | Styling (custom jways-* palette, class-based dark mode) |
| React Router | ^7.13.1 | Client-side routing |
| jsPDF | 2.5.1 | PDF generation |
| Lucide React | ^0.563.0 | Icons |
| Vitest | ^4.0.18 | Unit testing |
| Testing Library | ^16.3.2 | Component testing |

## Backend (smart-quote-api/)
| Technology | Version | Purpose |
|------------|---------|---------|
| Ruby on Rails | ~> 8.0.4 | API framework (API-only mode) |
| Ruby | 3.4.5 | Language runtime |
| PostgreSQL | 15+ | Database (quotes persistence) |
| Puma | >= 5.0 | Web server |
| Kamal | latest | Docker deployment |
| Thruster | latest | HTTP caching/compression |
| rack-cors | latest | CORS handling |
| RSpec | 3.12+ | Test framework |
| FactoryBot | 6.2+ | Test fixtures |
| Kaminari | latest | Pagination |
| csv | stdlib | CSV export |

## Serverless Functions (Vercel)
| File | Purpose |
|------|---------|
| api/exchange-rate.ts | Real-time USD/KRW exchange rate via Naver Finance |
| api/fsc.ts | UPS Fuel Surcharge scraping |

## External APIs (Planned - Dashboard Widgets)
| API | Purpose |
|-----|---------|
| Open-Meteo | Global port weather conditions & alerts |
| RSS-to-JSON | Logistics industry news feed aggregation |

## Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting + serverless functions |
| Render | Rails API hosting + PostgreSQL (Singapore region) |

## Configuration
| File | Purpose |
|------|---------|
| vite.config.ts | Path alias: @/ -> src/ |
| tsconfig.json | strict: true, skipLibCheck: true |
| tailwind.config.cjs | Custom jways-* blue color palette |
| .eslintrc.cjs | max-warnings: 0 enforcement |
| render.yaml | Backend infrastructure as code (Docker, Singapore) |

## Scripts
| File | Purpose |
|------|---------|
| scripts/generate_tariff.py | Python script to generate tariff data (historical, may not exist in current tree) |
| scripts/verify_rates.ts | TypeScript rate verification tool (historical, may not exist in current tree) |

## Project Structure
```
smart-quote-main/
├── src/                          # Frontend (React 19 + TypeScript)
│   ├── api/quoteApi.ts           # API client (fetch-based, VITE_API_URL)
│   ├── types.ts                  # Shared types & enums
│   ├── config/                   # Rate tables (UPS/DHL/EMAX), business rules, options
│   ├── contexts/                 # AuthContext, LanguageContext, ThemeContext
│   ├── features/
│   │   ├── quote/                # Calculator components + calculationService
│   │   └── history/              # Quote history table, search, pagination, detail modal
│   ├── components/layout/        # Header, MobileLayout, NavigationTabs
│   ├── pages/                    # LandingPage, LoginPage, QuoteCalculator
│   └── lib/                      # format.ts (currency), pdfService.ts
├── api/                          # Vercel serverless functions
├── smart-quote-api/              # Rails 8 API backend
│   ├── app/controllers/api/v1/   # QuotesController (6 REST endpoints)
│   ├── app/services/             # QuoteCalculator + Calculators::*
│   ├── app/models/               # Quote model with scopes
│   ├── lib/constants/            # Tariff tables (synced with frontend config/)
│   └── spec/                     # RSpec integration tests
├── docs/                         # PRD, database schema, user manual
└── public/                       # Fonts, logos, favicon
```
