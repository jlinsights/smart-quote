import React, { useState, useEffect, useCallback } from 'react';
import { QuoteSummary, QuoteDetail, QuoteListParams, QuoteStatus, Pagination } from '@/types';
import { listQuotes, getQuote, deleteQuote, exportQuotesCsv } from '@/api/quoteApi';
import { Download, Filter } from 'lucide-react';
import { QuoteSearchBar } from './QuoteSearchBar';
import { QuoteHistoryTable } from './QuoteHistoryTable';
import { QuotePagination } from './QuotePagination';
import { QuoteDetailModal } from './QuoteDetailModal';

export const QuoteHistoryPage: React.FC = () => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        />
      )}
    </div>
  );
};
