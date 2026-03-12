import React from 'react';
import { CargoItem, PackingType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DHL_ADDON_RATES,
  isDhlOversizePiece,
  isDhlOverWeight,
  calculateRemoteAreaFee,
  calculateInsuranceFee,
} from '@/config/dhl_addons';
import type { AddonRate } from '@/api/addonRateApi';
import { AlertTriangle, Package, Shield } from 'lucide-react';

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
  perKgRate: number | null;
  ratePercent: number | null;
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
      perKgRate: r.perKgRate,
      ratePercent: r.ratePercent,
      minAmount: r.minAmount,
      detectRules: r.detectRules,
    }));
  }
  // Hardcoded fallback
  return DHL_ADDON_RATES.map(r => ({
    code: r.code,
    nameKo: r.nameKo,
    nameEn: r.nameEn,
    amount: r.amount,
    chargeType: r.chargeType,
    unit: r.unit,
    fscApplicable: r.fscApplicable,
    autoDetect: r.autoDetect ?? false,
    selectable: r.selectable,
    perKgRate: r.code === 'RMT' ? 750 : null,
    ratePercent: r.code === 'INS' ? 1.0 : null,
    minAmount: r.code === 'RMT' ? 35000 : r.code === 'INS' ? 17000 : null,
    detectRules: r.code === 'OSP' ? { max_longest: 100, max_second: 80 } as Record<string, number | string[]>
      : r.code === 'OWT' ? { weight_threshold: 70 } as Record<string, number | string[]> : null,
  }));
}

interface Props {
  selectedAddOns: string[];
  onAddOnsChange: (codes: string[]) => void;
  declaredValue?: number;
  onDeclaredValueChange: (val: number | undefined) => void;
  items: CargoItem[];
  packingType: PackingType;
  billableWeight: number;
  fscPercent: number;
  isMobileView: boolean;
  dbRates?: AddonRate[];
}

