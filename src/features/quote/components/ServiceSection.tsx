import React from 'react';
import { QuoteInput, PackingType, Incoterm } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { SEOUL_PICKUP_ZONES } from '@/config/options';
import { inputStyles } from './input-styles';
import { SurchargePanel } from './SurchargePanel';
import { DhlAddOnPanel } from './DhlAddOnPanel';
import { UpsAddOnPanel } from './UpsAddOnPanel';
import { useSurcharges } from '@/features/dashboard/hooks/useSurcharges';

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
        </div>

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
          <p className="mt-1 text-[10px] text-gray-400">
              Enter cost to override auto-calculation of Material, Labor, Fumigation & Handling.
          </p>
        </div>

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
