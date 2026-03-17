import React from 'react';
import { PackingType, CargoItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, Box, Layers, Wind } from 'lucide-react';
import { PACKING_MATERIAL_BASE_COST, PACKING_LABOR_UNIT_COST, FUMIGATION_FEE } from '@/config/rates';
import { PACKING_WEIGHT_BUFFER, PACKING_WEIGHT_ADDITION } from '@/config/business-rules';
import { PACKING_DIM_ADDITIONS } from '@/lib/packing-utils';

const PACKING_TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  labelKo: string;
  labelEn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  descKo: string;
  descEn: string;
}> = {
  [PackingType.NONE]: {
    icon: Package,
    labelKo: '포장 없음',
    labelEn: 'No Packing',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-700/30',
    borderColor: 'border-gray-200 dark:border-gray-600',
    descKo: '추가 포장 없이 원래 상태로 발송합니다. 포장 비용이 발생하지 않으며 치수/중량 변동이 없습니다.',
    descEn: 'Ship as-is without additional packing. No packing cost, no dimension/weight change.',
  },
  [PackingType.WOODEN_BOX]: {
    icon: Box,
    labelKo: '목재 박스 포장',
    labelEn: 'Wooden Box Packing',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/15',
    borderColor: 'border-amber-200 dark:border-amber-800',
    descKo: '수출용 표준 목재 박스 포장. 목재 훈증(ISPM-15) 포함.',
    descEn: 'Standard export wooden box. Includes fumigation (ISPM-15).',
  },
  [PackingType.SKID]: {
    icon: Layers,
    labelKo: '스키드 포장',
    labelEn: 'Skid Packing',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/15',
    borderColor: 'border-blue-200 dark:border-blue-800',
    descKo: '목재 스키드(팔레트) 위에 고정 포장. 목재 훈증(ISPM-15) 포함.',
    descEn: 'Fixed on wooden skid/pallet. Includes fumigation (ISPM-15).',
  },
  [PackingType.VACUUM]: {
    icon: Wind,
    labelKo: '진공 포장',
    labelEn: 'Vacuum Packing',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/15',
    borderColor: 'border-purple-200 dark:border-purple-800',
    descKo: '방습 진공 포장 + 목재 박스. 정밀 장비/전자부품에 권장. 인건비 1.5배 적용.',
    descEn: 'Moisture-proof vacuum + wooden box. Recommended for precision equipment. 1.5x labor cost.',
  },
};

