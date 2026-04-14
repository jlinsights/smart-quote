import {
  calculateVolumetricWeight,
  calculateItemCosts,
  computePackingTotal,
} from '../itemCalculation';
import { PackingType } from '@/types';

describe('calculateVolumetricWeight', () => {
  it('기본 divisor(5000)로 계산', () => {
    expect(calculateVolumetricWeight(50, 40, 35)).toBe(14);
  });

  it('커스텀 divisor(6000)로 계산', () => {
    expect(calculateVolumetricWeight(50, 40, 35, 6000)).toBeCloseTo(11.667, 2);
  });

  it('소수 치수는 ceil 처리 후 계산', () => {
    // Math.ceil(50.1)*Math.ceil(40.1)*Math.ceil(35.1)/5000 = 51*41*36/5000 = 75276/5000 = 15.0552
    expect(calculateVolumetricWeight(50.1, 40.1, 35.1)).toBeCloseTo(15.0552, 3);
  });
});

describe('calculateItemCosts', () => {
  const item = { id: '1', length: 40, width: 30, height: 20, weight: 5, quantity: 1 };

  describe('PackingType.NONE', () => {
    it('포장 없음: 치수 변경 없음, 재료비/인건비 = 0', () => {
      const result = calculateItemCosts([item], PackingType.NONE);
      expect(result.totalActualWeight).toBe(5);
      // 40*30*20/5000 = 4.8
      expect(result.totalPackedVolumetricWeight).toBe(4.8);
      expect(result.packingMaterialCost).toBe(0);
      expect(result.packingLaborCost).toBe(0);
    });
  });

  describe('PackingType.WOODEN_BOX', () => {
    it('목재 박스: packed dims (50,40,35), 실제중량=15.5, 체적=14', () => {
      const result = calculateItemCosts([item], PackingType.WOODEN_BOX);
      // packed weight = 5 * 1.1 + 10 = 15.5
      expect(result.totalActualWeight).toBe(15.5);
      // 50*40*35/5000 = 14
      expect(result.totalPackedVolumetricWeight).toBe(14);
    });

    it('목재 박스: 표면적=1.03m², 재료비=15450, 인건비=50000', () => {
      const result = calculateItemCosts([item], PackingType.WOODEN_BOX);
      // surfaceArea = 2*(50*40 + 50*35 + 40*35)/10000 = 2*5150/10000 = 1.03
      // materialCost = 1.03 * 15000 = 15450
      expect(result.packingMaterialCost).toBe(15450);
      expect(result.packingLaborCost).toBe(50000);
    });

    it('수량 2개: 재료비=30900, 인건비=100000, 총실제중량=31', () => {
      const twoItems = [{ ...item, quantity: 2 }];
      const result = calculateItemCosts(twoItems, PackingType.WOODEN_BOX);
      expect(result.totalActualWeight).toBe(31);
      expect(result.packingMaterialCost).toBe(30900);
      expect(result.packingLaborCost).toBe(100000);
    });
  });

  describe('PackingType.VACUUM', () => {
    it('진공 포장: 인건비 = 50000 * 1.5 = 75000', () => {
      const result = calculateItemCosts([item], PackingType.VACUUM);
      expect(result.packingLaborCost).toBe(75000);
    });
  });

  describe('manualPackingCost 오버라이드', () => {
    it('manualPackingCost=50000: 재료비=50000, 인건비=0', () => {
      const result = calculateItemCosts([item], PackingType.WOODEN_BOX, 50000);
      expect(result.packingMaterialCost).toBe(50000);
      expect(result.packingLaborCost).toBe(0);
    });

    it('manualPackingCost=0: 재료비=0, 인건비=0 (0도 유효)', () => {
      const result = calculateItemCosts([item], PackingType.WOODEN_BOX, 0);
      expect(result.packingMaterialCost).toBe(0);
      expect(result.packingLaborCost).toBe(0);
    });
  });

  describe('여러 아이템', () => {
    it('두 아이템 합산', () => {
      const items = [
        { id: '1', length: 40, width: 30, height: 20, weight: 5, quantity: 1 },
        { id: '2', length: 30, width: 20, height: 10, weight: 3, quantity: 1 },
      ];
      const result = calculateItemCosts(items, PackingType.NONE);
      expect(result.totalActualWeight).toBe(8);
      // 40*30*20/5000 + 30*20*10/5000 = 4.8 + 1.2 = 6
      expect(result.totalPackedVolumetricWeight).toBe(6);
    });
  });
});

describe('computePackingTotal', () => {
  it('WOODEN_BOX: fumigation=30000, total=packingMaterial+labor+30000', () => {
    const result = computePackingTotal(15450, 50000, PackingType.WOODEN_BOX);
    expect(result.packingFumigationCost).toBe(30000);
    expect(result.packingTotal).toBe(95450);
  });

  it('PackingType.NONE: fumigation=0, total=0', () => {
    const result = computePackingTotal(0, 0, PackingType.NONE);
    expect(result.packingFumigationCost).toBe(0);
    expect(result.packingTotal).toBe(0);
  });

  it('manualPackingCost 제공 시 fumigation 억제', () => {
    const result = computePackingTotal(50000, 0, PackingType.WOODEN_BOX, 50000);
    expect(result.packingFumigationCost).toBe(0);
    expect(result.packingTotal).toBe(50000);
  });

  it('VACUUM: fumigation=30000 (manualPackingCost 없을 때)', () => {
    const result = computePackingTotal(10000, 75000, PackingType.VACUUM);
    expect(result.packingFumigationCost).toBe(30000);
    expect(result.packingTotal).toBe(115000);
  });
});
