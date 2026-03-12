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
import { AlertTriangle, Package, Shield } from 'lucide-react';

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
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  // Auto-detect OSP and OWT from cargo
  const autoDetected = React.useMemo(() => {
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

      if (isDhlOversizePiece(l, w, h)) detected.osp += item.quantity;
      if (isDhlOverWeight(weight)) detected.owt += item.quantity;
    });
    return detected;
  }, [items, packingType]);

  const toggleAddOn = (code: string) => {
    if (selectedAddOns.includes(code)) {
      onAddOnsChange(selectedAddOns.filter((c) => c !== code));
    } else {
      onAddOnsChange([...selectedAddOns, code]);
    }
  };

  const selectableAddOns = DHL_ADDON_RATES.filter((a) => a.selectable);
  const fscRate = (fscPercent || 0) / 100;

  // Calculate costs for display
  const getDisplayAmount = (code: string, baseAmount: number): string => {
    if (code === 'RMT') {
      const fee = calculateRemoteAreaFee(billableWeight);
      return `${fee.toLocaleString()}`;
    }
    if (code === 'INS') {
      if (!declaredValue || declaredValue <= 0) return `min 17,000`;
      const fee = calculateInsuranceFee(declaredValue);
      return `${fee.toLocaleString()}`;
    }
    if (code === 'IRR') {
      const totalPieces = items.reduce((s, i) => s + i.quantity, 0);
      return `${(baseAmount * totalPieces).toLocaleString()} (${totalPieces}pcs)`;
    }
    return baseAmount.toLocaleString();
  };

  const totalSelected = React.useMemo(() => {
    let total = 0;

    selectedAddOns.forEach((code) => {
      const addon = DHL_ADDON_RATES.find((a) => a.code === code);
      if (!addon) return;
      let amount = addon.amount;

      if (code === 'RMT') amount = calculateRemoteAreaFee(billableWeight);
      if (code === 'INS') amount = calculateInsuranceFee(declaredValue || 0);
      if (code === 'IRR') {
        const totalPieces = items.reduce((s, i) => s + i.quantity, 0);
        amount = addon.amount * totalPieces;
      }

      const fsc = addon.fscApplicable ? amount * fscRate : 0;
      total += amount + fsc;
    });

    // Auto-detected
    if (autoDetected.osp > 0) {
      const ospRate = DHL_ADDON_RATES.find((a) => a.code === 'OSP')!;
      const amt = ospRate.amount * autoDetected.osp;
      total += amt + (ospRate.fscApplicable ? amt * fscRate : 0);
    }
    if (autoDetected.owt > 0) {
      const owtRate = DHL_ADDON_RATES.find((a) => a.code === 'OWT')!;
      const amt = owtRate.amount * autoDetected.owt;
      total += amt + (owtRate.fscApplicable ? amt * fscRate : 0);
    }

    return total;
  }, [selectedAddOns, autoDetected, billableWeight, declaredValue, fscRate, items]);

  return (
    <div className="col-span-full">
      <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span className={`font-semibold text-yellow-700 dark:text-yellow-300 ${isMobileView ? 'text-base' : 'text-sm'}`}>
            DHL {isEn ? 'Add-on Services' : '부가서비스'} (2026)
          </span>
          {totalSelected > 0 && (
            <span className="ml-auto text-xs font-bold text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-full">
              +{totalSelected.toLocaleString()} KRW
            </span>
          )}
        </div>

        {/* Auto-detected warnings */}
        {(autoDetected.osp > 0 || autoDetected.owt > 0) && (
          <div className="mb-3 space-y-1">
            {autoDetected.osp > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <b>Oversize Piece (OSP)</b> {isEn ? 'auto-detected' : '자동 감지'}: {autoDetected.osp}{isEn ? ' pcs' : '개'}
                  {' '}— {(30_000 * autoDetected.osp).toLocaleString()} KRW (+FSC)
                </span>
              </div>
            )}
            {autoDetected.owt > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <b>Over Weight (&gt;70kg)</b> {isEn ? 'auto-detected' : '자동 감지'}: {autoDetected.owt}{isEn ? ' cartons' : '카톤'}
                  {' '}— {(150_000 * autoDetected.owt).toLocaleString()} KRW (+FSC)
                </span>
              </div>
            )}
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
                      {getDisplayAmount(addon.code, addon.amount)}
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
            {declaredValue && declaredValue > 0 && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                = {calculateInsuranceFee(declaredValue).toLocaleString()} KRW
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
