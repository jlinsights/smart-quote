import React, { useState } from 'react';
import { QuoteDetail, QuoteStatus } from '@/types';
import { X, Package, DollarSign, TrendingUp, Copy } from 'lucide-react';
import { formatNum } from '@/lib/format';
import { updateQuoteStatus } from '@/api/quoteApi';
import { STATUS_COLORS } from '../constants';

interface Props {
  quote: QuoteDetail;
  onClose: () => void;
  onDuplicate?: (quote: QuoteDetail) => void;
  onStatusChange?: (id: number, newStatus: QuoteStatus) => void;
}

const STATUS_FLOW: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected'];

export const QuoteDetailModal: React.FC<Props> = ({ quote, onClose, onDuplicate, onStatusChange }) => {
  const fmt = formatNum;
  const [currentStatus, setCurrentStatus] = useState<QuoteStatus>(quote.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (newStatus === currentStatus) return;
    setIsUpdating(true);
    try {
      await updateQuoteStatus(quote.id, newStatus);
      setCurrentStatus(newStatus);
      onStatusChange?.(quote.id, newStatus);
    } catch {
      // silently fail - user can retry
    } finally {
      setIsUpdating(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-gray-900 dark:text-white">{quote.referenceNo}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Created {new Date(quote.createdAt).toLocaleString('ko-KR')}
              </p>
              <div className="flex items-center gap-1">
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={isUpdating}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize transition-all ${
                      s === currentStatus
                        ? `${STATUS_COLORS[s]} ring-1 ring-current`
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDuplicate && (
              <button
                onClick={() => onDuplicate(quote)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-jways-600 hover:text-jways-700 bg-jways-50 hover:bg-jways-100 dark:text-jways-400 dark:hover:text-jways-300 dark:bg-jways-900/30 dark:hover:bg-jways-900/50 transition-colors"
                title="Duplicate this quote"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              icon={<DollarSign className="w-4 h-4 text-jways-500" />}
              label="Quote Amount"
              value={`${fmt(quote.totalQuoteAmount)} KRW`}
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4 text-blue-500" />}
              label="USD"
              value={`$${quote.totalQuoteAmountUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4 text-green-500" />}
              label="Margin"
              value={`${quote.profitMargin.toFixed(1)}%`}
            />
            <MetricCard
              icon={<Package className="w-4 h-4 text-amber-500" />}
              label="Billable Wt"
              value={`${quote.billableWeight.toFixed(1)} kg`}
            />
          </div>

          {/* Route & Service */}
          <Section title="Route & Service">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Origin" value={quote.originCountry} />
              <Field label="Destination" value={`${quote.destinationCountry} ${quote.destinationZip || ''}`} />
              <Field label="Shipping Mode" value={quote.incoterm === 'DAP' ? 'Door-to-Door' : quote.incoterm} />
              <Field label="Packing" value={quote.packingType} />
              <Field label="Zone" value={quote.appliedZone || '-'} />
              <Field label="Exchange Rate" value={`${quote.exchangeRate.toLocaleString()} KRW/USD`} />
              <Field label="FSC" value={`${quote.fscPercent}%`} />
            </div>
          </Section>

          {/* Cargo Items */}
          <Section title="Cargo Items">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-2 pr-3">#</th>
                    <th className="text-right py-2 px-2">W(cm)</th>
                    <th className="text-right py-2 px-2">L(cm)</th>
                    <th className="text-right py-2 px-2">H(cm)</th>
                    <th className="text-right py-2 px-2">Wt(kg)</th>
                    <th className="text-right py-2 pl-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 text-gray-700 dark:text-gray-300">
                      <td className="py-2 pr-3">{i + 1}</td>
                      <td className="text-right py-2 px-2">{item.width}</td>
                      <td className="text-right py-2 px-2">{item.length}</td>
                      <td className="text-right py-2 px-2">{item.height}</td>
                      <td className="text-right py-2 px-2">{item.weight}</td>
                      <td className="text-right py-2 pl-2">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Cost Breakdown */}
          <Section title="Cost Breakdown">
            <div className="space-y-1.5 text-sm">
              <BreakdownRow label="Packing Material" value={quote.breakdown.packingMaterial} />
              <BreakdownRow label="Packing Labor" value={quote.breakdown.packingLabor} />
              <BreakdownRow label="Packing Fumigation" value={quote.breakdown.packingFumigation} />
              <BreakdownRow label="Handling Fees" value={quote.breakdown.handlingFees} />
              <BreakdownRow label="Intl. Base" value={quote.breakdown.intlBase} />
              <BreakdownRow label="Intl. FSC" value={quote.breakdown.intlFsc} />
              <BreakdownRow label="Intl. War Risk" value={quote.breakdown.intlWarRisk} />
              <BreakdownRow label="Intl. Surge" value={quote.breakdown.intlSurge} />
              {quote.breakdown.destDuty > 0 && (
                <BreakdownRow label="Dest Duty/Tax" value={quote.breakdown.destDuty} />
              )}
              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-gray-900 dark:text-white">
                <span>Total Cost</span>
                <span>{fmt(quote.breakdown.totalCost)} KRW</span>
              </div>
            </div>
          </Section>

          {/* Warnings */}
          {quote.warnings && quote.warnings.length > 0 && (
            <Section title="Warnings">
              <ul className="space-y-1">
                {quote.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Notes */}
          {quote.notes && (
            <Section title="Notes">
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{quote.notes}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ──

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{value}</p>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
      {title}
    </h4>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between py-1">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className="font-medium text-gray-900 dark:text-white">{value}</span>
  </div>
);

const BreakdownRow: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-gray-600 dark:text-gray-300">
      <span>{label}</span>
      <span className="tabular-nums">{formatNum(value)} KRW</span>
    </div>
  );
};
