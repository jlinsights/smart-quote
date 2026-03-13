import React from 'react';
import { CargoItem, PackingType, Incoterm } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  UPS_ADDON_RATES,
  isUpsAdditionalHandling,
} from '@/config/ups_addons';
import type { AddonRate } from '@/api/addonRateApi';
import { AlertTriangle, Package, Info } from 'lucide-react';

// Unified shape for both hardcoded and DB rates
interface NormalizedRate {
  code: string;
  nameKo: string;
  nameEn: string;
  amount: number;
  chargeType: string;
  unit: string;
  fscApplicable: boolean;
  autoDetect: boolean;
  selectable: boolean;
  condition: string | null;
  perKgRate: number | null;
  minAmount: number | null;
  detectRules: Record<string, number | string[]> | null;
}

function normalizeRates(dbRates?: AddonRate[]): NormalizedRate[] {
  if (dbRates && dbRates.length > 0) {
    return dbRates.map(r => ({
      code: r.code,
      nameKo: r.nameKo,
      nameEn: r.nameEn,
      amount: r.amount,
      chargeType: r.chargeType,
      unit: r.unit,
      fscApplicable: r.fscApplicable,
      autoDetect: r.autoDetect,
      selectable: r.selectable,
      condition: r.condition,
      perKgRate: r.perKgRate,
      minAmount: r.minAmount,
      detectRules: r.detectRules,
    }));
  }
  // Hardcoded fallback
  return UPS_ADDON_RATES.map(r => ({
    code: r.code,
    nameKo: r.nameKo,
    nameEn: r.nameEn,
    amount: r.amount,
    chargeType: r.chargeType,
    unit: r.unit,
    fscApplicable: r.fscApplicable,
    autoDetect: r.autoDetect ?? false,
    selectable: r.selectable,
    condition: r.condition ?? null,
    perKgRate: r.code === 'RMT' ? 570 : r.code === 'EXT' ? 640 : null,
    minAmount: r.code === 'RMT' ? 31400 : r.code === 'EXT' ? 34200 : null,
    detectRules: r.code === 'AHS' ? { weight_threshold: 25, max_longest: 122, max_second: 76, packing_types: ['WOODEN_BOX', 'SKID'] } : null,
  }));
}

interface Props {
  selectedAddOns: string[];
  onAddOnsChange: (codes: string[]) => void;
  items: CargoItem[];
  packingType: PackingType;
  billableWeight: number;
  fscPercent: number;
  isMobileView: boolean;
  incoterm: string;
  dbRates?: AddonRate[];
}

