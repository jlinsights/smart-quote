# Smart Quote System

<div align="center">
  <img src="/public/goodman-gls-logo.png" alt="Goodman GLS Logo" height="60" />
</div>

<br />

The **Smart Quote System** is a robust logistics quoting application designed for **Goodman GLS** and **J-Ways**. It automates the complex calculation of integrated shipping costs, including domestic pickup, export packing, and international air freight (UPS).

**Live URL**: [https://smart-quote-main-kqksmsx4e-jlinsights-projects.vercel.app](https://smart-quote-main-kqksmsx4e-jlinsights-projects.vercel.app)

---

## 🚀 Key Features

### 1. Intelligent Logistics Calculation

- **Smart Truck Selection**: Dynamically assigns the optimal vehicle (1t to 11t) based on total weight and volume caps.
- **Advanced Surcharge Logic**:
  - **AHS (Additional Handling)**: Auto-applies fees for weight >25kg or irregluar dimensions.
  - **Large Package**: Detects length + girth > 300cm.
  - **Over Max Limits**: Alerts and penalizes cargo exceeding network limits.
- **Precision Zoning**:
  - **China**: Distinguishes South China (Zone 5) vs North/Rest (Zone 2) based on 6-digit zip codes.
  - **USA**: Routing for West (Zone 6) vs East/Central (Zone 7) based on zip prefixes.

### 2. Financial Intelligence

- **Volumetric Analysis**: Automatically compares Actual vs. Volumetric weight (Dim Factor 5000) to determine billable weight.
- **Margin Protection**:
  - **Low Margin Alert**: Warnings for margins below 10%.
  - **Revenue Target**: Calculates target revenue based on desired margin percentage.
- **Exchange Rate Handling**: Real-time USD conversion for cross-border reference.

### 3. Professional Output

- **PDF Generator**: Generates a detailed, branded PDF quote containing:
  - **Route & Manifest**: Origin, Destination, Incoterms, and full cargo list.
  - **Cost Breakdown**: Granular view of Domestic, Packing, Freight, and Duty costs.
  - **Compliance Warnings**: Explicit notices for surcharges and special handling requirements.

## 🛠️ Technology Stack

- **Core**: React 19, TypeScript ~5.8
- **Build Tool**: Vite ^6.2
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF
- **Testing**: Vitest (Unit Tests)
- **Icons**: Lucide React

## 📂 Project Structure

```bash
src/
├── components/          # Shared UI Components
│   └── layout/          # DesktopLayout & MobileLayout
├── features/
│   └── quote/
│       ├── components/  # Quote Form Sections (Cargo, Route, Financial)
│       └── services/    # Core Logic (calculationService.ts)
├── lib/                 # Utilities (pdfService.ts)
├── constants.ts         # Configuration (Rates, Zones, Limits)
└── types.ts             # Type Definitions
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
