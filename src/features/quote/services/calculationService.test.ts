import { describe, it, expect } from 'vitest';
import { calculateItemSurge } from './calculationService';
import { PackingType } from '@/types';
import { SURGE_RATES } from '@/config/rates';

describe('calculationService', () => {
  
  describe('calculateItemSurge', () => {
    it('should return no surge cost for a standard small package', () => {
      // 10kg, 30x30x30
      const result = calculateItemSurge(30, 30, 30, 10, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should apply AHS Weight surge for package > 25kg', () => {
      // 30kg, 30x30x30
      const result = calculateItemSurge(30, 30, 30, 30, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(SURGE_RATES.AHS_WEIGHT);
      expect(result.warnings[0]).toContain('AHS Weight');
    });

    it('should apply AHS Dimension surge for Length > 122cm', () => {
      // 10kg, 130x30x30
      const result = calculateItemSurge(130, 30, 30, 10, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(SURGE_RATES.AHS_DIMENSION);
      expect(result.warnings[0]).toContain('AHS Dim');
    });

    it('should apply Large Package Surcharge logic correctly', () => {
      // Length + Girth > 300cm
      // L=100, W=60, H=60 -> Girth = 2*(60+60) = 240. L+Girth = 340 > 300
      const result = calculateItemSurge(100, 60, 60, 20, PackingType.NONE, 0);
      expect(result.surgeCost).toBe(SURGE_RATES.LARGE_PACKAGE);
      expect(result.warnings[0]).toContain('Large Package');
    });

    it('should apply heavy penalty for Over Max Limits', () => {
        // Weight > 70kg
        const result = calculateItemSurge(50, 50, 50, 75, PackingType.NONE, 0);
        expect(result.surgeCost).toBe(SURGE_RATES.OVER_MAX);
        expect(result.warnings[0]).toContain('Exceeds Max Limits');
    });
  });



});
