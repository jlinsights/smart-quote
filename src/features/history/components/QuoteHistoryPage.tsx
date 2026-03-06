import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QuoteSummary, QuoteDetail, QuoteListParams, QuoteStatus, Pagination } from '@/types';
import { listQuotes, getQuote, deleteQuote, exportQuotesCsv } from '@/api/quoteApi';
import { Download, Filter, FileText, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { formatNum } from '@/lib/format';
import { QuoteSearchBar } from './QuoteSearchBar';
import { QuoteHistoryTable } from './QuoteHistoryTable';
import { QuotePagination } from './QuotePagination';
import { QuoteDetailModal } from './QuoteDetailModal';

interface QuoteHistoryPageProps {
  onDuplicate?: (quote: QuoteDetail) => void;
}

export const QuoteHistoryPage: React.FC<QuoteHistoryPageProps> = ({ onDuplicate }) => {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [params, setParams] = useState<QuoteListParams>({ page: 1, perPage: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<QuoteDetail | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listQuotes(params);
      setQuotes(data.quotes);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotes');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(prev => ({ ...prev, q: searchInput || undefined, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setParams(prev => ({ ...prev, page }));
  };

  const handleStatusFilter = (status: QuoteStatus | undefined) => {
    setParams(prev => ({ ...prev, status, page: 1 }));
  };

  const handleView = async (id: number) => {
    try {
      const detail = await getQuote(id);
      setSelectedQuote(detail);
    } catch {
      setError('Failed to load quote detail');
    }
  };

  const handleDelete = async (id: number, refNo: string) => {
    if (!confirm(`Delete quote ${refNo}? This cannot be undone.`)) return;
    try {
      await deleteQuote(id);
      fetchList();
    } catch {
      setError('Failed to delete quote');
    }
  };

  const handleExport = async () => {
    try {
      await exportQuotesCsv(params);
    } catch {
      setError('Failed to export CSV');
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setParams({ page: 1, perPage: 20 });
  };

  const hasActiveFilters = !!(params.q || params.status || params.destinationCountry || params.dateFrom || params.dateTo);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = quotes.filter(q => {
      const d = new Date(q.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalAmount = thisMonth.reduce((sum, q) => sum + q.totalQuoteAmount, 0);
    const avgMargin = thisMonth.length > 0
      ? thisMonth.reduce((sum, q) => sum + q.profitMargin, 0) / thisMonth.length
      : 0;
    const acceptedCount = quotes.filter(q => q.status === 'accepted').length;
    const completedCount = quotes.filter(q => q.status === 'accepted' || q.status === 'rejected').length;
    const winRate = completedCount > 0 ? (acceptedCount / completedCount) * 100 : 0;
    return { count: thisMonth.length, totalAmount, avgMargin, winRate };
  }, [quotes]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Cards */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={<FileText className="w-4 h-4 text-jways-500" />} label="This Month" value={String(stats.count)} />
          <StatCard icon={<DollarSign className="w-4 h-4 text-green-500" />} label="Total Amount" value={`${formatNum(stats.totalAmount)}`} sub="KRW" />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-blue-500" />} label="Avg Margin" value={`${stats.avgMargin.toFixed(1)}%`} />
          <StatCard icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quote History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination ? `${pagination.totalCount} quotes total` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-jways-500 text-jways-600 bg-jways-50 dark:bg-jways-900/20 dark:text-jways-400'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 bg-jways-500 rounded-full" />}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <QuoteSearchBar
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        activeStatus={params.status}
        onStatusFilter={handleStatusFilter}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Table + Pagination */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <QuoteHistoryTable
          quotes={quotes}
          isLoading={isLoading}
          hasActiveFilters={hasActiveFilters}
          onView={handleView}
          onDelete={handleDelete}
        />
        {pagination && (
          <QuotePagination
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onDuplicate={onDuplicate}
          onStatusChange={() => fetchList()}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({ icon, label, value, sub }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
      {value}
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1 font-normal">{sub}</span>}
    </p>
  </div>
);
