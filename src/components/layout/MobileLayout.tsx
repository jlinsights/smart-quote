import React from 'react';
import { QuoteInput, QuoteResult } from '@/types';
import { InputSection } from '@/features/quote/components/InputSection';
import { ResultSection } from '@/features/quote/components/ResultSection';
import { Moon, Sun, Monitor, RotateCcw } from 'lucide-react';

interface Props {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  isMobileView: boolean;
  setIsMobileView: (isMobile: boolean) => void;
  input: QuoteInput;
  setInput: React.Dispatch<React.SetStateAction<QuoteInput>>;
  result: QuoteResult | null;
  onMarginChange: (val: number) => void;
  onPackingCostChange: (val: number) => void;
  onDownloadPdf: () => void;
  onReset: () => void;
  scrollToResults: () => void;
}

export const MobileLayout: React.FC<Props> = ({
  isDarkMode,
  setIsDarkMode,
  isMobileView,
  setIsMobileView,
  input,
  setInput,
  result,
  onMarginChange,
  onPackingCostChange,
  onDownloadPdf,
  onReset
}) => {
  const containerClass = "max-w-[420px] mx-auto border-x border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 min-h-screen transition-all duration-300";
  const headerClass = "sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 h-14 flex items-center justify-between";
  const mainClass = "px-4 py-6 pb-32 space-y-8";
  const bottomBarClass = "fixed bottom-0 z-40 bg-white/90 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] w-full max-w-[420px] left-1/2 -translate-x-1/2 transition-all duration-300";

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-black flex justify-center py-0 sm:py-8 transition-colors duration-200">
      <div className={containerClass}>
        
        {/* Header */}
        <header className={headerClass}>
          <div className="flex items-center space-x-3">
             <img 
               src={isDarkMode ? "/goodman-gls-logo-dark.png" : "/goodman-gls-logo.png"} 
               alt="Goodman GLS" 
               className="h-8 sm:h-10 w-auto object-contain" 
             />
          </div>
          
          <div className="flex items-center space-x-2">
             {/* Reset Button */}
             <button
               onClick={onReset}
               className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-red-400 transition-colors"
               title="Reset Quote"
             >
                <RotateCcw className="w-5 h-5" />
             </button>

             {/* View Mode Toggle */}
             <button
               onClick={() => setIsMobileView(!isMobileView)}
               className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
               title="Switch to Desktop View"
             >
                <Monitor className="w-5 h-5" />
             </button>

             {/* Dark Mode Toggle */}
             <button 
               onClick={() => setIsDarkMode(!isDarkMode)}
               className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
               aria-label="Toggle Dark Mode"
             >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
          </div>
        </header>

        {/* Main Content */}
        <main className={mainClass}>
          <div className="flex flex-col space-y-8">
              {/* Left Column: Input */}
              <div>
                 <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Shipment Configuration</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter cargo details to generate overseas (UPS, DHL, E-MAX) integrated quote.</p>
                 </div>
                 
                 <InputSection input={input} onChange={setInput} isMobileView={true} effectiveMarginPercent={result?.profitMargin} />
              </div>

              {/* Right Column: Result */}
              <div id="result-section">
                 {result && (
                  <ResultSection
                    result={result}
                    onMarginChange={onMarginChange}
                    onPackingCostChange={onPackingCostChange}
                    onDownloadPdf={onDownloadPdf}
                    marginUSD={input.marginUSD}
                  />
                 )}
              </div>
          </div>
        </main>

        {/* Sticky Bottom Bar */}
        {result && (
          <div className={bottomBarClass}>
              <div className="flex justify-between items-center">
                  <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Estimate</p>
                  <div className="flex items-baseline space-x-1">
                      <p className="text-xl font-bold text-jways-700 dark:text-jways-400">
                          {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(result.totalQuoteAmount)}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                          ({new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(result.totalQuoteAmountUSD)})
                      </span>
                  </div>
                  </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};
