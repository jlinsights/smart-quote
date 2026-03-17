import React, { useState, useEffect, useRef } from 'react';
import { QuoteInput, PackingType, Incoterm } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOUL_PICKUP_ZONES } from '@/config/options';
import { inputStyles } from './input-styles';
import { SurchargePanel } from './SurchargePanel';
import { DhlAddOnPanel } from './DhlAddOnPanel';
import { UpsAddOnPanel } from './UpsAddOnPanel';
import { useSurcharges } from '@/features/dashboard/hooks/useSurcharges';
import { useAddonRates } from '@/features/dashboard/hooks/useAddonRates';
import { UI_TEXT } from '@/config/text';
import { HelpCircle, X, Package, Box, Layers, Wind } from 'lucide-react';
import { PACKING_MATERIAL_BASE_COST, PACKING_LABOR_UNIT_COST, FUMIGATION_FEE } from '@/config/rates';
import { PACKING_WEIGHT_BUFFER, PACKING_WEIGHT_ADDITION } from '@/config/business-rules';

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  isMobileView: boolean;
  intlBase?: number; // base carrier rate for rate-based surcharge calculation
  billableWeight?: number; // for DHL add-on fee calculations
}

export const ServiceSection: React.FC<Props> = ({ input, onFieldChange, isMobileView, intlBase = 0, billableWeight = 0 }) => {
  const { inputClass, labelClass, cardClass, sectionTitleClass, twoColGrid } = inputStyles;
  const ic = inputClass(isMobileView);
  const lc = labelClass(isMobileView);
  const grid = twoColGrid(isMobileView);
  const { t, language } = useLanguage();
  const isEn = language === 'en';

  const carrier = input.overseasCarrier || 'UPS';
  const { surcharges, loading: scLoading, error: scError, lastUpdated: scUpdated, calculateApplied, totalAmount, retry: scRetry } = useSurcharges(carrier, input.destinationCountry);
  const appliedSurcharges = calculateApplied(intlBase);
  const systemTotal = totalAmount(intlBase);

  // DB-driven add-on rates (fallback to hardcoded in panels if API fails)
  const { rates: dbAddonRates } = useAddonRates(carrier as 'DHL' | 'UPS');

  // Sync resolved surcharges into QuoteInput for calculateQuote()
  const prevSurchargesRef = useRef<string>('');
  useEffect(() => {
    const mapped = surcharges.map(s => ({
      code: s.code,
      name: s.name,
      nameKo: s.name_ko,
      chargeType: s.charge_type,
      amount: s.amount,
      sourceUrl: s.source_url,
    }));
    const key = JSON.stringify(mapped);
    if (key !== prevSurchargesRef.current) {
      prevSurchargesRef.current = key;
      onFieldChange('resolvedSurcharges', mapped.length > 0 ? mapped : undefined);
    }
  }, [surcharges, onFieldChange]);

  // Sync resolved addon rates into QuoteInput for calculateQuote()
  const prevAddonRatesRef = useRef<string>('');
  useEffect(() => {
    if (dbAddonRates.length === 0) return;
    const mapped = dbAddonRates.map(r => ({
      code: r.code,
      carrier: r.carrier,
      nameEn: r.nameEn,
      nameKo: r.nameKo,
      chargeType: r.chargeType,
      unit: r.unit,
      amount: r.amount,
      perKgRate: r.perKgRate,
      ratePercent: r.ratePercent,
      minAmount: r.minAmount,
      fscApplicable: r.fscApplicable,
      autoDetect: r.autoDetect,
      selectable: r.selectable,
      condition: r.condition,
      detectRules: r.detectRules,
    }));
    const key = JSON.stringify(mapped);
    if (key !== prevAddonRatesRef.current) {
      prevAddonRatesRef.current = key;
      onFieldChange('resolvedAddonRates', mapped);
    }
  }, [dbAddonRates, onFieldChange]);

  return (
    <div className={cardClass}>
      <h3 className={sectionTitleClass}>{t('calc.section.service')}</h3>
      <div className={grid}>
        <div>
          <label className={lc}>Special Packing</label>
          <div className="relative">
              <select
              value={input.packingType}
              onChange={(e) => onFieldChange('packingType', e.target.value as PackingType)}
              className={`${ic} appearance-none`}
              >
              {Object.values(PackingType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
          </div>
          <PackingTypeInfo packingType={input.packingType} items={input.items} />
        </div>

        <PackingCostOverrideField input={input} onFieldChange={onFieldChange} lc={lc} ic={ic} />

        <SurchargePanel
          carrier={carrier}
          surcharges={surcharges}
          appliedSurcharges={appliedSurcharges}
          systemTotal={systemTotal}
          manualSurgeCost={input.manualSurgeCost}
          onManualSurgeChange={(val) => onFieldChange('manualSurgeCost', val)}
          loading={scLoading}
          error={scError}
          lastUpdated={scUpdated}
          onRetry={scRetry}
          isMobileView={isMobileView}
        />

        {carrier === 'DHL' && (
          <DhlAddOnPanel
            selectedAddOns={input.dhlAddOns || []}
            onAddOnsChange={(codes) => onFieldChange('dhlAddOns', codes)}
            declaredValue={input.dhlDeclaredValue}
            onDeclaredValueChange={(val) => onFieldChange('dhlDeclaredValue', val)}
            items={input.items}
            packingType={input.packingType}
            billableWeight={billableWeight}
            fscPercent={input.fscPercent}
            isMobileView={isMobileView}
            dbRates={dbAddonRates.length > 0 ? dbAddonRates : undefined}
          />
        )}

        {carrier === 'UPS' && (
          <UpsAddOnPanel
            selectedAddOns={input.upsAddOns || []}
            onAddOnsChange={(codes) => onFieldChange('upsAddOns', codes)}
            items={input.items}
            packingType={input.packingType}
            billableWeight={billableWeight}
            fscPercent={input.fscPercent}
            isMobileView={isMobileView}
            incoterm={input.incoterm}
            dbRates={dbAddonRates.length > 0 ? dbAddonRates : undefined}
            destinationCountry={input.destinationCountry}
            destinationZip={input.destinationZip}
          />
        )}

        <div>
          <label className={lc}>{t('calc.service.pickup.label')}</label>
          <div className="relative">
            <select
              value={input.pickupInSeoulCost ?? ''}
              onChange={(e) => onFieldChange('pickupInSeoulCost', e.target.value === '' ? undefined : Number(e.target.value))}
              className={`${ic} appearance-none`}
            >
              <option value="">— {t('calc.service.pickup.none')} —</option>
              {SEOUL_PICKUP_ZONES.map((zone, i) => (
                <option key={i} value={zone.cost}>
                  {isEn
                    ? `${zone.districtsEn.join(', ')} — ${zone.cost.toLocaleString()} KRW`
                    : `${zone.districts.join(', ')} — ${zone.cost.toLocaleString()}원`
                  }
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            {t('calc.service.pickup.hint')}
          </p>
          {/* 혼적 입고 기준 */}
          <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
            <p className="font-semibold mb-0.5">{t('calc.service.pickup.guide.title')}</p>
            <p>• <span className="font-medium">{t('calc.service.pickup.same.label')}</span>: {t('calc.service.pickup.guide.same')}</p>
            <p>• <span className="font-medium">{t('calc.service.pickup.next.label')}</span>: {t('calc.service.pickup.guide.next')}</p>
          </div>
          {/* 서울 구별 픽업 비용 */}
          <div className="mt-2 rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden text-[10px]">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <th className="text-left px-2 py-1 font-semibold">{t('calc.service.pickup.table.district')}</th>
                  <th className="text-right px-2 py-1 font-semibold">{t('calc.service.pickup.table.cost')}</th>
                </tr>
              </thead>
              <tbody>
                {SEOUL_PICKUP_ZONES.map((zone, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-600 odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700">
                    <td className="px-2 py-1 text-gray-700 dark:text-gray-300">
                      {isEn ? zone.districtsEn.join(', ') : zone.districts.join(', ')}
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-gray-800 dark:text-gray-200">
                      {isEn ? `${zone.cost.toLocaleString()} KRW` : `${zone.cost.toLocaleString()}원`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        {input.incoterm === Incoterm.DDP && (
          <div>
             <label className={lc}>Estimated Duty & Tax (KRW)</label>
             <input
              type="number"
              step="any"
              value={input.dutyTaxEstimate}
              onChange={(e) => onFieldChange('dutyTaxEstimate', Number(e.target.value))}
              className={ic}
              inputMode="decimal"
              autoComplete="off"
             />
          </div>
        )}
      </div>
    </div>
  );
};

/** Packing & Docs Cost Override with expandable calculation basis info */
const PackingCostOverrideField: React.FC<{
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  lc: string;
  ic: string;
}> = ({ input, onFieldChange, lc, ic }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div>
      <label className={lc}>Packing & Docs Cost Override (KRW)</label>
      <div className="relative">
        <input
          type="number"
          step="any"
          value={input.manualPackingCost ?? ''}
          onChange={(e) => onFieldChange('manualPackingCost', e.target.value === '' ? undefined : Number(e.target.value))}
          className={ic}
          placeholder="Auto-calculated if empty"
          inputMode="decimal"
          autoComplete="off"
        />
      </div>
      <div className="mt-1.5 flex items-start gap-1">
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-jways-500 transition-colors"
        >
          <HelpCircle className="w-3 h-3 flex-shrink-0" />
          <span>참고: 아래 항목들을 합산하여 자유롭게 입력할 수 있습니다. (예시 금액이며 필수 아님)</span>
        </button>
      </div>
      {showInfo && (
        <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-600 relative animate-in fade-in slide-in-from-top-1 duration-200">
          <button
            type="button"
            onClick={() => setShowInfo(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="font-bold mb-2 text-jways-700 dark:text-jways-300">{UI_TEXT.COST_BREAKDOWN.TITLE}</p>
          <ul className="space-y-1 list-disc pl-4 marker:text-gray-300">
            <li>{UI_TEXT.COST_BREAKDOWN.MATERIAL}</li>
            <li>{UI_TEXT.COST_BREAKDOWN.LABOR}</li>
            <li>{UI_TEXT.COST_BREAKDOWN.FUMIGATION}</li>
            <li>{UI_TEXT.COST_BREAKDOWN.HANDLING}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

/** Packing type info panel — shows pricing impact per selected packing option */
import { CargoItem } from '@/types';

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
    descEn: 'Moisture-proof vacuum + wooden box. Recommended for precision equipment. 1.5× labor cost.',
  },
};

const PackingTypeInfo: React.FC<{ packingType: PackingType; items: CargoItem[] }> = ({ packingType, items }) => {
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
      const l = item.length + 10;
      const w = item.width + 10;
      const h = item.height + 15;
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
              ? `📐 치수 변동: 각 박스 +10cm(L) +10cm(W) +15cm(H)`
              : `📐 Dimension change: +10cm(L) +10cm(W) +15cm(H) per box`}</p>
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
