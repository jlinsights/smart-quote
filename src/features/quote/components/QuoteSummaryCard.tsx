import React from 'react';
import { QuoteResult } from '@/types';
import { Anchor, FileDown } from 'lucide-react';
import { resultStyles } from './result-styles';

interface Props {
  result: QuoteResult;
  onDownloadPdf: () => void;
}

export const QuoteSummaryCard: React.FC<Props> = ({ result, onDownloadPdf }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);
  const formatUSD = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
      <div className={resultStyles.mainQuoteCardClass}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Anchor className="w-32 h-32 transform rotate-12" />
        </div>
        
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <h2 className="text-jways-200 text-xs font-bold tracking-widest uppercase mt-1">Total Estimated Quote</h2>
                <button 
                    onClick={onDownloadPdf}
                    className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1.5 rounded-lg backdrop-blur-sm transition-colors border border-white/10"
                    title="Download Quote PDF"
                >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF</span>
                </button>
            </div>
            
            <div className="flex flex-col mb-5">
                <div className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                    {formatCurrency(result.totalQuoteAmount)}
                </div>
                <div className="text-lg text-jways-300 font-light mt-1 flex items-center">
                    <span className="opacity-70 mr-2">≈</span> {formatUSD(result.totalQuoteAmountUSD)} <span className="text-xs ml-1 opacity-50">USD</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10">
                <div>
                    <span className="block text-jways-200 text-xs mb-0.5">Transit Time</span>
                    <span className="font-semibold text-white">{result.transitTime}</span>
                </div>
                <div>
                    <span className="block text-jways-200 text-xs mb-0.5">Zone</span>
                    <span className="font-semibold text-white">{result.appliedZone}</span>
                </div>
            </div>
        </div>
      </div>
  );
};
