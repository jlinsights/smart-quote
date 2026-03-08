import React, { useState, useMemo } from 'react';
import { QuoteInput, QuoteResult, QuoteDetail, Incoterm, PackingType } from '../types';
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
const CustomerManagement = React.lazy(() => import('@/features/admin/components/CustomerManagement').then(m => ({ default: m.CustomerManagement })));
const FscRateWidget = React.lazy(() => import('@/features/admin/components/FscRateWidget').then(m => ({ default: m.FscRateWidget })));
const RateTableViewer = React.lazy(() => import('@/features/admin/components/RateTableViewer').then(m => ({ default: m.RateTableViewer })));
const UserManagementWidget = React.lazy(() => import('@/features/admin/components/UserManagementWidget').then(m => ({ default: m.UserManagementWidget })));
const AuditLogViewer = React.lazy(() => import('@/features/admin/components/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const TargetMarginRulesWidget = React.lazy(() => import('@/features/admin/components/TargetMarginRulesWidget').then(m => ({ default: m.TargetMarginRulesWidget })));
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRates } from '@/features/dashboard/hooks/useExchangeRates';
import { useFscRates } from '@/features/dashboard/hooks/useFscRates';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useResolvedMargin } from '@/features/dashboard/hooks/useResolvedMargin';

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
  exchangeRate: 1400,
  fscPercent: 30,
  overseasCarrier: 'UPS',
  manualPackingCost: undefined
};

