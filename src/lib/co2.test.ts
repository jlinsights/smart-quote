import { calculateCo2Kg } from './co2';

describe('calculateCo2Kg', () => {
  // Formula: (weightKg × distanceKm × emissionFactor × 0.7) / 1000
  // UPS emissionFactor = 0.602, DHL = 0.520, FEDEX = 0.645
  // Distance KR→US = 11000 km, KR→JP = 1200 km

  it('calculates UPS to US for 5 kg correctly', () => {
    // (5 × 11000 × 0.602 × 0.7) / 1000 = 23.177 → rounded 23.18
    expect(calculateCo2Kg('UPS', 5, 'US')).toBe(23.18);
  });

  it('calculates DHL to US for 5 kg correctly', () => {
    // (5 × 11000 × 0.520 × 0.7) / 1000 = 20.02
    expect(calculateCo2Kg('DHL', 5, 'US')).toBe(20.02);
  });

  it('calculates FEDEX to US for 5 kg correctly', () => {
    // (5 × 11000 × 0.645 × 0.7) / 1000 = 24.8325 → 24.83
    expect(calculateCo2Kg('FEDEX', 5, 'US')).toBe(24.83);
  });

  it('DHL has lowest emissions (greenest) on same route', () => {
    const dhl = calculateCo2Kg('DHL', 10, 'DE')!;
    const ups = calculateCo2Kg('UPS', 10, 'DE')!;
    const fedex = calculateCo2Kg('FEDEX', 10, 'DE')!;
    expect(dhl).toBeLessThan(ups);
    expect(ups).toBeLessThan(fedex);
  });

  it('shorter distance produces less emissions', () => {
    const toJp = calculateCo2Kg('UPS', 5, 'JP')!; // 1200 km
    const toUs = calculateCo2Kg('UPS', 5, 'US')!; // 11000 km
    expect(toJp).toBeLessThan(toUs);
  });

  it('heavier weight produces more emissions proportionally', () => {
    const light = calculateCo2Kg('UPS', 5, 'US')!;
    const heavy = calculateCo2Kg('UPS', 10, 'US')!;
    expect(heavy).toBeCloseTo(light * 2, 1);
  });

  it('uses _DEFAULT distance for unknown destination', () => {
    // _DEFAULT = 9000 km
    // (5 × 9000 × 0.602 × 0.7) / 1000 = 18.963 → 18.96
    expect(calculateCo2Kg('UPS', 5, 'XX')).toBe(18.96);
  });

  it('returns null for zero or negative weight', () => {
    expect(calculateCo2Kg('UPS', 0, 'US')).toBeNull();
    expect(calculateCo2Kg('UPS', -5, 'US')).toBeNull();
  });

  it('returns null for NaN weight', () => {
    expect(calculateCo2Kg('UPS', NaN, 'US')).toBeNull();
    expect(calculateCo2Kg('UPS', Infinity, 'US')).toBeNull();
  });

  it('handles undefined destination (uses _DEFAULT)', () => {
    expect(calculateCo2Kg('UPS', 5, undefined)).toBe(18.96);
  });

  it('is case-insensitive on destination country', () => {
    expect(calculateCo2Kg('UPS', 5, 'us')).toBe(
      calculateCo2Kg('UPS', 5, 'US'),
    );
  });
});
