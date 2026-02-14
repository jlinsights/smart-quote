import { QuoteInput, QuoteResult, QuoteDetail, QuoteListResponse, QuoteListParams } from "@/types";

// @ts-expect-error
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class QuoteApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'QuoteApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new QuoteApiError(
      response.status,
      body?.error?.message || `API Error: ${response.statusText}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// ── Existing: stateless calculation ──

export const fetchQuote = async (input: QuoteInput): Promise<QuoteResult> => {
  return request<QuoteResult>('/api/v1/quotes/calculate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

// ── Quote History CRUD ──

export const saveQuote = async (
  input: QuoteInput,
  notes?: string
): Promise<QuoteDetail> => {
  return request<QuoteDetail>('/api/v1/quotes', {
    method: 'POST',
    body: JSON.stringify({ ...input, notes }),
  });
};

export const listQuotes = async (
  params: QuoteListParams = {}
): Promise<QuoteListResponse> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.perPage) searchParams.set('per_page', String(params.perPage));
  if (params.q) searchParams.set('q', params.q);
  if (params.destinationCountry) searchParams.set('destination_country', params.destinationCountry);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();
  return request<QuoteListResponse>(`/api/v1/quotes${qs ? `?${qs}` : ''}`);
};

export const getQuote = async (id: number): Promise<QuoteDetail> => {
  return request<QuoteDetail>(`/api/v1/quotes/${id}`);
};

export const deleteQuote = async (id: number): Promise<void> => {
  return request<void>(`/api/v1/quotes/${id}`, { method: 'DELETE' });
};

export const exportQuotesCsv = async (
  params: QuoteListParams = {}
): Promise<void> => {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.destinationCountry) searchParams.set('destination_country', params.destinationCountry);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();
  const response = await fetch(
    `${API_URL}/api/v1/quotes/export${qs ? `?${qs}` : ''}`,
    { headers: { Accept: 'text/csv' } }
  );

  if (!response.ok) {
    throw new QuoteApiError(response.status, 'Failed to export CSV');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
