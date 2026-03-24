import React from 'react';
import { QuoteInput, QuoteResult } from '@/types';
import { QuoteSummaryCard } from './QuoteSummaryCard';
import { WarningAlerts } from './WarningAlerts';
import { KeyMetricsGrid } from './KeyMetricsGrid';
import { CostBreakdownCard } from './CostBreakdownCard';
import { CarrierComparisonCard } from './CarrierComparisonCard';
import { WeatherWidget } from './widgets/WeatherWidget';
import { NoticeWidget } from './widgets/NoticeWidget';

interface Props {
  result: QuoteResult;
  input?: QuoteInput;
  onMarginChange: (newMargin: number) => void;
  onDownloadPdf: () => void;
  onSwitchCarrier?: (carrier: 'UPS' | 'DHL') => void;
  marginPercent: number;
  hideMargin?: boolean;
  isKorean?: boolean;
}

export const ResultSection: React.FC<Props> = ({ result, input, onMarginChange, onDownloadPdf, onSwitchCarrier, marginPercent, hideMargin, isKorean = true }) => {
  return (
    <div className="space-y-6 sticky top-6">
      <QuoteSummaryCard result={result} onDownloadPdf={onDownloadPdf} isKorean={isKorean} />
      <WarningAlerts warnings={result.warnings} />
      <KeyMetricsGrid result={result} hideMargin={hideMargin} />

      {input && onSwitchCarrier && (
        <CarrierComparisonCard
          input={input}
          currentResult={result}
          isKorean={isKorean}
          onSwitchCarrier={onSwitchCarrier}
          hideMargin={hideMargin}
        />
      )}

      {!hideMargin ? (
        <CostBreakdownCard
          result={result}
          onMarginChange={onMarginChange}
          marginPercent={marginPercent}
          hideMargin={hideMargin}
          isKorean={isKorean}
        />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
          <NoticeWidget />
        </div>
      )}
    </div>
  );
};