export const PackingTypeInfo: React.FC<{ packingType: PackingType; items: CargoItem[] }> = ({ packingType, items }) => {
  const { language } = useLanguage();
  const isKo = language === 'ko';
  const config = PACKING_TYPE_CONFIG[packingType];
  const Icon = config.icon;
  const isNone = packingType === PackingType.NONE;
  const isVacuum = packingType === PackingType.VACUUM;

  // Calculate estimated packing costs based on current items
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  let estMaterial = 0;
  let estLabor = 0;
  if (!isNone) {
    items.forEach((item) => {
      const l = item.length + PACKING_DIM_ADDITIONS.length;
      const w = item.width + PACKING_DIM_ADDITIONS.width;
      const h = item.height + PACKING_DIM_ADDITIONS.height;
      const surfaceM2 = (2 * (l * w + l * h + w * h)) / 10000;
      estMaterial += surfaceM2 * PACKING_MATERIAL_BASE_COST * item.quantity;
      estLabor += PACKING_LABOR_UNIT_COST * item.quantity;
    });
    if (isVacuum) estLabor *= 1.5;
  }
  const estFumigation = isNone ? 0 : FUMIGATION_FEE;
  const estTotal = estMaterial + estLabor + estFumigation;
  const laborUnit = isVacuum ? PACKING_LABOR_UNIT_COST * 1.5 : PACKING_LABOR_UNIT_COST;

  return (
    <div className={`mt-2 rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden transition-all`}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2">
        <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
        <span className={`text-xs font-bold ${config.color}`}>
          {isKo ? config.labelKo : config.labelEn}
        </span>
      </div>

      {/* Description */}
      <div className="px-3 pb-2 text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">
        {isKo ? config.descKo : config.descEn}
      </div>

      {/* Cost breakdown (only for packing options) */}
      {!isNone && (
        <div className="border-t border-gray-200/50 dark:border-gray-600/50">
          <table className="w-full text-[10px]">
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-600/30">
                <td className="px-3 py-1 text-gray-500 dark:text-gray-400">
                  {isKo ? '자재비' : 'Material'}
                </td>
                <td className="px-3 py-1 text-right text-gray-500 dark:text-gray-400">
                  {isKo ? `표면적(m²) × ${PACKING_MATERIAL_BASE_COST.toLocaleString()}원` : `Surface(m²) × ₩${PACKING_MATERIAL_BASE_COST.toLocaleString()}`}
                </td>
                <td className="px-3 py-1 text-right font-medium text-gray-700 dark:text-gray-300 w-24">
                  {totalQty > 0 ? `₩${Math.round(estMaterial).toLocaleString()}` : '—'}
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-600/30">
                <td className="px-3 py-1 text-gray-500 dark:text-gray-400">
                  {isKo ? '인건비' : 'Labor'}{isVacuum ? (isKo ? ' (×1.5)' : ' (×1.5)') : ''}
                </td>
                <td className="px-3 py-1 text-right text-gray-500 dark:text-gray-400">
                  {isKo ? `박스당 ${laborUnit.toLocaleString()}원` : `₩${laborUnit.toLocaleString()}/box`}
                </td>
                <td className="px-3 py-1 text-right font-medium text-gray-700 dark:text-gray-300 w-24">
                  {totalQty > 0 ? `₩${Math.round(estLabor).toLocaleString()}` : '—'}
                </td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-600/30">
                <td className="px-3 py-1 text-gray-500 dark:text-gray-400">
                  {isKo ? '훈증비' : 'Fumigation'}
                </td>
                <td className="px-3 py-1 text-right text-gray-500 dark:text-gray-400">
                  {isKo ? '고정' : 'Fixed'}
                </td>
                <td className="px-3 py-1 text-right font-medium text-gray-700 dark:text-gray-300 w-24">
                  ₩{estFumigation.toLocaleString()}
                </td>
              </tr>
              {totalQty > 0 && (
                <tr className={`${config.bgColor} font-bold`}>
                  <td className={`px-3 py-1.5 ${config.color}`} colSpan={2}>
                    {isKo ? '예상 포장비 합계' : 'Est. Packing Total'}
                  </td>
                  <td className={`px-3 py-1.5 text-right ${config.color} w-24`}>
                    ₩{Math.round(estTotal).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Dimension/Weight impact */}
          <div className="px-3 py-2 text-[9px] text-gray-400 dark:text-gray-500 space-y-0.5 border-t border-gray-200/50 dark:border-gray-600/50">
            <p>{isKo
              ? `📐 치수 변동: 각 박스 +${PACKING_DIM_ADDITIONS.length}cm(L) +${PACKING_DIM_ADDITIONS.width}cm(W) +${PACKING_DIM_ADDITIONS.height}cm(H)`
              : `📐 Dimension change: +${PACKING_DIM_ADDITIONS.length}cm(L) +${PACKING_DIM_ADDITIONS.width}cm(W) +${PACKING_DIM_ADDITIONS.height}cm(H) per box`}</p>
            <p>{isKo
              ? `⚖️ 중량 변동: 실중량 ×${PACKING_WEIGHT_BUFFER} + ${PACKING_WEIGHT_ADDITION}kg (포장재 무게 반영)`
              : `⚖️ Weight change: actual ×${PACKING_WEIGHT_BUFFER} + ${PACKING_WEIGHT_ADDITION}kg (packing material weight)`}</p>
            <p>{isKo
              ? '⚠️ UPS 비규격품(AHS) 자동 감지: 포장 후 25kg 초과 또는 L>122cm, W>76cm 시 추가요금'
              : '⚠️ UPS AHS auto-detect: surcharge if packed weight >25kg or L>122cm, W>76cm'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
