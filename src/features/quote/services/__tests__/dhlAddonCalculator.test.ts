import { calculateDhlAddOnCosts } from '../dhlAddonCalculator';
import { PackingType, Incoterm } from '@/types';
import type { QuoteInput } from '@/types';

const makeInput = (overrides: Partial<QuoteInput> = {}): QuoteInput =>
  ({
    originCountry: 'KR',
    destinationCountry: 'JP',
    destinationZip: '',
    incoterm: Incoterm.DAP,
    packingType: PackingType.NONE,
    items: [{ id: '1', length: 30, width: 30, height: 30, weight: 20, quantity: 1 }],
    marginPercent: 15,
    dutyTaxEstimate: 0,
    exchangeRate: 1450,
    fscPercent: 0,
    dhlAddOns: [],
    ...overrides,
  } as QuoteInput);

describe('calculateDhlAddOnCosts', () => {
  it('추가 옵션 없음: total=0', () => {
    const { total } = calculateDhlAddOnCosts(makeInput(), 20, 0);
    expect(total).toBe(0);
  });

  it('OSP 자동 감지 (l=110): total=30000', () => {
    const input = makeInput({
      items: [{ id: '1', length: 110, width: 30, height: 30, weight: 20, quantity: 1 }],
    });
    // sorted=[110,30,30], 110>100 → OSP, amount=30000, fsc=0
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(30_000);
  });

  it('OSP + FSC 46%: total=43800', () => {
    const input = makeInput({
      items: [{ id: '1', length: 110, width: 30, height: 30, weight: 20, quantity: 1 }],
    });
    // 30000 + 30000*0.46 = 30000 + 13800 = 43800
    const { total } = calculateDhlAddOnCosts(input, 20, 46);
    expect(total).toBe(43_800);
  });

  it('OWT 자동 감지 (wt=80): total=150000', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 80, quantity: 1 }],
    });
    // 80>70 → OWT, amount=150000, fsc=0
    const { total } = calculateDhlAddOnCosts(input, 80, 0);
    expect(total).toBe(150_000);
  });

  it('RMT 선택 wt=50: total=37500', () => {
    const input = makeInput({ dhlAddOns: ['RMT'] });
    // max(35000, ceil(50)*750) = max(35000, 37500) = 37500
    const { total } = calculateDhlAddOnCosts(input, 50, 0);
    expect(total).toBe(37_500);
  });

  it('INS 선택 declaredValue=2000000: total=20000', () => {
    const input = makeInput({ dhlAddOns: ['INS'], dhlDeclaredValue: 2_000_000 });
    // max(2000000*0.01, 17000) = max(20000, 17000) = 20000, fscApplicable=false
    const { total } = calculateDhlAddOnCosts(input, 20, 0);
    expect(total).toBe(20_000);
  });

  it('IRR 선택 수량=2 + FSC 46%: total=87600', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 20, quantity: 2 }],
      dhlAddOns: ['IRR'],
    });
    // 30000*2=60000, fsc=60000*0.46=27600 → 87600
    const { total } = calculateDhlAddOnCosts(input, 20, 46);
    expect(total).toBe(87_600);
  });
});
