import { describe, it, expect } from 'vitest';
import {
  calculateItemSurge,
  determineUpsZone,
  determineDhlZone,
  calculateDhlCosts,
  calculateEmaxCosts,
  calculateQuote,
} from './calculationService';
import { PackingType, Incoterm, QuoteInput } from '@/types';
import { SURGE_RATES, WAR_RISK_SURCHARGE_RATE } from '@/config/rates';
import { DHL_EXACT_RATES } from '@/config/dhl_tariff';

describe('calculationService', () => {

  describe('calculateItemSurge', () => {
    it('should return no surge cost for a standard small package', () => {
      const result = calculateItemSurge(30, 30, 30, 10, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should apply AHS Weight surge for package > 25kg', () => {
      const result = calculateItemSurge(30, 30, 30, 30, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(SURGE_RATES.AHS_WEIGHT);
      expect(result.warnings[0]).toContain('AHS Weight');
    });

    it('should apply AHS Dimension surge for Length > 122cm', () => {
      const result = calculateItemSurge(130, 30, 30, 10, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(SURGE_RATES.AHS_DIMENSION);
      expect(result.warnings[0]).toContain('AHS Dim');
    });

    it('should apply Large Package Surcharge logic correctly', () => {
      const result = calculateItemSurge(100, 60, 60, 20, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(SURGE_RATES.LARGE_PACKAGE);
      expect(result.warnings[0]).toContain('Large Package');
    });

    it('should apply heavy penalty for Over Max Limits', () => {
      const result = calculateItemSurge(50, 50, 50, 75, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(SURGE_RATES.OVER_MAX);
      expect(result.warnings[0]).toContain('Exceeds Max Limits');
    });
  });

  // --- Zone Mapping Tests ---

  describe('determineUpsZone', () => {
    it('maps US to Z5 (CA/US)', () => {
      expect(determineUpsZone('US')).toEqual({ rateKey: 'Z5', label: 'CA/US' });
    });

    it('maps CN to Z1 (SG/TW/MO/CN)', () => {
      expect(determineUpsZone('CN')).toEqual({ rateKey: 'Z1', label: 'SG/TW/MO/CN' });
    });

    it('maps JP to Z2 (JP/VN)', () => {
      expect(determineUpsZone('JP')).toEqual({ rateKey: 'Z2', label: 'JP/VN' });
    });

    it('maps HK to Z10 (HK)', () => {
      expect(determineUpsZone('HK')).toEqual({ rateKey: 'Z10', label: 'HK' });
    });

    it('maps TH to Z3 (TH/PH)', () => {
      expect(determineUpsZone('TH')).toEqual({ rateKey: 'Z3', label: 'TH/PH' });
    });

    it('maps SG to Z1 (not Z2)', () => {
      expect(determineUpsZone('SG')).toEqual({ rateKey: 'Z1', label: 'SG/TW/MO/CN' });
    });

    it('maps unknown country to Rest of World (Z10)', () => {
      expect(determineUpsZone('XX')).toEqual({ rateKey: 'Z10', label: 'Rest of World' });
    });
  });

  describe('determineDhlZone', () => {
    it('maps JP to Z2', () => {
      expect(determineDhlZone('JP')).toEqual({ rateKey: 'Z2', label: 'Japan' });
    });

    it('maps CN to Z1', () => {
      expect(determineDhlZone('CN')).toEqual({ rateKey: 'Z1', label: 'CN/HK/SG/TW' });
    });

    it('maps US to Z6', () => {
      expect(determineDhlZone('US')).toEqual({ rateKey: 'Z6', label: 'US/CA' });
    });

    it('maps DE to Z7 (Europe)', () => {
      expect(determineDhlZone('DE')).toEqual({ rateKey: 'Z7', label: 'Europe' });
    });

    it('falls back to Z8 for unknown country', () => {
      expect(determineDhlZone('XX')).toEqual({ rateKey: 'Z8', label: 'Rest of World' });
    });
  });

  // --- DHL Cost Tests ---

  describe('calculateDhlCosts', () => {
    it('returns correct exact rate for DHL Z1 at 1kg', () => {
      const result = calculateDhlCosts(1, 'CN', 0);
      expect(result.intlBase).toBe(60914);
      expect(result.intlFsc).toBe(0);
      expect(result.intlWarRisk).toBe(60914 * WAR_RISK_SURCHARGE_RATE);
    });

    it('returns correct exact rate for DHL Z6 at 5kg', () => {
      const result = calculateDhlCosts(5, 'US', 0);
      expect(result.intlBase).toBe(DHL_EXACT_RATES['Z6'][5]);
    });

    it('uses range rate for DHL Z1 at 50kg', () => {
      const result = calculateDhlCosts(50, 'CN', 0);
      // ceil(50) * 7752 = 387600
      expect(result.intlBase).toBe(50 * 7752);
    });

    it('applies FSC correctly', () => {
      const result = calculateDhlCosts(1, 'CN', 30);
      expect(result.intlFsc).toBeCloseTo(60914 * 0.30, 0);
    });

    it('applies war risk correctly', () => {
      const result = calculateDhlCosts(1, 'CN', 0);
      expect(result.intlWarRisk).toBeCloseTo(60914 * 0.05, 0);
    });
  });

  // --- EMAX Cost Tests ---

  describe('calculateEmaxCosts', () => {
    it('calculates EMAX CN at 10kg', () => {
      const result = calculateEmaxCosts(10, 'CN');
      // ceil(10) * 13500 + 15000 = 150000
      expect(result.intlBase).toBe(150000);
      expect(result.intlFsc).toBe(0);
      expect(result.intlWarRisk).toBe(0);
    });

    it('calculates EMAX VN at 5.3kg', () => {
      const result = calculateEmaxCosts(5.3, 'VN');
      // ceil(5.3) * 10000 + 15000 = 75000
      expect(result.intlBase).toBe(75000);
    });

    it('defaults unknown country to VN rate', () => {
      const result = calculateEmaxCosts(1, 'TH');
      // ceil(1) * 10000 + 15000 = 25000
      expect(result.intlBase).toBe(25000);
    });

    it('returns zero FSC and war risk', () => {
      const result = calculateEmaxCosts(10, 'CN');
      expect(result.intlFsc).toBe(0);
      expect(result.intlWarRisk).toBe(0);
    });
  });

  // --- calculateQuote() Integration Tests ---

  describe('calculateQuote', () => {
    const baseInput: QuoteInput = {
      originCountry: 'KR',
      destinationCountry: 'US',
      destinationZip: '10001',
      incoterm: Incoterm.DAP,
      packingType: PackingType.NONE,
      items: [{ id: '1', width: 30, length: 40, height: 30, weight: 10, quantity: 1 }],
      marginPercent: 15,
      dutyTaxEstimate: 0,
      exchangeRate: 1430,
      fscPercent: 30,
    };

    it('UPS quote: populates all breakdown fields', () => {
      const result = calculateQuote({ ...baseInput, overseasCarrier: 'UPS' });
      expect(result.carrier).toBe('UPS');
      expect(result.breakdown.intlBase).toBeGreaterThan(0);
      expect(result.breakdown.intlFsc).toBeGreaterThan(0);
      expect(result.breakdown.intlWarRisk).toBeGreaterThan(0);
      expect(result.totalQuoteAmount).toBeGreaterThan(0);
      expect(result.totalCostAmount).toBeGreaterThan(0);
    });

    it('DHL quote: uses DHL zone and rates', () => {
      const result = calculateQuote({
        ...baseInput,
        overseasCarrier: 'DHL',
        destinationCountry: 'JP',
      });
      expect(result.carrier).toBe('DHL');
      expect(result.appliedZone).toBe('Japan');
      expect(result.breakdown.intlBase).toBeGreaterThan(0);
    });

    it('EMAX quote: uses 6000 volumetric divisor and EMAX rates', () => {
      const result = calculateQuote({
        ...baseInput,
        overseasCarrier: 'EMAX',
        destinationCountry: 'CN',
      });
      expect(result.carrier).toBe('EMAX');
      expect(result.appliedZone).toContain('E-MAX');
      expect(result.breakdown.intlFsc).toBe(0);
      expect(result.breakdown.intlWarRisk).toBe(0);
    });

    it('margin calculation: 15% margin on cost', () => {
      const result = calculateQuote(baseInput);
      // totalQuoteAmount = ceil(cost / (1 - 0.15) / 100) * 100
      expect(result.totalQuoteAmount % 100).toBe(0);
      expect(result.profitAmount).toBeGreaterThan(0);
    });

    it('EXW incoterm: quoteBasisCost excludes international freight', () => {
      const result = calculateQuote({ ...baseInput, incoterm: Incoterm.EXW });
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('Collect Term')])
      );
      // With EXW, total quote should be lower than DAP for same input
      const dapResult = calculateQuote({ ...baseInput, incoterm: Incoterm.DAP });
      expect(result.totalQuoteAmount).toBeLessThan(dapResult.totalQuoteAmount);
    });

    it('defaults to UPS when no carrier specified', () => {
      const result = calculateQuote({ ...baseInput, overseasCarrier: undefined });
      expect(result.carrier).toBe('UPS');
    });
  });
});
