import type { CarrierComparisonItem, CarrierBadge, CarrierSortKey } from '@/types';

/**
 * Assign badges (cheapest / fastest / greenest) to carrier comparison items.
 * Each badge awarded to exactly one carrier (first-match on tie).
 * Returns new array with badges populated; does not mutate input.
 */
export function assignBadges(items: CarrierComparisonItem[]): CarrierComparisonItem[] {
  if (items.length === 0) return [];

  const cheapestIdx = items.reduce(
    (min, item, i) => (item.revenueKrw < items[min].revenueKrw ? i : min),
    0
  );

  const fastestIdx = items.reduce(
    (min, item, i) => (item.transitDaysMin < items[min].transitDaysMin ? i : min),
    0
  );

  // Greenest: lowest non-null co2Kg. Returns -1 if all null.
  let greenestIdx = -1;
  let lowestCo2 = Infinity;
  items.forEach((item, i) => {
    if (item.co2Kg !== null && item.co2Kg < lowestCo2) {
      lowestCo2 = item.co2Kg;
      greenestIdx = i;
    }
  });

  return items.map((item, i) => {
    const badges: CarrierBadge[] = [];
    if (i === cheapestIdx) badges.push('cheapest');
    if (i === fastestIdx) badges.push('fastest');
    if (i === greenestIdx) badges.push('greenest');
    return { ...item, badges };
  });
}

/**
 * Rank carriers by the given sort key. Always applies badges first.
 * For 'co2' sort, items with null co2Kg are pushed to the end.
 */
export function rankCarriers(
  items: CarrierComparisonItem[],
  sortBy: CarrierSortKey
): CarrierComparisonItem[] {
  const withBadges = assignBadges(items);

  return [...withBadges].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.revenueKrw - b.revenueKrw;
      case 'transit':
        return a.transitDaysMin - b.transitDaysMin;
      case 'co2':
        if (a.co2Kg === null && b.co2Kg === null) return 0;
        if (a.co2Kg === null) return 1;
        if (b.co2Kg === null) return -1;
        return a.co2Kg - b.co2Kg;
      case 'quality':
        return b.qualityScore - a.qualityScore;
    }
  });
}