const QuoteCalculator: React.FC<{ isPublic?: boolean }> = ({ isPublic = false }) => {
  const [currentView, setCurrentView] = useState<AppView>('calculator');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canSaveAndViewHistory = isAuthenticated && !isPublic;
  const hideMargin = isPublic || user?.role === 'member';

  const [input, setInput] = useState<QuoteInput>(INITIAL_INPUT);
  const [hasSetInitialRate, setHasSetInitialRate] = useState(false);
  const [hasSetInitialFsc, setHasSetInitialFsc] = useState(false);
  const [lastAutoFscCarrier, setLastAutoFscCarrier] = useState<string | null>(null);

  const { data: exchangeRates } = useExchangeRates();
  const { data: fscRates } = useFscRates();

  React.useEffect(() => {
    if (!hasSetInitialRate && exchangeRates.length > 0) {
      const usdRate = exchangeRates.find((r: { currency: string; rate: number }) => r.currency === 'USD')?.rate;
      if (usdRate && usdRate > 0) {
        setInput(prev => ({ ...prev, exchangeRate: usdRate }));
        setHasSetInitialRate(true);
      }
    }
  }, [exchangeRates, hasSetInitialRate]);

  React.useEffect(() => {
    if (fscRates && fscRates.rates) {
      const carrier = input.overseasCarrier || 'UPS';
      if (!hasSetInitialFsc || lastAutoFscCarrier !== carrier) {
        const rate = fscRates.rates[carrier as 'UPS' | 'DHL']?.international;
        if (rate !== undefined) {
          setInput(prev => ({ ...prev, fscPercent: rate }));
          setHasSetInitialFsc(true);
          setLastAutoFscCarrier(carrier);
        }
      }
    }
  }, [fscRates, input.overseasCarrier, hasSetInitialFsc, lastAutoFscCarrier]);

  // Instant frontend calculation — pure function, no API dependency
  const result = useMemo<QuoteResult | null>(() => {
    try {
      return calculateQuote(input);
    } catch (err) {
      console.error('Calculation error:', err);
      return null;
    }
  }, [input]);

  const hasManuallyChangedMargin = React.useRef(false);

  // ── Resolve margin from API (DB-driven rules) with fallback ──
  const { data: resolvedMargin } = useResolvedMargin(
    user?.email, user?.nationality, result?.billableWeight
  );

  React.useEffect(() => {
    if (!result || hasManuallyChangedMargin.current) return;

    let defaultMargin: number;

    if (resolvedMargin) {
      // API-based margin resolution (DB rules)
      defaultMargin = resolvedMargin.marginPercent;
    } else {
      // Fallback: nationality-based defaults (API unavailable)
      const isKorean = user?.nationality === 'South Korea' || !user?.nationality;
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
  }, [result, resolvedMargin, user?.nationality, user?.email, input.marginPercent]);



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
    scrollToResults
  };

  const containerClass = "min-h-screen font-sans transition-colors duration-200";

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans transition-colors duration-200">
      {/* Unified App Header */}
      <Header />

      <div className={containerClass}>
        {/* Calculator Sub-Header / Action Bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-14 flex items-center justify-between w-full">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {canSaveAndViewHistory && <NavigationTabs currentView={currentView} onViewChange={setCurrentView} />}

                {currentView === 'calculator' && result && canSaveAndViewHistory && (
                  <div className="hidden sm:block">
                    <SaveQuoteButton input={input} result={result} onSaved={handleQuoteSaved} />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Lightning Quote System</span>
                </div>

                {currentView === 'calculator' && (
                  <button
                    onClick={handleReset}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-red-400 transition-colors"
                    aria-label={t('calc.resetQuote')}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}

                {currentView === 'calculator' && (
                  <button
                    onClick={() => setIsMobileView(!isMobileView)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Switch to Mobile View"
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
            {currentView === 'calculator' && result && canSaveAndViewHistory && (
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
                    <InputSection input={input} onChange={setInput} isMobileView={false} effectiveMarginPercent={result?.profitMargin} hideMargin={hideMargin} />
                    {isAdmin && (
                      <React.Suspense fallback={<div className="mt-8 space-y-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}</div>}>
                        <div className="mt-8 space-y-6">
                          <CustomerManagement />
                          <TargetMarginRulesWidget />
                          <FscRateWidget />
                          <RateTableViewer />
                          <UserManagementWidget />
                          <AuditLogViewer />
                        </div>
                      </React.Suspense>
                    )}
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
                        isKorean={user?.nationality === 'South Korea' || !user?.nationality}
                      />
                    )}
                  </div>
                </div>
              </main>
            )}

            {/* Sticky Bottom Bar (Mobile / Responsive) */}
            {result && !isMobileView && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 safe-area-bottom">
                <div className="max-w-lg mx-auto flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('calc.totalEstimate')}</p>
                    <div className="flex items-baseline space-x-1">
                      {(user?.nationality === 'South Korea' || !user?.nationality) ? (
                        <>
                          <p className="text-xl font-bold text-jways-700 dark:text-jways-400">
                            {formatKRW(result.totalQuoteAmount)}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-400">
                            ({formatUSDInt(result.totalQuoteAmountUSD)})
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="text-xl font-bold text-jways-700 dark:text-jways-400">
                            {formatUSDInt(result.totalQuoteAmountUSD)}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-400">
                            (≈ {formatKRW(result.totalQuoteAmount)})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={scrollToResults}
                    className="flex items-center bg-jways-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-lg shadow-jways-600/25 hover:bg-jways-500 active:scale-95 transition-all"
                  >
                    {t('calc.viewDetails')}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <QuoteHistoryPage onDuplicate={handleDuplicate} />
        )}

        {/* Footer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 mt-0 py-8 bg-white dark:bg-gray-950 text-center transition-colors duration-200 hidden lg:block">
          <p className="text-sm text-gray-400 dark:text-gray-400">&copy; 2025 Goodman GLS & J-Ways. {isAdmin ? 'Internal Use Only.' : 'Smart Quote System.'}</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">System Version 2.1 | Data Updated: 2025.01.15</p>
        </footer>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset Quote"
        message="Are you sure you want to reset all inputs to defaults?"
        confirmLabel="Reset"
        variant="warning"
        onConfirm={() => { setShowResetConfirm(false); setInput(INITIAL_INPUT); }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};

export default QuoteCalculator;
