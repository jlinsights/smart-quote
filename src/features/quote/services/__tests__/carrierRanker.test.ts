import { assignBadges, rankCarriers } from '../carrierRanker';
import type { CarrierComparisonItem } from '@/types';

const makeItem = (
  overrides: Partial<CarrierComparisonItem> = {}
): CarrierComparisonItem => ({
  carrier: 'UPS',
  revenueKrw: 100000,
  costKrw: 80000,
  marginPct: 20,
  transitDaysMin: 3,
  transitDaysMax: 5,
  co2Kg: 10,
  qualityScore: 4.0,
  badges: [],
  ...overrides,
});

describe('assignBadges', () => {
  it('returns empty array for empty input', () => {
    expect(assignBadges([])).toEqual([]);
  });

  it('assigns all 3 badges to single item', () => {
    const items = [makeItem()];
    const result = assignBadges(items);
    expect(result[0].badges).toContain('cheapest');
    expect(result[0].badges).toContain('fastest');
    expect(result[0].badges).toContain('greenest');
  });

  it('distributes badges across 3 carriers correctly', () => {
    const items = [
      makeItem({ carrier: 'UPS', revenueKrw: 100000, transitDaysMin: 3, co2Kg: 15 }),
      makeItem({ carrier: 'DHL', revenueKrw: 120000, transitDaysMin: 2, co2Kg: 10 }),
      makeItem({ carrier: 'FEDEX', revenueKrw: 90000, transitDaysMin: 4, co2Kg: 20 }),
    ];
    const result = assignBadges(items);

    expect(result[0].badges).toEqual([]); // UPS: nothing
    expect(result[1].badges).toEqual(['fastest', 'greenest']); // DHL
    expect(result[2].badges).toEqual(['cheapest']); // FEDEX
  });

  it('does not mutate input array', () => {
    const items = [makeItem()];
    const original = JSON.stringify(items);
    assignBadges(items);
    expect(JSON.stringify(items)).toBe(original);
  });

  it('skips greenest badge when all co2Kg are null', () => {
    const items = [
      makeItem({ carrier: 'UPS', co2Kg: null }),
      makeItem({ carrier: 'DHL', co2Kg: null }),
    ];
    const result = assignBadges(items);
    const hasGreenest = result.some(r => r.badges.includes('greenest'));
    expect(hasGreenest).toBe(false);
  });

  it('awards greenest to the only non-null co2 item', () => {
    const items = [
      makeItem({ carrier: 'UPS', co2Kg: null }),
      makeItem({ carrier: 'DHL', co2Kg: 12 }),
    ];
    const result = assignBadges(items);
    expect(result[1].badges).toContain('greenest');
    expect(result[0].badges).not.toContain('greenest');
  });
});

describe('rankCarriers', () => {
  const items = [
    makeItem({ carrier: 'UPS', revenueKrw: 100000, transitDaysMin: 3, co2Kg: 15, qualityScore: 4.5 }),
    makeItem({ carrier: 'DHL', revenueKrw: 120000, transitDaysMin: 2, co2Kg: 10, qualityScore: 4.7 }),
    makeItem({ carrier: 'FEDEX', revenueKrw: 90000, transitDaysMin: 4, co2Kg: 20, qualityScore: 4.3 }),
  ];

  it('sorts by price ascending', () => {
    const result = rankCarriers(items, 'price');
    expect(result.map(r => r.carrier)).toEqual(['FEDEX', 'UPS', 'DHL']);
  });

  it('sorts by transit ascending', () => {
    const result = rankCarriers(items, 'transit');
    expect(result.map(r => r.carrier)).toEqual(['DHL', 'UPS', 'FEDEX']);
  });

  it('sorts by co2 ascending with null values last', () => {
    const itemsWithNull = [
      makeItem({ carrier: 'UPS', co2Kg: null }),
      makeItem({ carrier: 'DHL', co2Kg: 10 }),
      makeItem({ carrier: 'FEDEX', co2Kg: 20 }),
    ];
    const result = rankCarriers(itemsWithNull, 'co2');
    expect(result.map(r => r.carrier)).toEqual(['DHL', 'FEDEX', 'UPS']);
  });

  it('sorts by quality descending', () => {
    const result = rankCarriers(items, 'quality');
    expect(result.map(r => r.carrier)).toEqual(['DHL', 'UPS', 'FEDEX']);
  });

  it('applies badges before sorting', () => {
    const result = rankCarriers(items, 'price');
    const fedex = result.find(r => r.carrier === 'FEDEX');
    expect(fedex?.badges).toContain('cheapest');
  });
});
