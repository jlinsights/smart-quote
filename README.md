# Smart Quote System

<div align="center">
  <img src="/public/goodman-gls-logo.png" alt="Goodman GLS Logo" height="60" />
</div>

<br />

The **Smart Quote System** is a robust logistics quoting application designed for **Goodman GLS** and **J-Ways**. It automates the complex calculation of integrated shipping costs, including domestic pickup, export packing, and international air freight (UPS).

**Live URL**: [https://smart-quote-main-kqksmsx4e-jlinsights-projects.vercel.app](https://smart-quote-main-kqksmsx4e-jlinsights-projects.vercel.app)

---

## 🚀 Key Features

### 1. Intelligent Cost Calculation

- **Domestic Trucking**: Automatically selects the optimal truck size (1t, 1.4t, up to 11t) based on total weight and CBM.
- **Smart Surcharges**: Detects and applies special fees for:
  - **Jeju/Island Pickup**: Ferry and remote area surcharges.
  - **UPS Surge Fees**: Analyzes cargo dimensions to apply AHS (Additional Handling), Large Package, and Over Maximum Limits penalties.
- **Volumetric Analysis**: Automatically compares actual vs. volumetric weight to determine billable weight.

### 2. Modern UI/UX

- **Responsive Layout Architecture**:
  - **Desktop**: Full-width dashboard for logistics planners.
  - **Mobile Simulation**: A dedicated mobile-app-like view for on-the-go quick quotes.
- **Dark Mode**: Fully supported dark theme with dynamic logo switching.
- **Real-time Feedback**: Instant quote updates as cargo details are modified.

### 3. Professional Output

- **PDF Generator**: Generates a detailed, branded PDF quote ("jways_smart_quote.pdf") containing:
  - Shipment metadata (Route, Incoterm, Refernce ID).
  - Full cargo manifest with dimensions.
  - Detailed cost breakdown (Domestic, Packing, Freight, Duties).
  - Explicit warning notices for special surcharges.

## 🛠️ Technology Stack

- **Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF
- **Testing**: Vitest (Unit Tests)
- **Icons**: Lucide React

## 📂 Project Structure

```bash
src/
├── components/
│   └── layout/          # DesktopLayout & MobileLayout components
├── features/
│   └── quote/
│       ├── components/  # Quote form sections (Cargo, Route, Financial)
│       └── services/    # Core Business Logic (calculationService.ts)
├── lib/                 # Shared libraries (pdfService.ts)
├── types.ts             # TypeScript definitions
└── constants.ts         # Configuration (Rates, Zones, Layout Settings)
```

## 💻 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
git clone https://github.com/jlinsights/smart-quote.git
cd smart-quote
npm install
```

### Development

Start the local development server:

```bash
npm run dev
```

### Testing

Run the automated unit tests to verify calculation logic:

```bash
npm test
```

_Current Coverage: Surge Logic (AHS/Large Pkg) & Truck Selection_

### Build

Build for production:

```bash
npm run build
```

---

## 🔒 Internal Use Only

This system contains proprietary rate tables and logic for Goodman GLS / J-Ways internal operations.
