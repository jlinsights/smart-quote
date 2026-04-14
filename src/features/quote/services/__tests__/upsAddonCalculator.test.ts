import { calculateUpsAddOnCosts } from '../upsAddonCalculator';
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
    upsAddOns: [],
    ...overrides,
  }) as QuoteInput;

describe('calculateUpsAddOnCosts', () => {
  it('추가 옵션 없음: total=0', () => {
    const { total } = calculateUpsAddOnCosts(makeInput(), 10, 0);
    expect(total).toBe(0);
  });

  it('DDP 자동 감지: total=28500', () => {
    const input = makeInput({ incoterm: Incoterm.DDP });
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(28500);
  });

  it('AHS 자동 감지 (wt=26): total=21400', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 26, quantity: 1 }],
    });
    const { total } = calculateUpsAddOnCosts(input, 26, 0);
    expect(total).toBe(21400);
  });

  it('AHS + FSC 48.5%: total=31779', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 26, quantity: 1 }],
    });
    // 21400 + 21400*0.485 = 21400 + 10379 = 31779
    const { total } = calculateUpsAddOnCosts(input, 26, 48.5);
    expect(total).toBe(31779);
  });

  it('SGF 이스라엘(IL) 행선지 wt=10: total=47220', () => {
    const input = makeInput({ destinationCountry: 'IL' });
    // ceil(10)*4722 = 47220, fsc=0
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(47220);
  });

  it('SGF 중동(AE) wt=10 + FSC 50%: total=30060', () => {
    const input = makeInput({ destinationCountry: 'AE' });
    // ceil(10)*2004 = 20040 + 20040*0.5 = 10020 → 30060
    const { total } = calculateUpsAddOnCosts(input, 10, 50);
    expect(total).toBe(30060);
  });

  it('RMT 선택 wt=10: total=31400 (min금액 적용)', () => {
    const input = makeInput({ upsAddOns: ['RMT'] });
    // max(31400, ceil(10)*570) = max(31400, 5700) = 31400
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(31400);
  });

  it('EXT 선택 wt=60: total=38400 (rate 적용)', () => {
    const input = makeInput({ upsAddOns: ['EXT'] });
    // max(34200, ceil(60)*640) = max(34200, 38400) = 38400
    const { total } = calculateUpsAddOnCosts(input, 60, 0);
    expect(total).toBe(38400);
  });

  it('ADC 선택 수량=2: total=30200', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 20, quantity: 2 }],
      upsAddOns: ['ADC'],
    });
    // 2 cartons * 15100 = 30200
    const { total } = calculateUpsAddOnCosts(input, 20, 0);
    expect(total).toBe(30200);
  });

  it('AHS 경계값: wt=25 → AHS 미적용 (total=0)', () => {
    const input = makeInput({
      items: [{ id: '1', length: 30, width: 30, height: 30, weight: 25, quantity: 1 }],
    });
    // weight > 25 조건 → wt=25는 미적용
    const { total } = calculateUpsAddOnCosts(input, 25, 0);
    expect(total).toBe(0);
  });

  it('AHS 최장변 >122cm: total=21400', () => {
    const input = makeInput({
      items: [{ id: '1', length: 123, width: 30, height: 30, weight: 10, quantity: 1 }],
    });
    // sorted[0]=123 > 122 → AHS 자동 감지
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(21400);
  });

  it('AHS 2번째 긴 변 >76cm: total=21400', () => {
    const input = makeInput({
      items: [{ id: '1', length: 100, width: 77, height: 30, weight: 10, quantity: 1 }],
    });
    // sorted=[100,77,30], sorted[1]=77 > 76 → AHS 자동 감지
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(21400);
  });

  it('AHS WOODEN_BOX 포장: total=21400', () => {
    const input = makeInput({ packingType: PackingType.WOODEN_BOX });
    const { total } = calculateUpsAddOnCosts(input, 20, 0);
    expect(total).toBe(21400);
  });

  it('AHS SKID 포장: total=21400', () => {
    const input = makeInput({ packingType: PackingType.SKID });
    const { total } = calculateUpsAddOnCosts(input, 20, 0);
    expect(total).toBe(21400);
  });

  it('DDP + FSC 50%: total=28500 (DDP는 FSC 미적용)', () => {
    const input = makeInput({ incoterm: Incoterm.DDP });
    // fscApplicable=false이므로 FSC 50%여도 28500 그대로
    const { total } = calculateUpsAddOnCosts(input, 10, 50);
    expect(total).toBe(28500);
  });

  it('SGF 미국(US) 행선지: total=0 (서지피 미적용)', () => {
    const input = makeInput({ destinationCountry: 'US' });
    // US는 이스라엘/중동 목록에 없음 → SGF 미적용
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(0);
  });

  it('DB 요금 오버라이드: resolvedAddonRates 사용', () => {
    const input = makeInput({
      incoterm: Incoterm.DDP,
      resolvedAddonRates: [
        {
          carrier: 'UPS',
          code: 'DDP',
          amount: 30000,
          fscApplicable: false,
          nameKo: 'DDP 수수료',
          nameEn: 'DDP Service Fee',
          chargeType: 'fixed',
          unit: 'shipment',
          perKgRate: null,
          ratePercent: null,
          minAmount: null,
          autoDetect: false,
          selectable: true,
          condition: null,
          detectRules: null,
        },
      ],
    });
    // DB 요금(30000)이 기본 하드코딩(28500)을 대체해야 함
    const { total } = calculateUpsAddOnCosts(input, 10, 0);
    expect(total).toBe(30000);
  });
});
