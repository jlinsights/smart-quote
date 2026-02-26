import React from 'react';
import { QuoteSummary } from '@/types';
import { Eye, Trash2 } from 'lucide-react';
import { formatNum } from '@/lib/format';
import { STATUS_COLORS } from '@/features/history/constants';

interface Props {
  quotes: QuoteSummary[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onView: (id: number) => void;
  onDelete: (id: number, refNo: string) => void;
}

export const QuoteHistoryTable: React.FC<Props> = ({
  quotes,
  isLoading,
  hasActiveFilters,
  onView,
  onDelete,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ref No</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Dest</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount (KRW)</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">USD</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Margin</th>
            <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-jways-500 border-t-transparent rounded-full animate-spin" />
                  Loading quotes...
                </div>
              </td>
            </tr>
          ) : quotes.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                {hasActiveFilters ? 'No quotes match your filters.' : 'No quotes saved yet. Calculate a quote and save it!'}
              </td>
            </tr>
          ) : (
            quotes.map((q) => (
              <tr
                key={q.id}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-white">
                  {q.referenceNo}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {new Date(q.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {q.destinationCountry}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white tabular-nums">
                  {formatNum(q.totalQuoteAmount)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 tabular-nums text-xs">
                  ${q.totalQuoteAmountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={q.profitMargin >= 10 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                    {q.profitMargin.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[q.status]}`}>
                    {q.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onView(q.id)}
                      className="p-2.5 sm:p-1.5 rounded-md text-gray-400 hover:text-jways-600 hover:bg-jways-50 dark:hover:bg-jways-900/20 transition-colors"
                      title="View detail"
                    >
                      <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(q.id, q.referenceNo)}
                      className="p-2.5 sm:p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
