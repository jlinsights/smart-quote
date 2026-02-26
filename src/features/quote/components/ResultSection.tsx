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
  onPackingCostChange: (newCost: number) => void;
  onDownloadPdf: () => void;
  marginUSD: number;
  hideMargin?: boolean;
}

export const ResultSection: React.FC<Props> = ({ result, onMarginChange, onPackingCostChange, onDownloadPdf, marginUSD, hideMargin }) => {
  return (
    <div className="space-y-6 sticky top-6">
      <QuoteSummaryCard result={result} onDownloadPdf={onDownloadPdf} />
      <WarningAlerts warnings={result.warnings} />
      <KeyMetricsGrid result={result} hideMargin={hideMargin} />
      
      {!hideMargin ? (
        <CostBreakdownCard
          result={result}
          onPackingCostChange={onPackingCostChange}
          onMarginChange={onMarginChange}
          marginUSD={marginUSD}
          hideMargin={hideMargin}
        />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <WeatherWidget />
          <NoticeWidget />
        </div>
      )}
    </div>
  );
};