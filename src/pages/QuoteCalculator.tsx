import React, { useState, useMemo } from 'react';
import { QuoteInput, QuoteResult, Incoterm, PackingType } from '../types';
import { generatePDF } from '@/lib/pdfService';
import { calculateQuote } from '@/features/quote/services/calculationService';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { QuoteHistoryPage } from '@/features/history/components/QuoteHistoryPage';
import { SaveQuoteButton } from '@/features/quote/components/SaveQuoteButton';
import { NavigationTabs, AppView } from '@/components/layout/NavigationTabs';
import { Smartphone, RotateCcw, Zap } from 'lucide-react';
import { formatKRW, formatUSDInt } from '@/lib/format';
import { InputSection } from '@/features/quote/components/InputSection';
import { ResultSection } from '@/features/quote/components/ResultSection';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

const INITIAL_INPUT: QuoteInput = {
  originCountry: 'KR',
  destinationCountry: 'US',
  destinationZip: '',
  shippingMode: 'Door-to-Door',
  incoterm: Incoterm.DAP,
  packingType: PackingType.NONE,
  items: [
    { id: '1', width: 10, length: 10, height: 10, weight: 1, quantity: 1 }
  ],
  marginUSD: 40,
  dutyTaxEstimate: 0,
  exchangeRate: 1300,
  fscPercent: 30,
  overseasCarrier: 'UPS',
  manualPackingCost: undefined
};

const QuoteCalculator: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const [currentView, setCurrentView] = useState<AppView>('calculator');
  const [isMobileView, setIsMobileView] = useState(false);
  
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { t } = useLanguage();

  const [input, setInput] = useState<QuoteInput>(INITIAL_INPUT);

  // Instant frontend calculation — pure function, no API dependency
  const result = useMemo<QuoteResult | null>(() => {
    try {
      return calculateQuote(input);
    } catch (err) {
      console.error('Calculation error:', err);
      return null;
    }
  }, [input]);

  const handleMarginChange = (newMargin: number) => {
    setInput((prev: QuoteInput) => ({ ...prev, marginUSD: newMargin }));
  };

  const handlePackingCostChange = (newCost: number) => {
    setInput((prev: QuoteInput) => ({ ...prev, manualPackingCost: newCost }));
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the quote?')) {
      setInput(INITIAL_INPUT);
    }
  };

  const handleDownloadPdf = () => {
    if (result) {
      generatePDF(input, result);
    }
  };

  const handleQuoteSaved = () => {
    setCurrentView('history');
  };

  const scrollToResults = () => {
    const element = document.getElementById('result-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const layoutProps = {
    isDarkMode,
    setIsDarkMode: toggleDarkMode,
    isMobileView,
    setIsMobileView,
    input,
    setInput,
    result,
    onMarginChange: handleMarginChange,
    onPackingCostChange: handlePackingCostChange,
    onDownloadPdf: handleDownloadPdf,
    onReset: handleReset,
    scrollToResults
  };

  const containerClass = "min-h-screen font-sans transition-colors duration-200";

  return (
    <div className="bg-gray-50 dark:bg-jways-900 min-h-screen font-sans transition-colors duration-200">
      {/* Unified App Header */}
      <Header />

      <div className={containerClass}>
        {/* Calculator Sub-Header / Action Bar */}
        <div className="bg-white dark:bg-jways-800 border-b border-gray-200 dark:border-jways-700 sticky top-0 z-40 transition-colors duration-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-14 flex items-center justify-between w-full">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {!isPublic && <NavigationTabs currentView={currentView} onViewChange={setCurrentView} />}
                
                {currentView === 'calculator' && result && !isPublic && (
                  <div className="hidden sm:block">
                    <SaveQuoteButton input={input} result={result} onSaved={handleQuoteSaved} />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-jways-700 px-3 py-1 rounded-full">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Lightning Quote System</span>
                </div>

                {currentView === 'calculator' && (
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:text-gray-400 dark:hover:bg-jways-700 dark:hover:text-red-400 transition-colors"
                    title={t('calc.resetQuote')}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}

                {currentView === 'calculator' && (
                  <button
                    onClick={() => setIsMobileView(!isMobileView)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-jways-700 transition-colors"
                    title="Switch to Mobile View"
                  >
                    {isMobileView ? (
                      <div className="relative">
                        <Smartphone className="w-5 h-5 text-jways-600" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-jways-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-jways-500"></span>
                        </span>
                      </div>
                    ) : (
                      <Smartphone className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Save Button */}
            {currentView === 'calculator' && result && !isPublic && (
              <div className="sm:hidden pb-3">
                <SaveQuoteButton input={input} result={result} onSaved={handleQuoteSaved} />
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {currentView === 'calculator' ? (
          <>
            {isMobileView ? (
              <MobileLayout {...layoutProps} />
            ) : (
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 lg:pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7">
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('calc.shipmentConfig')}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('calc.shipmentConfigDesc')}</p>
                    </div>
                    <InputSection input={input} onChange={setInput} isMobileView={false} effectiveMarginPercent={result?.profitMargin} hideMargin={isPublic} />
                  </div>
                    <div className="lg:col-span-5" id="result-section">
                    {result && (
                      <ResultSection
                        result={result}
                        onMarginChange={handleMarginChange}
                        onPackingCostChange={handlePackingCostChange}
                        onDownloadPdf={handleDownloadPdf}
                        marginUSD={input.marginUSD}
                        hideMargin={isPublic}
                      />
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* Sticky Bottom Bar (Mobile / Responsive) */}
            {result && !isMobileView && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-jways-800/95 backdrop-blur-md border-t border-gray-200 dark:border-jways-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 safe-area-bottom">
                <div className="max-w-lg mx-auto flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('calc.totalEstimate')}</p>
                    <div className="flex items-baseline space-x-1">
                      <p className="text-xl font-bold text-jways-700 dark:text-jways-400">
                        {formatKRW(result.totalQuoteAmount)}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({formatUSDInt(result.totalQuoteAmountUSD)})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={scrollToResults}
                    className="flex items-center bg-jways-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-jways-700 active:scale-95 transition-all"
                  >
                    {t('calc.viewDetails')}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <QuoteHistoryPage />
        )}

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-jways-700 mt-0 py-8 bg-white dark:bg-jways-900/50 text-center transition-colors duration-200 hidden lg:block">
          <p className="text-sm text-gray-400 dark:text-gray-500">&copy; 2025 Goodman GLS & J-Ways. {isPublic ? 'Smart Quote System.' : 'Internal Use Only.'}</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">System Version 2.1 | Data Updated: 2025.01.15</p>
        </footer>
      </div>

    </div>
  );
};

export default QuoteCalculator;
