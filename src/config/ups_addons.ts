/**
 * UPS Korea 부가서비스 요금표 (2026년)
 * Source: UPS Korea 공식 부가서비스 가이드
 */

import { PackingType } from '@/types';

export interface UpsAddOn {
  code: string;
  nameKo: string;
  nameEn: string;
  amount: number;
  chargeType: 'fixed' | 'per_carton' | 'calculated';
  unit: 'shipment' | 'carton';
  fscApplicable: boolean;
  autoDetect?: boolean;
  selectable: boolean;
  condition?: string;
  description?: string;
}

export const UPS_ADDON_RATES: UpsAddOn[] = [
  {
    code: 'RES',
    nameKo: '주거지역 서비스',
    nameEn: 'Residential Delivery',
    amount: 4_600,
    chargeType: 'fixed',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
  },
  {
    code: 'RMT',
    nameKo: '외곽요금',
    nameEn: 'Remote Area Surcharge',
    amount: 31_400,
    chargeType: 'calculated',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
    description: '최소 31,400원 또는 KG당 570원 중 큰 값',
  },
  {
    code: 'EXT',
    nameKo: '원거리지역 서비스',
    nameEn: 'Extended Area Surcharge',
    amount: 34_200,
    chargeType: 'calculated',
    unit: 'shipment',
    fscApplicable: true,
    selectable: true,
    description: '최소 34,200원 또는 KG당 640원 중 큰 값',
  },
  {
    code: 'AHS',
    nameKo: '비규격품부가요금',
    nameEn: 'Additional Handling',
    amount: 21_400,
    chargeType: 'per_carton',
    unit: 'carton',
    fscApplicable: true,
    autoDetect: true,
    selectable: false,
    description: 'AHS Weight(>25kg) 또는 AHS Dim(L>122cm, W>76cm) 또는 특수포장',
  },
  {
    code: 'ADC',
    nameKo: '주소정정',
    nameEn: 'Address Correction',
    amount: 15_100,
    chargeType: 'per_carton',
    unit: 'carton',
    fscApplicable: false,
    selectable: true,
  },
  {
    code: 'DDP',
    nameKo: 'DDP 수수료',
    nameEn: 'DDP Service Fee',
    amount: 28_500,
    chargeType: 'fixed',
    unit: 'shipment',
    fscApplicable: false,
    autoDetect: true,
    selectable: false,
    condition: 'DDP',
    description: 'DDP incoterm 선택 시 자동 부과',
  },
];

/** UPS Remote Area: max(31,400, billableWeight * 570) */
export const calculateUpsRemoteAreaFee = (billableWeight: number): number =>
  Math.max(31_400, Math.ceil(billableWeight) * 570);

/** UPS Extended Area: max(34,200, billableWeight * 640) */
export const calculateUpsExtendedAreaFee = (billableWeight: number): number =>
  Math.max(34_200, Math.ceil(billableWeight) * 640);

/** UPS AHS 감지: weight>25kg OR longest>122cm OR 2nd>76cm OR wood/skid packing */
export const isUpsAdditionalHandling = (
  l: number, w: number, h: number, weight: number, packingType: PackingType
): boolean => {
  const sorted = [l, w, h].sort((a, b) => b - a);
  return (
    weight > 25 ||
    sorted[0] > 122 ||
    sorted[1] > 76 ||
    [PackingType.WOODEN_BOX, PackingType.SKID].includes(packingType)
  );
};
