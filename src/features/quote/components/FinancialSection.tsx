import React from 'react';
import { QuoteInput } from '@/types';
import { UPS_FSC_URL } from '@/config/rates';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { inputStyles } from './input-styles';

interface Props {
  input: QuoteInput;
  onFieldChange: <K extends keyof QuoteInput>(key: K, value: QuoteInput[K]) => void;
  isMobileView: boolean;
}

export const FinancialSection: React.FC<Props> = ({ input, onFieldChange, isMobileView }) => {
  const { inputClass, labelClass, grayCardClass } = inputStyles;
  const ic = inputClass(isMobileView);
  const lc = labelClass(isMobileView);

  const financialGrid = `grid grid-cols-1 ${!isMobileView ? 'sm:grid-cols-3' : 'grid-cols-2'} gap-3`;

  return (
    <div className={grayCardClass}>
      <div className="flex items-center justify-between mb-4">
         <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center">
             <TrendingUp className="w-4 h-4 mr-2 text-jways-600 dark:text-jways-400" />
             Financial Factors
         </h3>
         <a
             href={UPS_FSC_URL}
             target="_blank"
             rel="noopener noreferrer"
             className="text-[10px] sm:text-xs text-gray-500 hover:text-blue-600 flex items-center transition-colors"
             title="Check Official UPS FSC"
         >
             UPS FSC <ExternalLink className="w-3 h-3 ml-1" />
         </a>
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
                     onChange={(e) => onFieldChange('exchangeRate', Number(e.target.value))}
                     className={`${ic} pl-8`}
                     placeholder="1430"
                     inputMode="decimal"
                     autoComplete="off"
                 />
             </div>
         </div>
         <div>
             <label className={lc}>FSC %</label>
             <div className="relative rounded-lg shadow-sm">
                 <input
                     type="number"
                     step="0.01"
                     min="0"
                     value={input.fscPercent}
                     onChange={(e) => onFieldChange('fscPercent', Number(e.target.value))}
                     className={`${ic} pr-8`}
                     placeholder="30.25"
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
                 min="0"
                 max="99"
                 value={input.marginPercent}
                 onChange={(e) => onFieldChange('marginPercent', Number(e.target.value))}
                 className={`${ic} pr-8 ${input.marginPercent < 10 ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300' : ''}`}
                 placeholder="15"
                 inputMode="decimal"
                 autoComplete="off"
                 />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                     <span className="text-gray-500 sm:text-sm font-bold">%</span>
                 </div>
             </div>
             {input.marginPercent < 10 && (
                 <p className="mt-1 text-[10px] text-red-500 font-medium">Low margin — approval required</p>
             )}
         </div>
      </div>
    </div>
  );
};
