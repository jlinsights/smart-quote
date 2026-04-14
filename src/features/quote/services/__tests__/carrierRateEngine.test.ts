import { lookupCarrierRate } from '../carrierRateEngine';

const MOCK_EXACT = {
  Z1: { 0.5: 10000, 1.0: 15000, 1.5: 20000, 2.0: 25000, 3.0: 35000 },
  Z2: { 0.5: 12000, 1.0: 18000, 3.0: 30000 },
} as Record<string, Record<number, number>>;

const MOCK_RANGE = [
  { min: 4, max: 70, rates: { Z1: 500, Z2: 700 } },
  { min: 70.1, max: 300, rates: { Z1: 450, Z2: 650 } },
] as Array<{ min: number; max: number; rates: Record<string, number> }>;

describe('lookupCarrierRate', () => {
  // Path 1: exact match via roundToHalf
  describe('Path 1 - exact match', () => {
    it('정확히 0.5 단위로 떨어지는 무게는 exact table에서 조회한다', () => {
      expect(lookupCarrierRate(1.0, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(15000);
    });

    it('소수점이 있어도 roundToHalf 후 exact key가 있으면 exact 반환', () => {
      // 0.8 → roundToHalf = ceil(0.8*2)/2 = ceil(1.6)/2 = 2/2 = 1.0
      expect(lookupCarrierRate(0.8, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(15000);
    });

    it('Z2 zone exact match', () => {
      expect(lookupCarrierRate(3.0, 'Z2', MOCK_EXACT, MOCK_RANGE)).toBe(30000);
    });

    it('0.5kg exact match', () => {
      expect(lookupCarrierRate(0.5, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(10000);
    });
  });

  // Path 2: range match (billableWeight >= r.min && <= r.max)
  describe('Path 2 - range match', () => {
    it('range 내 정수 무게는 range 요율로 계산한다', () => {
      // weight=10, roundToHalf=10.0, not in exact → range[0]: 4<=10<=70 → 500*10=5000
      expect(lookupCarrierRate(10, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(5000);
    });

    it('range 경계 min값에서 range 요율 적용', () => {
      // weight=4, roundToHalf=4.0, not in exact → range[0]: min=4 → 500*4=2000
      expect(lookupCarrierRate(4, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(2000);
    });

    it('두 번째 range에서 요율 계산', () => {
      // weight=100, roundToHalf=100, not in exact → range[1]: 70.1<=100<=300 → 450*100=45000
      expect(lookupCarrierRate(100, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(45000);
    });

    it('Z2 range match', () => {
      // weight=50, Z2 → 700*50=35000
      expect(lookupCarrierRate(50, 'Z2', MOCK_EXACT, MOCK_RANGE)).toBe(35000);
    });
  });

  // Path 3: fallback next higher exact key
  describe('Path 3 - fallback next higher exact key', () => {
    it('exact key가 없고 range도 아닌 무게는 다음 높은 exact key로 폴백한다', () => {
      // weight=2.3, roundToHalf=2.5, not in Z1 exact (keys: 0.5,1,1.5,2,3)
      // not in range (min=4), next higher exact key = 3.0 → 35000
      expect(lookupCarrierRate(2.3, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(35000);
    });

    it('roundToHalf 결과가 exact에 없고 range 미만이면 다음 exact key 사용', () => {
      // weight=1.6, roundToHalf=2.0, Z2 has 2.0? No (Z2 keys: 0.5, 1.0, 3.0)
      // not in range (min=4), next higher key in Z2 >= 2.0 → 3.0 → 30000
      expect(lookupCarrierRate(1.6, 'Z2', MOCK_EXACT, MOCK_RANGE)).toBe(30000);
    });
  });

  // Path 4: nextRange fallback (r.min <= ceil(billableWeight))
  describe('Path 4 - nextRange fallback', () => {
    it('exact 없고 range exact 미만이지만 nextRange 조건에서 폴백', () => {
      // weight=3.3, roundToHalf=3.5, not in Z2 exact
      // range check: 4<=3.5? NO. next higher exact in Z2 (keys 0.5,1.0,3.0): none >= 3.5
      // nextRange: r.min <= ceil(3.3)=4 → range[0] min=4 <= 4 → 700*3.5=2450
      expect(lookupCarrierRate(3.3, 'Z2', MOCK_EXACT, MOCK_RANGE)).toBe(2450);
    });

    it('Z1 nextRange fallback', () => {
      // weight=3.3, roundToHalf=3.5, Z1 has 3.0 exact → actually hits path3
      // weight=3.6, roundToHalf=4.0, Z1: exact? No 4.0 in Z1 → range: 4<=4.0<=70 → exact match in range → path2
      // Let me reconsider: weight=3.2, roundToHalf=3.5, Z1: no 3.5 key, range: 4<=3.5? NO
      // next higher exact in Z1 >= 3.5: none (max is 3.0) → nextRange: ceil(3.2)=4 >= range[0].min=4? No wait: r.min <= ceil(billableWeight) → 4 <= 4 → YES → 500*3.5=1750
      expect(lookupCarrierRate(3.2, 'Z1', MOCK_EXACT, MOCK_RANGE)).toBe(1750);
    });
  });

  // Path 5: throw
  describe('Path 5 - throw', () => {
    it('모든 조회 실패 시 에러를 던진다', () => {
      const SMALL_EXACT = { Z1: { 0.5: 10000 } } as Record<string, Record<number, number>>;
      const SMALL_RANGE: Array<{ min: number; max: number; rates: Record<string, number> }> = [];
      // weight=500, roundToHalf=500, no exact, no range, no nextRange
      expect(() => lookupCarrierRate(500, 'Z1', SMALL_EXACT, SMALL_RANGE)).toThrow();
    });

    it('zone key가 없는 경우 에러를 던진다', () => {
      expect(() => lookupCarrierRate(10, 'INVALID_ZONE', MOCK_EXACT, MOCK_RANGE)).toThrow();
    });
  });
});
