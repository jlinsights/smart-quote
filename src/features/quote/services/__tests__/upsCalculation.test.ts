import { calculateUpsCosts } from '../upsCalculation';

describe('calculateUpsCosts', () => {
  it('JP(Z2) 무게=10: intlBase=123196', () => {
    expect(calculateUpsCosts(10, 'JP').intlBase).toBe(123196);
  });

  it('SG(Z1) 무게=10: intlBase=100624', () => {
    expect(calculateUpsCosts(10, 'SG').intlBase).toBe(100624);
  });

  it('JP(Z2) 무게=1: intlBase=55784', () => {
    expect(calculateUpsCosts(1, 'JP').intlBase).toBe(55784);
  });

  it('SG(Z1) 무게=1: intlBase=54872', () => {
    expect(calculateUpsCosts(1, 'SG').intlBase).toBe(54872);
  });

  it('intlFsc는 항상 0', () => {
    expect(calculateUpsCosts(10, 'JP').intlFsc).toBe(0);
  });

  it('intlWarRisk는 항상 0 (WAR_RISK_SURCHARGE_RATE=0)', () => {
    expect(calculateUpsCosts(10, 'JP').intlWarRisk).toBe(0);
  });

  it('appliedZone은 Z2 포함 (JP)', () => {
    expect(calculateUpsCosts(10, 'JP').appliedZone).toContain('Z2');
  });

  it('appliedZone은 Z1 포함 (SG)', () => {
    expect(calculateUpsCosts(10, 'SG').appliedZone).toContain('Z1');
  });

  it('transitTime 반환됨', () => {
    expect(calculateUpsCosts(10, 'JP').transitTime).toBeTruthy();
  });

  it('transitTime은 string 또는 number 타입을 반환한다', () => {
    const result = calculateUpsCosts(10, 'JP');
    expect(typeof result.transitTime).toMatch(/^(string|number)$/);
  });
});
