import React, { useState, useEffect } from 'react';
import { QuoteInput, QuoteResult, Incoterm, PackingType } from './types';
import { DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT } from '@/config/rates';
import { INITIAL_MARGIN } from '@/config/business-rules';
// import { calculateQuote } from '@/features/quote/services/calculationService';
import { generatePDF } from '@/lib/pdfService';
import { fetchQuote } from '@/api/quoteApi';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { DesktopLayout } from '@/components/layout/DesktopLayout';

const App: React.FC = () => {
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // View Mode State (for simulation)
  const [isMobileView, setIsMobileView] = useState(false);

  // Apply dark class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const initialInput: QuoteInput = {
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
  };

  // Initial Input State
  const [input, setInput] = useState<QuoteInput>(initialInput);

  // API State
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce & Fetch Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchQuote(input);
        setResult(data);
      } catch (err) {
        console.error(err);
        setError("Failed to calculate quote. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
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

  const handleReset = () => {
      if (confirm('Are you sure you want to reset the quote?')) {
          setInput(initialInput);
      }
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

  const layoutProps = {
    isDarkMode,
    setIsDarkMode,
    isMobileView,
    setIsMobileView,
    input,
    setInput,
    result: result!, // Force non-null for now as initial state is quickly populated or handled by components checking null
    onMarginChange: handleMarginChange,
    onDomesticCostChange: handleDomesticCostChange,
    onPackingCostChange: handlePackingCostChange,
    onDownloadPdf: handleDownloadPdf,
    onReset: handleReset,
    scrollToResults
  };

  return (
    <>
      {isMobileView ? (
        <MobileLayout {...layoutProps} />
      ) : (
        <DesktopLayout {...layoutProps} />
      )}
      {isLoading && (
        <div className="fixed top-20 right-4 bg-jways-600 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold z-50 flex items-center animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-bounce"></div>
          Updating...
        </div>
      )}
      {error && (
        <div className="fixed top-20 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold z-50">
          {error}
        </div>
      )}
    </>
  );
};

export default App;