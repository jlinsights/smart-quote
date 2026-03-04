import React from 'react';
import { QuoteResult } from '@/types';
import { QuoteSummaryCard } from './QuoteSummaryCard';
import { WarningAlerts } from './WarningAlerts';
import { KeyMetricsGrid } from './KeyMetricsGrid';
import { CostBreakdownCard } from './CostBreakdownCard';
import { WeatherWidget } from './widgets/WeatherWidget';
import { NoticeWidget } from './widgets/NoticeWidget';

interface Props {
  result: QuoteResult;
  onMarginChange: (newMargin: number) => void;
  onDownloadPdf: () => void;
  marginPercent: number;
  hideMargin?: boolean;
  isKorean?: boolean;
}

export const ResultSection: React.FC<Props> = ({ result, onMarginChange, onDownloadPdf, marginPercent, hideMargin, isKorean = true }) => {
  return (
    <div className="space-y-6 sticky top-6">
      <QuoteSummaryCard result={result} onDownloadPdf={onDownloadPdf} isKorean={isKorean} />
      <WarningAlerts warnings={result.warnings} />
      <KeyMetricsGrid result={result} hideMargin={hideMargin} />
      
      {!hideMargin ? (
        <CostBreakdownCard
          result={result}
          onMarginChange={onMarginChange}
          marginPercent={marginPercent}
          hideMargin={hideMargin}
        />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
          <WeatherWidget />
          <NoticeWidget />
        </div>
      )}
    </div>
  );
};