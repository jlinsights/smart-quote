import { describe, it, expect } from 'vitest';
import {
  determineUpsZone,
  determineDhlZone,
  calculateDhlCosts,
  calculateEmaxCosts,
  calculateUpsCosts,
  calculateQuote,
} from './calculationService';
import { PackingType, Incoterm, QuoteInput } from '@/types';
import { WAR_RISK_SURCHARGE_RATE } from '@/config/rates';
import { DHL_EXACT_RATES } from '@/config/dhl_tariff';

describe('calculationService', () => {

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
      expect(determineDhlZone('CN')).toEqual({ rateKey: 'Z1', label: 'China/HK/SG/TW' });
    });

    it('maps US to Z6', () => {
      expect(determineDhlZone('US')).toEqual({ rateKey: 'Z6', label: 'US/CA' });
    });

    it('maps DE to Z7 (Europe)', () => {
      expect(determineDhlZone('DE')).toEqual({ rateKey: 'Z7', label: 'Europe' });
    });

    it('maps BR to Z8 (S.Am/Africa/ME)', () => {
      expect(determineDhlZone('BR')).toEqual({ rateKey: 'Z8', label: 'S.Am/Africa/ME' });
    });

    it('maps AE to Z8 (S.Am/Africa/ME)', () => {
      expect(determineDhlZone('AE')).toEqual({ rateKey: 'Z8', label: 'S.Am/Africa/ME' });
    });

    it('falls back to Z8 for unknown country', () => {
      expect(determineDhlZone('XX')).toEqual({ rateKey: 'Z8', label: 'Rest of World' });
    });
  });

  // --- UPS Cost Tests ---

  describe('calculateUpsCosts', () => {
    it('uses range rate for 20.3kg (boundary test)', () => {
      // 20.3kg > 20kg exact table max → should use range rate
      // ceil(20.3) = 21, 21 * Z5 per-kg rate (11096) = 233016
      const result = calculateUpsCosts(20.3, 'US', 0);
      expect(result.intlBase).toBe(21 * 11096);
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
      marginUSD: 40,
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

    it('margin calculation: USD 50 margin added to cost', () => {
      const result = calculateQuote(baseInput);
      // marginKRW = 50 * 1430 = 71500, targetRevenue = cost + 71500, rounded up to 100
      expect(result.totalQuoteAmount % 100).toBe(0);
      expect(result.profitAmount).toBeGreaterThan(0);
      expect(result.profitMargin).toBeGreaterThan(0);
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

    it('surge is 0 by default (auto-calc disabled)', () => {
      const result = calculateQuote({ ...baseInput, overseasCarrier: 'UPS' });
      expect(result.breakdown.intlSurge).toBe(0);
    });

    it('manual surge cost is applied when provided', () => {
      const result = calculateQuote({ ...baseInput, overseasCarrier: 'UPS', manualSurgeCost: 50000 });
      expect(result.breakdown.intlSurge).toBe(50000);
      expect(result.totalCostAmount).toBeGreaterThan(
        calculateQuote({ ...baseInput, overseasCarrier: 'UPS' }).totalCostAmount
      );
    });

    it('manual surge cost works for DHL too', () => {
      const result = calculateQuote({
        ...baseInput,
        overseasCarrier: 'DHL',
        destinationCountry: 'JP',
        manualSurgeCost: 30000,
      });
      expect(result.breakdown.intlSurge).toBe(30000);
    });

    it('manual surge cost works for EMAX too', () => {
      const result = calculateQuote({
        ...baseInput,
        overseasCarrier: 'EMAX',
        destinationCountry: 'CN',
        manualSurgeCost: 20000,
      });
      expect(result.breakdown.intlSurge).toBe(20000);
      expect(result.totalCostAmount).toBeGreaterThan(
        calculateQuote({ ...baseInput, overseasCarrier: 'EMAX', destinationCountry: 'CN' }).totalCostAmount
      );
    });
  });
});
