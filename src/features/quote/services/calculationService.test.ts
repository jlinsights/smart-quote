import { describe, it, expect } from 'vitest';
import { 
  calculateVolumetricWeight, 
  determineUpsZone, 
  calculateItemCosts, 
  calculateDomesticCosts, 
  calculateUpsCosts,
  calculateQuote
} from './calculationService';
import { PackingType, Incoterm, DomesticRegionCode, QuoteInput } from '@/types';
import { DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT } from '@/constants';

describe('calculationService', () => {
  describe('calculateVolumetricWeight', () => {
    it('should calculate correct volumetric weight (UPS formula)', () => {
      // (10 * 10 * 10) / 5000 = 1000 / 5000 = 0.2
      expect(calculateVolumetricWeight(10, 10, 10)).toBe(0.2);
      // Round up logic: Math.ceil(10.1) -> 11
      expect(calculateVolumetricWeight(10.1, 10, 10)).toBeCloseTo((11 * 10 * 10) / 5000);
    });
  });

  describe('determineUpsZone', () => {
    it('should identify China South (Zone 5)', () => {
      // 510000 is a Guangzhou zip, should be Zone 5
      expect(determineUpsZone('CN', '510000').zone).toBe('Zone 5');
    });

    it('should identify China North (Zone 2) for other zips', () => {
      expect(determineUpsZone('CN', '100000').zone).toBe('Zone 2'); // Beijing
    });

    it('should identify US West (Zone 6)', () => {
      expect(determineUpsZone('US', '90210').zone).toBe('Zone 6');
    });

    it('should identify US East (Zone 7)', () => {
      expect(determineUpsZone('US', '10001').zone).toBe('Zone 7');
    });

    it('should default for unknown country', () => {
      expect(determineUpsZone('XX', '00000').zone).toBe('Zone 9');
    });
  });

  describe('calculateItemCosts', () => {
    it('should calculate packing costs and updated weights', () => {
      const items = [{ id: '1', length: 10, width: 10, height: 10, weight: 1, quantity: 1 }];
      const result = calculateItemCosts(items, PackingType.WOODEN_BOX);

      // Dimensions increase: 20, 20, 25
      // Weight increases: 1 * 1.1 + 10 = 11.1
      expect(result.totalActualWeight).toBe(11.1);
      
      // Volumetric: 20*20*25 / 5000 = 10000 / 5000 = 2
      expect(result.totalPackedVolumetricWeight).toBe(2);
      
      // Packing Cost > 0
      expect(result.packingMaterialCost).toBeGreaterThan(0);
      expect(result.packingLaborCost).toBeGreaterThan(0);
    });

    it('should handle manual packing cost override', () => {
      const items = [{ id: '1', length: 10, width: 10, height: 10, weight: 1, quantity: 1 }];
      const result = calculateItemCosts(items, PackingType.WOODEN_BOX, 50000);
      
      expect(result.packingMaterialCost).toBe(50000);
      expect(result.packingLaborCost).toBe(0);
    });
  });

  describe('calculateDomesticCosts', () => {
    it('should calculate standard rates correctly', () => {
      const result = calculateDomesticCosts(50, 0.5, 'A', false);
      expect(result.truckType).toContain('~100kg Pickup');
      expect(result.domesticBase).toBeGreaterThan(0);
    });

    it('should apply Jeju surcharge', () => {
      const result = calculateDomesticCosts(50, 0.5, 'A', true, undefined, 2);
      // Parcel surcharge: 3000 * 2 = 6000? Or min 50000
      expect(result.domesticSurcharge).toBe(6000); // 3000 * 2 items
      // Code: domesticSurcharge = 3000 * items; if 0 -> 50000. 3000*2=6000. Wait, logic says `if (domesticSurcharge === 0) domesticSurcharge = 50000;`. 6000 != 0, so 6000.
      
      // Re-reading code:
      // domesticSurcharge = 3000 * input.items.reduce((acc, i) => acc + i.quantity, 0);
      // if (domesticSurcharge === 0) domesticSurcharge = 50000;
      // So 6000 is correct.
      // Wait, let's verify my test logic against code.
      // Ah, I missed that I passed itemCount=2. 3000*2 = 6000.
    });

    it('should use manual cost override', () => {
      const result = calculateDomesticCosts(50, 0.5, 'A', false, 100000);
      expect(result.domesticBase).toBe(100000);
      expect(result.truckType).toContain('Manual Rate');
    });
  });

  describe('calculateUpsCosts', () => {
    it('should calculate UPS base and surcharges', () => {
      const result = calculateUpsCosts(10, 'US', '90210', 10);
      expect(result.upsBase).toBeGreaterThan(0);
      expect(result.upsFsc).toBe(result.upsBase * 0.1);
      expect(result.appliedZone).toContain('Zone 6');
    });
  });

  describe('calculateQuote (Integration)', () => {
    const defaultInput: QuoteInput = {
      items: [{ id: '1', length: 50, width: 50, height: 50, weight: 10, quantity: 1 }],
      packingType: PackingType.WOODEN_BOX,
      originCountry: 'KR', // Missing in my previous defaultInput? types says originCountry is required
      destinationCountry: 'US',
      destinationZip: '90210',
      domesticRegionCode: 'A',
      incoterm: Incoterm.DDP,
      isJejuPickup: false,
      marginPercent: 20,
      exchangeRate: DEFAULT_EXCHANGE_RATE,
      fscPercent: DEFAULT_FSC_PERCENT,
      dutyTaxEstimate: 0
    };

    it('should return a complete quote result', () => {
      const result = calculateQuote(defaultInput);
      expect(result.totalQuoteAmount).toBeGreaterThan(0);
      expect(result.currency).toBe('KRW');
      expect(result.breakdown.totalCost).toBeGreaterThan(0);
      expect(result.profitMargin).toBe(20);
    });

    it('should handle EXW (Collect) terms properly', () => {
      const input = { ...defaultInput, incoterm: Incoterm.EXW };
      const result = calculateQuote(input);
      const warningFound = result.warnings.some(w => w.includes('Collect Term'));
      expect(warningFound).toBe(true);
    });
  });
});
