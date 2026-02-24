import React from 'react';
import { QuoteResult } from '@/types';
import { QuoteSummaryCard } from './QuoteSummaryCard';
import { WarningAlerts } from './WarningAlerts';
import { KeyMetricsGrid } from './KeyMetricsGrid';
import { CostBreakdownCard } from './CostBreakdownCard';

interface Props {
  result: QuoteResult;
  onMarginChange: (newMargin: number) => void;
  onPackingCostChange: (newCost: number) => void;
  onDownloadPdf: () => void;
  marginUSD: number;
}

export const ResultSection: React.FC<Props> = ({ result, onMarginChange, onPackingCostChange, onDownloadPdf, marginUSD }) => {
  return (
    <div className="space-y-6 sticky top-6">
      <QuoteSummaryCard result={result} onDownloadPdf={onDownloadPdf} />
      <WarningAlerts warnings={result.warnings} />
      <KeyMetricsGrid result={result} />
      <CostBreakdownCard
        result={result}
        onPackingCostChange={onPackingCostChange}
        onMarginChange={onMarginChange}
        marginUSD={marginUSD}
      />
    </div>
  );
};