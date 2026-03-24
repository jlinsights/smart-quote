import React, { useState, useCallback } from 'react';
import { QuoteInput, PackingType, Incoterm } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOUL_PICKUP_ZONES } from '@/config/options';
import { inputStyles } from './input-styles';
import { SurchargePanel } from './SurchargePanel';
import { DhlAddOnPanel } from './DhlAddOnPanel';
import { UpsAddOnPanel } from './UpsAddOnPanel';
import { PackingTypeInfo } from './PackingTypeInfo';
import { useSurcharges } from '@/features/dashboard/hooks/useSurcharges';
import { useAddonRates } from '@/features/dashboard/hooks/useAddonRates';
import { useSyncToInput } from '@/features/quote/hooks/useSyncToInput';
import { UI_TEXT } from '@/config/text';
import { HelpCircle, X } from 'lucide-react';

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  isMobileView: boolean;
  intlBase?: number; // base carrier rate for rate-based surcharge calculation
  billableWeight?: number; // for DHL add-on fee calculations
  hideMargin?: boolean;
}

export const ServiceSection: React.FC<Props> = ({ input, onFieldChange, isMobileView, intlBase = 0, billableWeight = 0, hideMargin }) => {
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

  // Generic field setter (cast to bypass generic constraint for useSyncToInput)
  const setField = onFieldChange as (key: string, value: unknown) => void;

  // Sync resolved surcharges into QuoteInput for calculateQuote()
  const transformSurcharges = useCallback(
    (src: typeof surcharges) => {
      const mapped = src.map(s => ({
        code: s.code,
        name: s.name,
        nameKo: s.name_ko,
        chargeType: s.charge_type,
        amount: s.amount,
        sourceUrl: s.source_url,
      }));
      return mapped.length > 0 ? mapped : undefined;
    },
    [],
  );
  useSyncToInput(surcharges, 'resolvedSurcharges', setField, { transform: transformSurcharges });

  // Sync resolved addon rates into QuoteInput for calculateQuote()
  const transformAddonRates = useCallback(
    (src: typeof dbAddonRates) =>
      src.map(r => ({
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
      })),
    [],
  );
  useSyncToInput(dbAddonRates, 'resolvedAddonRates', setField, {
    transform: transformAddonRates,
    skip: dbAddonRates.length === 0,
  });

  return (
    <div className={cardClass}>
      <h3 className={sectionTitleClass}>{t('calc.section.service')}</h3>
      <div className={grid}>
        {!hideMargin && (
          <>
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
              <PackingTypeInfo packingType={input.packingType} items={input.items} isMobileView={isMobileView} />
            </div>

            <PackingCostOverrideField input={input} onFieldChange={onFieldChange} lc={lc} ic={ic} />
          </>
        )}

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
