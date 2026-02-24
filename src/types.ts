export enum Incoterm {
    EXW = 'EXW',
    FOB = 'FOB',
    CNF = 'C&F',
    CIF = 'CIF',
    DAP = 'DAP',
    DDP = 'DDP'
  }
  
  export enum PackingType {
    NONE = 'NONE',
    WOODEN_BOX = 'WOODEN_BOX', // Standard Export Packing
    SKID = 'SKID',
    VACUUM = 'VACUUM'
  }
  
  // Changed from Enum to string type to support A-T codes dynamically
  export type DomesticRegionCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T';
  
  export interface CargoItem {
    id: string;
    width: number; // cm
    length: number; // cm
    height: number; // cm
    weight: number; // kg per box
    quantity: number;
  }
  
  export interface QuoteInput {
    originCountry: string;
    destinationCountry: string;
    destinationZip: string;
    incoterm: Incoterm;
    packingType: PackingType;
    items: CargoItem[];
    marginUSD: number; // Target margin in USD (e.g. 50.00)
    dutyTaxEstimate: number; // For DDP only
    
    // Market Variables
    exchangeRate: number; // KRW per USD
    fscPercent: number; // Fuel Surcharge %
    overseasCarrier?: 'UPS' | 'DHL' | 'EMAX';

    // Manual Overrides
    manualPackingCost?: number; // Optional manual override for packing & docs
    manualSurgeCost?: number; // Optional manual surge/AHS cost (auto-calc disabled)
  }
  
  export interface CostBreakdown {
    packingMaterial: number;
    packingLabor: number;
    packingFumigation: number;
    handlingFees: number; // Customs, Docs
    intlBase: number; // Carrier base rate (UPS/DHL/EMAX)
    intlFsc: number; // Fuel Surcharge (0 for EMAX)
    intlWarRisk: number; // War risk surcharge (0 for EMAX)
    intlSurge: number; // Additional Handling, Large Package, etc.
    destDuty: number;
    totalCost: number;
  }
  
  export interface QuoteResult {
    totalQuoteAmount: number; // Final Customer Price (KRW)
    totalQuoteAmountUSD: number; // Final Customer Price (USD)
    totalCostAmount: number; // Internal Cost (KRW)
    profitAmount: number;
    profitMargin: number;
    currency: string;

    // Details for logic transparency
    totalActualWeight: number;
    totalVolumetricWeight: number;
    billableWeight: number;
    appliedZone: string;
    transitTime: string;
    carrier: string; // 'UPS' | 'DHL' | 'EMAX'
    warnings: string[];

    breakdown: CostBreakdown;
  }

  // ── Quote History Types ──

  export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

  export interface QuoteSummary {
    id: number;
    referenceNo: string;
    destinationCountry: string;
    totalQuoteAmount: number;
    totalQuoteAmountUsd: number;
    profitMargin: number;
    billableWeight: number;
    domesticTruckType?: string;
    status: QuoteStatus;
    createdAt: string;
  }

  export interface QuoteDetail {
    id: number;
    referenceNo: string;
    status: QuoteStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    // Input
    originCountry: string;
    destinationCountry: string;
    destinationZip: string;
    domesticRegionCode: string;
    isJejuPickup: boolean;
    incoterm: string;
    packingType: string;
    marginPercent: number;
    dutyTaxEstimate: number;
    exchangeRate: number;
    fscPercent: number;
    manualDomesticCost: number | null;
    manualPackingCost: number | null;
    items: CargoItem[];
    // Result
    totalQuoteAmount: number;
    totalQuoteAmountUSD: number;
    totalCostAmount: number;
    profitAmount: number;
    profitMargin: number;
    billableWeight: number;
    appliedZone: string;
    domesticTruckType?: string;
    warnings: string[];
    breakdown: CostBreakdown;
  }

  export interface Pagination {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    perPage: number;
  }

  export interface QuoteListResponse {
    quotes: QuoteSummary[];
    pagination: Pagination;
  }

  export interface QuoteListParams {
    page?: number;
    perPage?: number;
    q?: string;
    destinationCountry?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: QuoteStatus;
  }