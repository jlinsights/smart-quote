import React from 'react';
import { QuoteInput } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { UPS_FSC_URL, DHL_FSC_URL } from '@/config/rates';
import { TrendingUp, ExternalLink, RefreshCw, Target } from 'lucide-react';
import { inputStyles } from './input-styles';
import { useExchangeRates } from '@/features/dashboard/hooks/useExchangeRates';
import { useFscRates } from '@/features/dashboard/hooks/useFscRates';
import type { ResolvedMargin } from '@/api/marginRuleApi';

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  isMobileView: boolean;
  effectiveMarginPercent?: number;
  hideMargin?: boolean;
  resolvedMargin?: ResolvedMargin | null;
}

export const FinancialSection: React.FC<Props> = ({ input, onFieldChange, isMobileView, hideMargin, resolvedMargin }) => {
  const { inputClass, labelClass, grayCardClass } = inputStyles;
  const ic = inputClass(isMobileView);
  const lc = labelClass(isMobileView);
  const { t, language } = useLanguage();
  const isKo = language === 'ko';
  const { data: exchangeRates, loading: ratesLoading } = useExchangeRates();
  const { data: fscRates, loading: fscLoading } = useFscRates();

  const liveUsdRate = exchangeRates.find((r) => r.currency === 'USD');

  const applyLiveRate = () => {
    if (liveUsdRate && liveUsdRate.rate > 0) {
      onFieldChange('exchangeRate', Math.round(liveUsdRate.rate * 100) / 100);
    }
  };

  const applyLiveFsc = () => {
    if (fscRates && fscRates.rates) {
      const carrier = input.overseasCarrier || 'UPS';
      const rate = fscRates.rates[carrier as 'UPS' | 'DHL']?.international;
      if (rate !== undefined) {
        onFieldChange('fscPercent', rate);
      }
    }
  };

  const financialGrid = `grid grid-cols-1 ${!isMobileView ? 'sm:grid-cols-3' : 'grid-cols-2'} gap-3`;

  return (
    <div className={grayCardClass}>
      <div className="flex items-center justify-between mb-4">
         <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center">
             <TrendingUp className="w-4 h-4 mr-2 text-jways-600 dark:text-jways-400" />
             {t('calc.section.financial')}
         </h3>
         <div className="flex items-center gap-3">
             <a
                 href={UPS_FSC_URL}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-[10px] sm:text-xs text-gray-500 hover:text-blue-600 flex items-center transition-colors"
                 title="Check Official UPS FSC"
             >
                 UPS FSC <ExternalLink className="w-3 h-3 ml-1" />
             </a>
             <a
                 href={DHL_FSC_URL}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-[10px] sm:text-xs text-gray-500 hover:text-yellow-600 flex items-center transition-colors"
                 title="Check Official DHL Fuel Surcharge"
             >
                 DHL FSC <ExternalLink className="w-3 h-3 ml-1" />
             </a>
         </div>
      </div>
      <div className={financialGrid}>
         <div>
             <label className={lc}>Ex. Rate (KRW/USD)</label>
             <div className="relative rounded-lg shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                 <span className="text-gray-500 sm:text-sm font-bold">&#8361;</span>
                 </div>
                 <input
                     type="number"
                     step="any"
                     min="1"
                     value={input.exchangeRate}
                     onChange={(e) => { const v = Number(e.target.value); onFieldChange('exchangeRate', isNaN(v) || v < 1 ? 1 : v); }}
                     className={`${ic} pl-8 pr-20`}
                     placeholder="1430"
                     inputMode="decimal"
                     autoComplete="off"
                 />
                 {liveUsdRate && (
                   <button
                     type="button"
                     onClick={applyLiveRate}
                     disabled={ratesLoading}
                     className="absolute inset-y-0 right-0 flex items-center gap-1 px-2 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                     title={`Apply live rate: ₩${liveUsdRate.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                   >
                     <RefreshCw className={`w-3 h-3 ${ratesLoading ? 'animate-spin' : ''}`} />
                     <span className="hidden sm:inline">LIVE</span>
                   </button>
                 )}
             </div>
             <p className="mt-1 text-[9px] text-gray-400 dark:text-gray-500">
               {t('calc.financial.exchangeHint')}
             </p>
         </div>
         <div>
             <label className={lc}>FSC %</label>
             <div className="relative rounded-lg shadow-sm">
                 <input
                     type="number"
                     step="0.01"
                     min="0"
                     value={input.fscPercent}
                     onChange={(e) => { const v = Number(e.target.value); onFieldChange('fscPercent', isNaN(v) || v < 0 ? 0 : v); }}
                     className={`${ic} pr-20`}
                     placeholder="30.25"
                     inputMode="decimal"
                     autoComplete="off"
                 />
                 <div className="pointer-events-none absolute inset-y-0 right-16 flex items-center">
                   <span className="text-gray-500 sm:text-sm font-bold">%</span>
                 </div>
                 {fscRates && (
                   <button
                     type="button"
                     onClick={applyLiveFsc}
                     disabled={fscLoading}
                     className="absolute inset-y-0 right-0 flex items-center gap-1 px-2 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                     title={`Apply latest FSC rate for ${input.overseasCarrier || 'UPS'}`}
                   >
                     <RefreshCw className={`w-3 h-3 ${fscLoading ? 'animate-spin' : ''}`} />
                     <span className="hidden sm:inline">LIVE</span>
                   </button>
                 )}
             </div>
             <p className="mt-1 text-[9px] text-gray-400 dark:text-gray-500">
               {t('calc.financial.fscHint')}
             </p>
         </div>
         {!hideMargin && (
             <div>
                 <label className={lc}>Target Margin (%)</label>
                 <div className="relative rounded-lg shadow-sm">
                     <input
                         type="number"
                         step="0.1"
                         min="0"
                         value={input.marginPercent}
                         onChange={(e) => { const v = Number(e.target.value); onFieldChange('marginPercent', isNaN(v) || v < 0 ? 0 : Math.min(v, 99.9)); }}
                         className={`${ic} pr-16`}
                         placeholder="15"
                         inputMode="decimal"
                         autoComplete="off"
                     />
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                         <span className="text-gray-500 sm:text-sm font-bold">%</span>
                     </div>
                 </div>
                 {resolvedMargin && (
                   <div className={`mt-1.5 flex items-start gap-1.5 text-[9px] leading-relaxed ${
                     resolvedMargin.fallback
                       ? 'text-gray-400 dark:text-gray-500'
                       : 'text-emerald-600 dark:text-emerald-400'
                   }`}>
                     <Target className="w-3 h-3 flex-shrink-0 mt-0.5" />
                     <span>
                       {resolvedMargin.matchedRule
                         ? `${isKo ? '적용 룰' : 'Rule'}: ${resolvedMargin.matchedRule.name} → ${resolvedMargin.marginPercent}%`
                         : `${isKo ? '기본값 적용' : 'Default fallback'}: ${resolvedMargin.marginPercent}%`
                       }
                     </span>
                   </div>
                 )}
             </div>
         )}
      </div>
    </div>
  );
};
