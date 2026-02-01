import React, { useState, useEffect } from 'react';
import { QuoteInput, QuoteResult, DomesticRegionCode, Incoterm, PackingType } from './types';
import { INITIAL_MARGIN, DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT } from './constants';
import { calculateQuote } from './services/calculationService';
import { generatePDF } from './services/pdfService';
import { InputSection } from './components/InputSection';
import { ResultSection } from './components/ResultSection';
import { Zap, Moon, Sun, ChevronRight, Smartphone, Monitor } from 'lucide-react';

const App: React.FC = () => {
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // View Mode State (for simulation)
  const [isMobileView, setIsMobileView] = useState(false);

  // System Rates State (Fetched from API)
  const [systemRates, setSystemRates] = useState({
      exchangeRate: DEFAULT_EXCHANGE_RATE,
      fscPercent: DEFAULT_FSC_PERCENT
  });

  // Apply dark class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initial Input State
  const [input, setInput] = useState<QuoteInput>({
    originCountry: 'KR',
    destinationCountry: 'US',
    destinationZip: '',
    domesticRegionCode: 'A',
    isJejuPickup: false,
    incoterm: Incoterm.DAP,
    packingType: PackingType.NONE,
    items: [
      { id: '1', width: 40, length: 50, height: 40, weight: 15, quantity: 1 }
    ],
    marginPercent: INITIAL_MARGIN,
    dutyTaxEstimate: 0,
    exchangeRate: DEFAULT_EXCHANGE_RATE,
    fscPercent: DEFAULT_FSC_PERCENT,
    manualDomesticCost: undefined,
    manualPackingCost: undefined
  });

  const [result, setResult] = useState<QuoteResult | null>(null);

  // Simulate API Fetching for Market Rates
  useEffect(() => {
    const fetchMarketRates = async () => {
        try {
            // Simulate API Delay
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Simulated Response with updated rates
            const liveRates = {
                exchangeRate: 1445.50, // Updated from 1430
                fscPercent: 32.25      // Updated from 31.5
            };
            
            setSystemRates(liveRates);
            
            // Update input to reflect live rates automatically
            setInput(prev => ({
                ...prev,
                exchangeRate: liveRates.exchangeRate,
                fscPercent: liveRates.fscPercent
            }));
            
            console.log('Live market rates updated:', liveRates);
        } catch (error) {
            console.error('Failed to fetch market rates, using fallbacks.', error);
        }
    };
    
    fetchMarketRates();
  }, []);

  // Reactive Calculation
  useEffect(() => {
    const calculatedResult = calculateQuote(input);
    setResult(calculatedResult);
  }, [input]);

  const handleMarginChange = (newMargin: number) => {
    setInput(prev => ({ ...prev, marginPercent: newMargin }));
  };

  const handleDomesticCostChange = (newCost: number) => {
      setInput(prev => ({ ...prev, manualDomesticCost: newCost }));
  };

  const handlePackingCostChange = (newCost: number) => {
      setInput(prev => ({ ...prev, manualPackingCost: newCost }));
  };
  
  const handleDownloadPdf = () => {
    if (result) {
      generatePDF(input, result);
    }
  };

  const scrollToResults = () => {
    const element = document.getElementById('result-section');
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper classes for conditional layout
  const containerClass = isMobileView 
    ? "max-w-[420px] mx-auto border-x border-gray-200 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-900 min-h-screen transition-all duration-300"
    : "min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200";

  const headerClass = isMobileView
    ? "sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 h-14 flex items-center justify-between"
    : "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200";

  const mainClass = isMobileView
    ? "px-4 py-6 pb-32 space-y-8"
    : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 lg:pb-8";

  const gridClass = isMobileView
    ? "flex flex-col space-y-8"
    : "grid grid-cols-1 lg:grid-cols-12 gap-8";

  const bottomBarClass = isMobileView
    ? "fixed bottom-0 z-40 bg-white/90 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] w-full max-w-[420px] left-1/2 -translate-x-1/2 transition-all duration-300"
    : "lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 safe-area-bottom";

  return (
    <div className={isMobileView ? "min-h-screen bg-gray-200 dark:bg-black flex justify-center py-0 sm:py-8 transition-colors duration-200" : "bg-gray-50 dark:bg-gray-900"}>
      <div className={containerClass}>
      
      {/* Header */}
      <header className={headerClass}>
        <div className={`flex items-center justify-between w-full ${!isMobileView ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16' : ''}`}>
          <div className="flex items-center space-x-4">
             {/* Goodman GLS Logo */}
             <img 
                src="https://www.goodmangls.com/img/common/logo.png" 
                alt="Goodman GLS" 
                className="h-7 sm:h-9 w-auto object-contain"
                onError={(e) => {
                    // Simple text fallback in case image fails to load
                    e.currentTarget.style.display = 'none';
                    const fallback = document.getElementById('logo-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                }}
             />
             <div id="logo-fallback" className="hidden font-bold text-xl text-jways-800 dark:text-white">GOODMAN GLS</div>
             
             <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

             <div>
                <h1 className={`${isMobileView ? 'text-lg' : 'text-xl'} font-bold text-jways-600 dark:text-jways-400 tracking-tight`}>
                    Smart Quote
                </h1>
                {!isMobileView && <p className="hidden sm:block text-[10px] text-gray-400 font-medium tracking-wide uppercase">Integrated Logistics Solution</p>}
             </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
             {!isMobileView && (
                 <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Lightning Quote System</span>
                 </div>
             )}
             
             {/* View Mode Toggle */}
             <button
               onClick={() => setIsMobileView(!isMobileView)}
               className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
               title={isMobileView ? "Switch to Desktop View" : "Switch to Mobile View"}
             >
                {isMobileView ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
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
        
        <div className={gridClass}>
            
            {/* Left Column: Input */}
            <div className={isMobileView ? "" : "lg:col-span-7"}>
               <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Shipment Configuration</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enter cargo details to generate domestic (ez) and overseas (UPS) integrated quote.</p>
               </div>
               
               <InputSection 
                    input={input} 
                    onChange={setInput} 
                    isMobileView={isMobileView} 
                    systemExchangeRate={systemRates.exchangeRate}
                    systemFscPercent={systemRates.fscPercent}
               />
            </div>

            {/* Right Column: Result */}
            <div className={isMobileView ? "" : "lg:col-span-5"} id="result-section">
               {result && (
                <ResultSection 
                  result={result} 
                  onMarginChange={handleMarginChange} 
                  onDomesticCostChange={handleDomesticCostChange}
                  onPackingCostChange={handlePackingCostChange}
                  onDownloadPdf={handleDownloadPdf}
                />
               )}
            </div>

        </div>

      </main>

      {/* Sticky Bottom Bar (Mobile / Mobile View Mode) */}
      {result && (
        <div className={bottomBarClass}>
            <div className={`flex justify-between items-center ${!isMobileView ? 'max-w-lg mx-auto' : ''}`}>
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
                {!isMobileView && (
                    <button 
                    onClick={scrollToResults}
                    className="flex items-center bg-jways-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-jways-700 active:scale-95 transition-all"
                    >
                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Footer (Hidden in Mobile View for cleaner look) */}
      {!isMobileView && (
        <footer className="border-t border-gray-200 dark:border-gray-700 mt-0 py-8 bg-white dark:bg-gray-800 text-center transition-colors duration-200 hidden lg:block">
            <p className="text-sm text-gray-400 dark:text-gray-500">© 2025 Goodman GLS. Internal Use Only.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">System Version 2.2 | Data Updated: 2025.01.15</p>
        </footer>
      )}
      </div>
    </div>
  );
};

export default App;