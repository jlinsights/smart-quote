import { calculateDhlCosts } from '../dhlCalculation';
import { calculateUpsCosts } from '../upsCalculation';

describe('calculateDhlCosts', () => {
  it('JP(Z2) 무게=10: intlBase=128972', () => {
    expect(calculateDhlCosts(10, 'JP').intlBase).toBe(128972);
  });

  it('SG(Z1) 무게=10: intlBase=114874', () => {
    expect(calculateDhlCosts(10, 'SG').intlBase).toBe(114874);
  });

  it('JP(Z2) 무게=1: intlBase=63688', () => {
    expect(calculateDhlCosts(1, 'JP').intlBase).toBe(63688);
  });

  it('SG(Z1) 무게=1: intlBase=60914', () => {
    expect(calculateDhlCosts(1, 'SG').intlBase).toBe(60914);
  });

  it('intlFsc는 항상 0', () => {
    expect(calculateDhlCosts(10, 'JP').intlFsc).toBe(0);
  });

  it('intlWarRisk는 항상 0 (WAR_RISK_SURCHARGE_RATE=0)', () => {
    expect(calculateDhlCosts(10, 'JP').intlWarRisk).toBe(0);
  });

  it('appliedZone은 Z2 포함 (JP)', () => {
    expect(calculateDhlCosts(10, 'JP').appliedZone).toContain('Z2');
  });

  it('appliedZone은 Z1 포함 (SG)', () => {
    expect(calculateDhlCosts(10, 'SG').appliedZone).toContain('Z1');
  });

  it('transitTime 반환됨', () => {
    expect(calculateDhlCosts(10, 'JP').transitTime).toBeTruthy();
  });

  it('UPS와 DHL의 intlBase가 다르다 (같은 국가/무게)', () => {
    expect(calculateUpsCosts(10, 'JP').intlBase).not.toBe(calculateDhlCosts(10, 'JP').intlBase);
  });
});
