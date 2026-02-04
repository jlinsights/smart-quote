import { describe, it, expect, vi } from 'vitest';
import { generatePDF } from './pdfService';
import { QuoteInput, QuoteResult, Incoterm, PackingType } from '@/types';

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockRect = vi.fn();
const mockLine = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetLineWidth = vi.fn();
const mockSetFont = vi.fn();

vi.mock('jspdf', () => {
  return {
    jsPDF: class {
      save = mockSave;
      text = mockText;
      rect = mockRect;
      line = mockLine;
      setFontSize = mockSetFontSize;
      setTextColor = mockSetTextColor;
      setFillColor = mockSetFillColor;
      setDrawColor = mockSetDrawColor;
      setLineWidth = mockSetLineWidth;
      setFont = mockSetFont;
      internal = {
        pageSize: { height: 297, width: 210 }
      };
    }
  };
});

describe('pdfService', () => {
    it('should generate PDF and save it', () => {
        const input: QuoteInput = {
            originCountry: 'KR',
            destinationCountry: 'US',
            destinationZip: '10001',
            domesticRegionCode: 'A',
            isJejuPickup: false,
            incoterm: Incoterm.DDP,
            packingType: PackingType.WOODEN_BOX,
            items: [{ id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 }],
            marginPercent: 15,
            dutyTaxEstimate: 0,
            exchangeRate: 1400,
            fscPercent: 30,
            manualDomesticCost: undefined,
            manualPackingCost: undefined
        };

        const result: QuoteResult = {
            totalQuoteAmount: 100000,
            totalQuoteAmountUSD: 70,
            totalCostAmount: 80000,
            profitAmount: 20000,
            profitMargin: 15,
            currency: 'KRW',
            totalActualWeight: 1,
            totalVolumetricWeight: 1,
            billableWeight: 1,
            appliedZone: 'Zone 7',
            transitTime: '3-5 Days',
            domesticTruckType: 'Parcel',
            isFreightMode: false,
            warnings: [],
            breakdown: {
                domesticBase: 10000,
                domesticSurcharge: 0,
                packingMaterial: 5000,
                packingLabor: 5000,
                packingFumigation: 0,
                handlingFees: 0,
                upsBase: 50000,
                upsFsc: 10000,
                upsWarRisk: 0,
                upsSurge: 0,
                destDuty: 0,
                totalCost: 80000
            }
        };

        generatePDF(input, result);

        expect(mockSave).toHaveBeenCalledWith("jways_smart_quote.pdf");
        expect(mockText).toHaveBeenCalled();
    });
});