export const UpsAddOnPanel: React.FC<Props> = ({
  selectedAddOns,
  onAddOnsChange,
  items,
  packingType,
  billableWeight,
  fscPercent,
  isMobileView,
  incoterm,
  dbRates,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const rates = React.useMemo(() => normalizeRates(dbRates), [dbRates]);

  // Auto-detect AHS from cargo
  const ahsCount = React.useMemo(() => {
    const ahsRate = rates.find(r => r.code === 'AHS');
    let count = 0;
    items.forEach((item) => {
      let l = item.length;
      let w = item.width;
      let h = item.height;
      let weight = item.weight;

      if (packingType !== PackingType.NONE) {
        l += 10; w += 10; h += 15;
        weight = weight * 1.1 + 10;
      }

      if (ahsRate?.autoDetect && ahsRate.detectRules) {
        const wt = (ahsRate.detectRules.weight_threshold as number) ?? 25;
        const ml = (ahsRate.detectRules.max_longest as number) ?? 122;
        const ms = (ahsRate.detectRules.max_second as number) ?? 76;
        const pt = (ahsRate.detectRules.packing_types as string[]) ?? ['WOODEN_BOX', 'SKID'];
        const sorted = [l, w, h].sort((a, b) => b - a);
        if (weight > wt || sorted[0] > ml || sorted[1] > ms || pt.includes(packingType)) {
          count += item.quantity;
        }
      } else if (isUpsAdditionalHandling(l, w, h, weight, packingType)) {
        count += item.quantity;
      }
    });
    return count;
  }, [items, packingType, rates]);

  const isDDP = incoterm === Incoterm.DDP;

  const toggleAddOn = (code: string) => {
    if (selectedAddOns.includes(code)) {
      onAddOnsChange(selectedAddOns.filter((c) => c !== code));
    } else {
      onAddOnsChange([...selectedAddOns, code]);
    }
  };

  const selectableAddOns = rates.filter((a) => a.selectable);
  const fscRate = (fscPercent || 0) / 100;

  const calcFee = (rate: NormalizedRate, bw: number): number => {
    if (rate.chargeType === 'calculated' && rate.perKgRate) {
      const min = rate.minAmount ?? rate.amount;
      return Math.max(min, Math.ceil(bw) * rate.perKgRate);
    }
    return rate.amount;
  };

  const getDisplayAmount = (code: string, rate: NormalizedRate): string => {
    if (code === 'RMT' || code === 'EXT') return `${calcFee(rate, billableWeight).toLocaleString()}`;
    if (code === 'ADC') {
      const totalCartons = items.reduce((s, i) => s + i.quantity, 0);
      return `${(rate.amount * totalCartons).toLocaleString()} (${totalCartons}${isEn ? 'pcs' : '카톤'})`;
    }
    return rate.amount.toLocaleString();
  };

  const totalSelected = React.useMemo(() => {
    let total = 0;

    selectedAddOns.forEach((code) => {
      const addon = rates.find((a) => a.code === code);
      if (!addon) return;
      let amount = addon.amount;

      if (addon.chargeType === 'calculated') {
        amount = calcFee(addon, billableWeight);
      } else if (code === 'ADC') {
        const totalCartons = items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalCartons;
      }

      const fsc = addon.fscApplicable ? amount * fscRate : 0;
      total += amount + fsc;
    });

    // Auto-detected AHS
    if (ahsCount > 0) {
      const ahsRate = rates.find((a) => a.code === 'AHS');
      if (ahsRate) {
        const amt = ahsRate.amount * ahsCount;
        total += amt + (ahsRate.fscApplicable ? amt * fscRate : 0);
      }
    }

    // Auto DDP fee
    if (isDDP) {
      const ddpRate = rates.find((a) => a.code === 'DDP');
      if (ddpRate) total += ddpRate.amount;
    }

    return total;
  }, [selectedAddOns, ahsCount, isDDP, billableWeight, fscRate, items, rates]);

  return (
    <div className="col-span-full">
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className={`font-semibold text-blue-700 dark:text-blue-300 ${isMobileView ? 'text-base' : 'text-sm'}`}>
            UPS {isEn ? 'Add-on Services' : '부가서비스'}
          </span>
          {dbRates && dbRates.length > 0 && (
            <span className="text-[9px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">DB</span>
          )}
          {totalSelected > 0 && (
            <span className="ml-auto text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
              +{totalSelected.toLocaleString()} KRW
            </span>
          )}
        </div>

        {/* Auto-detected warnings */}
        {(ahsCount > 0 || isDDP) && (
          <div className="mb-3 space-y-1">
            {ahsCount > 0 && (() => {
              const ahsRate = rates.find(r => r.code === 'AHS');
              return (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <b>Additional Handling (AHS)</b> {isEn ? 'auto-detected' : '자동 감지'}: {ahsCount}{isEn ? ' cartons' : '카톤'}
                    {' '}&mdash; {((ahsRate?.amount ?? 21_400) * ahsCount).toLocaleString()} KRW (+FSC)
                  </span>
                </div>
              );
            })()}
            {isDDP && (() => {
              const ddpRate = rates.find(r => r.code === 'DDP');
              return (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <b>DDP Service Fee</b> {isEn ? 'auto-applied' : '자동 적용'}: {(ddpRate?.amount ?? 28_500).toLocaleString()} KRW
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Selectable add-ons */}
        <div className={`grid ${isMobileView ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5`}>
          {selectableAddOns.map((addon) => {
            const isSelected = selectedAddOns.includes(addon.code);
            return (
              <label
                key={addon.code}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleAddOn(addon.code)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-medium truncate ${isSelected ? 'text-blue-800 dark:text-blue-200' : 'text-gray-700 dark:text-gray-300'}`}>
                      {isEn ? addon.nameEn : addon.nameKo}
                    </span>
                    <span className={`shrink-0 tabular-nums ${isSelected ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                      {getDisplayAmount(addon.code, addon)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      /{isEn ? addon.unit : addon.unit === 'shipment' ? '발송건' : '카톤'}
                    </span>
                    {addon.fscApplicable && (
                      <span className="text-[10px] text-orange-500 dark:text-orange-400 font-medium">+FSC</span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
