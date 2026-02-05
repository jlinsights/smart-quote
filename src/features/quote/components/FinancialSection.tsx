
import React, { useState } from 'react';
import { QuoteInput } from '@/types';
import { DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT, UPS_FSC_URL } from '@/config/rates';
import { TrendingUp, RotateCcw, Info, ExternalLink, RefreshCw } from 'lucide-react';
import { inputStyles } from './input-styles';

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  resetRates: () => void;
  isMobileView: boolean;
}

export const FinancialSection: React.FC<Props> = ({ input, onFieldChange, resetRates, isMobileView }) => {
  const { inputClass, labelClass, grayCardClass } = inputStyles;
  const ic = inputClass(isMobileView);
  const lc = labelClass(isMobileView);
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isDefaultRates = input.exchangeRate === DEFAULT_EXCHANGE_RATE && input.fscPercent === DEFAULT_FSC_PERCENT;
  
  // Financial factors grid - adapt to 3 items
  const financialGrid = `grid grid-cols-1 ${!isMobileView ? 'sm:grid-cols-3' : 'grid-cols-2'} gap-5`;

  const resetBtnClass = isMobileView
    ? "text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-800 shadow-sm whitespace-nowrap flex items-center hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer group"
    : "text-[10px] sm:text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800 shadow-sm whitespace-nowrap flex items-center hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer group";

  const handleRefreshFsc = async () => {
    setIsRefreshing(true);
    try {
        const res = await fetch('/api/fsc');
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (data.rate) {
            onFieldChange('fscPercent', data.rate);
        }
    } catch (e) {
        console.error("Failed to auto-update FSC", e);
        // Optional: Add visual error feedback
    } finally {
        setIsRefreshing(false);
    }
  };

  return (
    <div className={grayCardClass}>
      <div className="flex items-center justify-between mb-5">
         <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center">
             <TrendingUp className="w-4 h-4 mr-2 text-jways-600 dark:text-jways-400" />
             Financial Factors
         </h3>
         {isDefaultRates ? (
             <span className="text-[10px] sm:text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-100 dark:border-green-800 shadow-sm whitespace-nowrap flex items-center">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                 Live Rates Applied
             </span>
         ) : (
             <button 
                 onClick={resetRates}
                 className={resetBtnClass}
                 title="Reset to weekly default rates"
             >
                 <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5 group-hover:scale-125 transition-transform"></span>
                 Manual Override <RotateCcw className="w-3 h-3 ml-1.5 opacity-70" />
             </button>
         )}
      </div>
      <div className={financialGrid}>
         <div>
             <label className={lc}>Ex. Rate</label>
             <div className="relative rounded-lg shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                 <span className="text-gray-500 sm:text-sm font-bold">₩</span>
                 </div>
                 <input
                     type="number"
                     step="any"
                     value={input.exchangeRate}
                     onChange={(e) => onFieldChange('exchangeRate', Number(e.target.value))}
                     className={`${ic} pl-8 bg-white focus:bg-white ${input.exchangeRate !== DEFAULT_EXCHANGE_RATE ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}
                     inputMode="decimal"
                     autoComplete="off"
                 />
             </div>
         </div>
         <div>
             <div className="flex items-center justify-between mb-1">
                <label className={lc}>FSC %</label>
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={handleRefreshFsc}
                        disabled={isRefreshing}
                        className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isRefreshing ? 'animate-spin text-jways-600' : 'text-gray-400'}`}
                        title="Auto-fetch latest official rate"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    <a 
                        href={UPS_FSC_URL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                        title="Check Official UPS Rate"
                    >
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
             </div>
             <div className="relative rounded-lg shadow-sm">
                 <input
                     type="number"
                     step="0.01"
                     value={input.fscPercent}
                     onChange={(e) => onFieldChange('fscPercent', Number(e.target.value))}
                     className={`${ic} pr-8 bg-white focus:bg-white ${input.fscPercent !== DEFAULT_FSC_PERCENT ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}
                     inputMode="decimal"
                     autoComplete="off"
                 />
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                 <span className="text-gray-500 sm:text-sm font-bold">%</span>
                 </div>
             </div>
         </div>
         <div className={isMobileView ? "col-span-2" : ""}>
             <label className={lc}>Target Margin (%)</label>
             <div className="relative rounded-lg shadow-sm">
                 <input 
                 type="number" 
                 step="any"
                 value={input.marginPercent}
                 onChange={(e) => onFieldChange('marginPercent', Number(e.target.value))}
                 className={`${ic} ${input.marginPercent < 10 ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-white focus:bg-white dark:bg-gray-700'}`}
                 inputMode="decimal"
                 autoComplete="off"
                 />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                     <span className="text-gray-500 sm:text-sm font-bold">%</span>
                 </div>
             </div>
         </div>
      </div>
      
      <div className="mt-4 flex items-start text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
          <Info className="w-3.5 h-3.5 mr-2 mt-0.5 text-jways-500 flex-shrink-0" />
          <div className="space-y-0.5">
              <p className="font-medium text-gray-700 dark:text-gray-300">Market Variable Updates</p>
              <p className="leading-relaxed opacity-90">
                 환율(Ex. Rate)과 유류할증료(FSC) 모두 <span className="font-semibold text-gray-600 dark:text-gray-200">주간 단위</span>로 변동됩니다.
                 <span className="block text-[10px] opacity-75 mt-0.5 font-normal">
                     * Both Ex. Rate & FSC update weekly
                 </span>
              </p>
          </div>
      </div>
    </div>
  );
};

