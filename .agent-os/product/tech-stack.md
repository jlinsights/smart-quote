# Smart Quote System - Technology Stack

## Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI framework |
| TypeScript | ~5.8.2 | Type safety |
| Vite | ^6.2.0 | Build tool + dev server |
| Tailwind CSS | ^3.4.17 | Styling |
| jsPDF | 2.5.1 | PDF generation |
| Lucide React | ^0.563.0 | Icons |
| Vitest | ^4.0.18 | Unit testing |
| Testing Library | ^16.3.2 | Component testing |

## Backend (smart-quote-api/)
| Technology | Version | Purpose |
|------------|---------|---------|
| Ruby on Rails | ~> 8.0.4 | API framework (API-only mode) |
| PostgreSQL | via pg ~> 1.1 | Database |
| Puma | >= 5.0 | Web server |
| Kamal | latest | Docker deployment |
| Thruster | latest | HTTP caching/compression |
| rack-cors | latest | CORS handling |
| Solid Cache/Queue/Cable | latest | Rails 8 defaults |

## Serverless Functions (Vercel)
| File | Purpose |
|------|---------|
| api/exchange-rate.ts | Real-time USD/KRW exchange rate via Naver Finance |
| api/fsc.ts | UPS Fuel Surcharge scraping |

## Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting + serverless functions |
| Render | Rails API hosting + PostgreSQL (Singapore region) |

## Scripts
| File | Purpose |
|------|---------|
| scripts/generate_tariff.py | Python script to generate UPS tariff data |
| scripts/verify_rates.ts | TypeScript rate verification tool |

## Project Structure
```
smart-quote-main/
├── src/                      # Frontend (React + TypeScript)
│   ├── api/quoteApi.ts       # API client
│   ├── components/layout/    # Desktop/Mobile layouts
│   ├── config/               # Rates, zones, tariffs, business rules
│   ├── features/quote/       # Quote form sections + calculation service
│   ├── lib/pdfService.ts     # PDF generation
│   └── types.ts              # Shared type definitions
├── api/                      # Vercel serverless functions
├── smart-quote-api/          # Rails 8 API backend
│   ├── app/controllers/      # API v1 endpoints
│   ├── app/services/         # Business logic (calculators)
│   └── config/               # Rails configuration
├── scripts/                  # Data generation utilities
└── public/                   # Static assets
```