export const DhlAddOnPanel: React.FC<Props> = ({
  selectedAddOns,
  onAddOnsChange,
  declaredValue,
  onDeclaredValueChange,
  items,
  packingType,
  billableWeight,
  fscPercent,
  isMobileView,
  dbRates,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const rates = React.useMemo(() => normalizeRates(dbRates), [dbRates]);

  // Auto-detect OSP and OWT from cargo
  const autoDetected = React.useMemo(() => {
    const ospRate = rates.find(r => r.code === 'OSP');
    const owtRate = rates.find(r => r.code === 'OWT');
    const detected: { osp: number; owt: number } = { osp: 0, owt: 0 };

    items.forEach((item) => {
      let l = item.length;
      let w = item.width;
      let h = item.height;
      let weight = item.weight;

      if (packingType !== PackingType.NONE) {
        l += 10; w += 10; h += 15;
        weight = weight * 1.1 + 10;
      }

      // OSP detection (use DB rules or hardcoded)
      if (ospRate?.autoDetect) {
        const rules = ospRate.detectRules;
        const maxLongest = (rules?.max_longest as number) ?? 100;
        const maxSecond = (rules?.max_second as number) ?? 80;
        const sorted = [l, w, h].sort((a, b) => b - a);
        if (sorted[0] > maxLongest || sorted[1] > maxSecond) detected.osp += item.quantity;
      } else if (isDhlOversizePiece(l, w, h)) {
        detected.osp += item.quantity;
      }

      // OWT detection
      if (owtRate?.autoDetect) {
        const threshold = (owtRate.detectRules?.weight_threshold as number) ?? 70;
        if (weight > threshold) detected.owt += item.quantity;
      } else if (isDhlOverWeight(weight)) {
        detected.owt += item.quantity;
      }
    });
    return detected;
  }, [items, packingType, rates]);

  const toggleAddOn = (code: string) => {
    if (selectedAddOns.includes(code)) {
      onAddOnsChange(selectedAddOns.filter((c) => c !== code));
    } else {
      onAddOnsChange([...selectedAddOns, code]);
    }
  };

  const selectableAddOns = rates.filter((a) => a.selectable);
  const fscRate = (fscPercent || 0) / 100;

  // Calculate fee for calculated types using DB params
  const calcFee = (rate: NormalizedRate, bw: number, dv: number): number => {
    if (rate.chargeType === 'calculated') {
      if (rate.code === 'RMT' || rate.perKgRate) {
        const pkr = rate.perKgRate ?? 750;
        const min = rate.minAmount ?? rate.amount;
        return Math.max(min, Math.ceil(bw) * pkr);
      }
      if (rate.code === 'INS' || rate.ratePercent) {
        const pct = rate.ratePercent ?? 1.0;
        const min = rate.minAmount ?? rate.amount;
        return Math.max(dv * pct / 100, min);
      }
    }
    return rate.amount;
  };

  const getDisplayAmount = (code: string, rate: NormalizedRate): string => {
    if (code === 'RMT') return `${calcFee(rate, billableWeight, 0).toLocaleString()}`;
    if (code === 'INS') {
      if (!declaredValue || declaredValue <= 0) return `min ${(rate.minAmount ?? 17000).toLocaleString()}`;
      return `${calcFee(rate, 0, declaredValue).toLocaleString()}`;
    }
    if (code === 'IRR') {
      const totalPieces = items.reduce((s, i) => s + i.quantity, 0);
      return `${(rate.amount * totalPieces).toLocaleString()} (${totalPieces}pcs)`;
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
        amount = calcFee(addon, billableWeight, declaredValue || 0);
      } else if (code === 'IRR') {
        const totalPieces = items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalPieces;
      }

      const fsc = addon.fscApplicable ? amount * fscRate : 0;
      total += amount + fsc;
    });

    // Auto-detected
    if (autoDetected.osp > 0) {
      const ospRate = rates.find((a) => a.code === 'OSP');
      if (ospRate) {
        const amt = ospRate.amount * autoDetected.osp;
        total += amt + (ospRate.fscApplicable ? amt * fscRate : 0);
      }
    }
    if (autoDetected.owt > 0) {
      const owtRate = rates.find((a) => a.code === 'OWT');
      if (owtRate) {
        const amt = owtRate.amount * autoDetected.owt;
        total += amt + (owtRate.fscApplicable ? amt * fscRate : 0);
      }
    }

    return total;
  }, [selectedAddOns, autoDetected, billableWeight, declaredValue, fscRate, items, rates]);

  return (
    <div className="col-span-full">
      <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span className={`font-semibold text-yellow-700 dark:text-yellow-300 ${isMobileView ? 'text-base' : 'text-sm'}`}>
            DHL {isEn ? 'Add-on Services' : '부가서비스'}
          </span>
          {dbRates && dbRates.length > 0 && (
            <span className="text-[9px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">DB</span>
          )}
          {totalSelected > 0 && (
            <span className="ml-auto text-xs font-bold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-full">
              +{totalSelected.toLocaleString()} KRW
            </span>
          )}
        </div>

        {/* Auto-detected warnings */}
        {(autoDetected.osp > 0 || autoDetected.owt > 0) && (
          <div className="mb-3 space-y-1">
            {autoDetected.osp > 0 && (() => {
              const ospRate = rates.find(r => r.code === 'OSP');
              return (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <b>Oversize Piece (OSP)</b> {isEn ? 'auto-detected' : '자동 감지'}: {autoDetected.osp}{isEn ? ' pcs' : '개'}
                    {' '}— {((ospRate?.amount ?? 30_000) * autoDetected.osp).toLocaleString()} KRW (+FSC)
                  </span>
                </div>
              );
            })()}
            {autoDetected.owt > 0 && (() => {
              const owtRate = rates.find(r => r.code === 'OWT');
              return (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <b>Over Weight (&gt;70kg)</b> {isEn ? 'auto-detected' : '자동 감지'}: {autoDetected.owt}{isEn ? ' cartons' : '카톤'}
                    {' '}— {((owtRate?.amount ?? 150_000) * autoDetected.owt).toLocaleString()} KRW (+FSC)
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
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleAddOn(addon.code)}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 w-3.5 h-3.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-medium truncate ${isSelected ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-700 dark:text-gray-300'}`}>
                      {isEn ? addon.nameEn : addon.nameKo}
                    </span>
                    <span className={`shrink-0 tabular-nums ${isSelected ? 'text-yellow-700 dark:text-yellow-300 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                      {getDisplayAmount(addon.code, addon)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      /{isEn ? addon.unit : addon.unit === 'shipment' ? '발송건' : addon.unit === 'piece' ? 'piece' : '카톤'}
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

        {/* Insurance declared value input */}
        {selectedAddOns.includes('INS') && (
          <div className="mt-2 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {isEn ? 'Declared Value' : '물품 신고가'}:
            </label>
            <input
              type="number"
              value={declaredValue ?? ''}
              onChange={(e) => onDeclaredValueChange(e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="KRW"
              className="flex-1 text-xs border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 p-0 tabular-nums"
              inputMode="numeric"
            />
            {declaredValue && declaredValue > 0 && (() => {
              const insRate = rates.find(r => r.code === 'INS');
              return (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                  = {calcFee(insRate!, 0, declaredValue).toLocaleString()} KRW
                </span>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
