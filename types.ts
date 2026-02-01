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
    domesticRegionCode: DomesticRegionCode; 
    isJejuPickup: boolean;
    incoterm: Incoterm;
    packingType: PackingType;
    items: CargoItem[];
    marginPercent: number; // 0-100
    dutyTaxEstimate: number; // For DDP only
    
    // Market Variables
    exchangeRate: number; // KRW per USD
    fscPercent: number; // Fuel Surcharge %

    // Manual Overrides
    manualDomesticCost?: number; // Optional manual override for domestic leg
    manualPackingCost?: number; // Optional manual override for packing & docs
  }
  
  export interface CostBreakdown {
    domesticBase: number;
    domesticSurcharge: number; // Jeju/Remote or specific truck surcharges
    packingMaterial: number;
    packingLabor: number;
    packingFumigation: number;
    handlingFees: number; // Customs, Docs
    upsBase: number;
    upsFsc: number; // Fuel Surcharge
    upsWarRisk: number; // Peak season/War
    upsSurge: number; // Additional Handling, Large Package, etc.
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
    
    domesticTruckType: string; // e.g., "1t Truck" or "Parcel"
    isFreightMode: boolean;
    warnings: string[];
    
    breakdown: CostBreakdown;
  }