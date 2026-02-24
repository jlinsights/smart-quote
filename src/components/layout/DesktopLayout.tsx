import React from 'react';
import { QuoteInput, QuoteResult } from '@/types';
import { InputSection } from '@/features/quote/components/InputSection';
import { ResultSection } from '@/features/quote/components/ResultSection';
import { Zap, Moon, Sun, ChevronRight, Smartphone, RotateCcw } from 'lucide-react';

interface Props {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  isMobileView: boolean;
  setIsMobileView: (isMobile: boolean) => void;
  input: QuoteInput;
  setInput: React.Dispatch<React.SetStateAction<QuoteInput>>;
  result: QuoteResult;
  onMarginChange: (val: number) => void;
  onPackingCostChange: (val: number) => void;
  onDownloadPdf: () => void;
  onReset: () => void;
  scrollToResults: () => void;
}

export const DesktopLayout: React.FC<Props> = ({
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
  onReset,
  scrollToResults
}) => {
  const containerClass = "min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200";
  const headerClass = "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200";
  const mainClass = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 lg:pb-8";
  const bottomBarClass = "lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 safe-area-bottom";

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className={containerClass}>
        {/* Header */}
        <header className={headerClass}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
               <img 
                 src={isDarkMode ? "/goodman-gls-logo-dark.png" : "/goodman-gls-logo.png"} 
                 alt="Goodman GLS" 
                 className="h-8 sm:h-10 w-auto object-contain" 
               />
               <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                      <span className="text-jways-600 dark:text-jways-400">Smart Quote</span>
                  </h1>
                  <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide">QUANTUM JUMP 2026</p>
               </div>
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                   <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                   <span>Lightning Quote System</span>
                </div>
               
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
                 title="Switch to Mobile View"
               >
                  <Smartphone className="w-5 h-5" />
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
          </div>
        </header>

        {/* Main Content */}
        <main className={mainClass}>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Input */}
              <div className="lg:col-span-7">
                 <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Shipment Configuration</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter cargo details to generate domestic (ez) and overseas (UPS) integrated quote.</p>
                 </div>
                 <InputSection input={input} onChange={setInput} isMobileView={false} />
              </div>

              {/* Right Column: Result */}
              <div className="lg:col-span-5" id="result-section">
                 {result && (
                  <ResultSection
                    result={result}
                    onMarginChange={onMarginChange}
                    onPackingCostChange={onPackingCostChange}
                    onDownloadPdf={onDownloadPdf}
                  />
                 )}
              </div>

          </div>

        </main>

        {/* Sticky Bottom Bar (Mobile / Responsive) */}
        {result && (
          <div className={bottomBarClass}>
              <div className="max-w-lg mx-auto flex justify-between items-center">
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
                  <button 
                    onClick={scrollToResults}
                    className="flex items-center bg-jways-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-jways-700 active:scale-95 transition-all"
                  >
                  View Details <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
              </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 mt-0 py-8 bg-white dark:bg-gray-800 text-center transition-colors duration-200 hidden lg:block">
            <p className="text-sm text-gray-400 dark:text-gray-500">© 2025 Goodman GLS & J-Ways. Internal Use Only.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">System Version 2.1 | Data Updated: 2025.01.15</p>
        </footer>
      </div>
    </div>
  );
};
