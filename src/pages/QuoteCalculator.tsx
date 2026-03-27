import React, { useState, useMemo } from 'react';
import { QuoteInput, QuoteResult, QuoteDetail, Incoterm, PackingType } from '../types';
import { generatePDF } from '@/lib/pdfService';
import { calculateQuote } from '@/features/quote/services/calculationService';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { QuoteHistoryPage } from '@/features/history/components/QuoteHistoryPage';
import { AppView } from '@/components/layout/NavigationTabs';
import { InputSection } from '@/features/quote/components/InputSection';
import { ResultSection } from '@/features/quote/components/ResultSection';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_EXCHANGE_RATE, DEFAULT_FSC_PERCENT, DEFAULT_FSC_PERCENT_DHL } from '@/config/rates';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useResolvedMargin } from '@/features/dashboard/hooks/useResolvedMargin';
import { CalculatorActionBar } from './components/CalculatorActionBar';
import { AdminWidgets } from './components/AdminWidgets';
import { Footer } from '@/components/layout/Footer';
import { MobileStickyBottomBar } from './components/MobileStickyBottomBar';

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
  marginPercent: 15,
  dutyTaxEstimate: 0,
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  fscPercent: DEFAULT_FSC_PERCENT,
  overseasCarrier: 'UPS',
  manualPackingCost: undefined
};

const QuoteCalculator: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const [currentView, setCurrentView] = useState<AppView>('calculator');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const { isDarkMode, toggleDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canSaveAndViewHistory = isAdmin;
  const hideMargin = isPublic || user?.role === 'member';
  const isKorean = user?.nationality === 'KR';

  const [input, setInput] = useState<QuoteInput>(INITIAL_INPUT);
  const [lastFscCarrier, setLastFscCarrier] = useState<string | null>(null);

  // FSC is set from rates.ts defaults only — DB auto-apply disabled
  // LIVE button in FinancialSection remains for reference only
  React.useEffect(() => {
    const carrier = input.overseasCarrier || 'UPS';
    if (lastFscCarrier !== carrier) {
      const carrierDefault = carrier === 'DHL' ? DEFAULT_FSC_PERCENT_DHL : DEFAULT_FSC_PERCENT;
      setInput(prev => ({ ...prev, fscPercent: carrierDefault }));
      setLastFscCarrier(carrier);
    }
  }, [input.overseasCarrier, lastFscCarrier]);

  // Instant frontend calculation — pure function, no API dependency
  const result = useMemo<QuoteResult | null>(() => {
    try {
      return calculateQuote(input);
    } catch {
      return null;
    }
  }, [input]);

  const hasManuallyChangedMargin = React.useRef(false);
  const marginResolutionTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // ── Resolve margin from API (DB-driven rules) with fallback ──
  const { data: resolvedMargin } = useResolvedMargin(
    user?.email, user?.nationality, result?.billableWeight
  );

  React.useEffect(() => {
    if (!result || hasManuallyChangedMargin.current) return;

    // Debounce to prevent rapid setInput calls during typing
    if (marginResolutionTimeout.current) clearTimeout(marginResolutionTimeout.current);

    marginResolutionTimeout.current = setTimeout(() => {
      let defaultMargin: number;

      if (resolvedMargin) {
        // API-based margin resolution (DB rules)
        defaultMargin = resolvedMargin.marginPercent;
      } else {
        // Fallback: nationality-based defaults (API unavailable)
        const weight = result.billableWeight;

        if (isKorean) {
          defaultMargin = weight >= 20 ? 19 : 24;
        } else {
          defaultMargin = weight >= 20 ? 24 : 32;
        }
      }

      if (input.marginPercent !== defaultMargin) {
        setInput(prev => ({ ...prev, marginPercent: defaultMargin }));
      }
    }, 300); // 300ms debounce

    return () => {
      if (marginResolutionTimeout.current) clearTimeout(marginResolutionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.billableWeight, resolvedMargin, user?.nationality, user?.email]);



  const handleMarginChange = (newMargin: number) => {
    hasManuallyChangedMargin.current = true;
    setInput((prev: QuoteInput) => ({ ...prev, marginPercent: newMargin }));
  };

  const handleDuplicate = (quote: QuoteDetail) => {
    const duplicatedInput: QuoteInput = {
      originCountry: quote.originCountry || 'KR',
      destinationCountry: quote.destinationCountry,
      destinationZip: quote.destinationZip || '',
      incoterm: (quote.incoterm as Incoterm) || Incoterm.DAP,
      packingType: (quote.packingType as PackingType) || PackingType.NONE,
      items: quote.items.map((item, i) => ({ ...item, id: String(i + 1) })),
      marginPercent: quote.marginPercent,
      dutyTaxEstimate: quote.dutyTaxEstimate,
      exchangeRate: quote.exchangeRate,
      fscPercent: quote.fscPercent,
      overseasCarrier: ((quote as unknown as Record<string, unknown>).overseasCarrier as QuoteInput['overseasCarrier']) || 'UPS',
      shippingMode: 'Door-to-Door',
      manualPackingCost: quote.manualPackingCost ?? undefined,
    };
    setInput(duplicatedInput);
    hasManuallyChangedMargin.current = true;
    setCurrentView('calculator');
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const handleDownloadPdf = async () => {
    if (result) {
      await generatePDF(input, result);
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
    onDownloadPdf: handleDownloadPdf,
    onReset: handleReset,
    scrollToResults,
    hideMargin,
    resolvedMargin,
    isAdmin,
    isKorean,
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans transition-colors duration-200">
      {/* Unified App Header */}
      <Header />

      <div>
        {/* Calculator Sub-Header / Action Bar */}
        <CalculatorActionBar
          currentView={currentView}
          onViewChange={setCurrentView}
          canSaveAndViewHistory={canSaveAndViewHistory}
          input={input}
          result={result}
          onQuoteSaved={handleQuoteSaved}
          onReset={handleReset}
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
        />

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
                    <InputSection input={input} onChange={setInput} isMobileView={false} effectiveMarginPercent={result?.profitMargin} hideMargin={hideMargin} intlBase={result?.breakdown.intlBase} billableWeight={result?.billableWeight} resolvedMargin={resolvedMargin} />
                    {isAdmin && <AdminWidgets />}
                  </div>
                    <div className="lg:col-span-5" id="result-section">
                    {result && (
                      <ResultSection
                        result={result}
                        input={input}
                        hideMargin={hideMargin}
                        onMarginChange={handleMarginChange}
                        onDownloadPdf={handleDownloadPdf}
                        onSwitchCarrier={(carrier) => setInput(prev => ({ ...prev, overseasCarrier: carrier }))}
                        marginPercent={input.marginPercent}
                        isKorean={isKorean}
                      />
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* Sticky Bottom Bar (Mobile / Responsive) */}
            {result && !isMobileView && (
              <MobileStickyBottomBar
                result={result}
                isKorean={isKorean}
                onViewDetails={scrollToResults}
              />
            )}
          </>
        ) : (
          <QuoteHistoryPage onDuplicate={handleDuplicate} />
        )}

        <div className="hidden lg:block">
          <Footer variant={isAdmin ? 'admin' : 'default'} />
        </div>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title={t('calc.resetTitle')}
        message={t('calc.resetMessage')}
        confirmLabel={t('calc.resetQuote')}
        variant="warning"
        onConfirm={() => { setShowResetConfirm(false); setInput(INITIAL_INPUT); }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default QuoteCalculator;
