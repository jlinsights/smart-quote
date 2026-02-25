import { QuoteInput, QuoteResult, QuoteDetail, QuoteListResponse, QuoteListParams, CostBreakdown } from "@/types";

// @ts-expect-error -- Vite injects import.meta.env at build time
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Maps backend breakdown fields (upsBase) to frontend generic names (intlBase).
// Handles both old saved quotes and future field names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBreakdown(raw: any): CostBreakdown {
  return {
    packingMaterial: raw.packingMaterial ?? 0,
    packingLabor: raw.packingLabor ?? 0,
    packingFumigation: raw.packingFumigation ?? 0,
    handlingFees: raw.handlingFees ?? 0,
    intlBase: raw.intlBase ?? raw.upsBase ?? 0,
    intlFsc: raw.intlFsc ?? raw.upsFsc ?? 0,
    intlWarRisk: raw.intlWarRisk ?? raw.upsWarRisk ?? 0,
    intlSurge: raw.intlSurge ?? raw.upsSurge ?? 0,
    destDuty: raw.destDuty ?? 0,
    totalCost: raw.totalCost ?? 0,
  };
}

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
  const raw = await request<QuoteResult & { breakdown: unknown }>('/api/v1/quotes/calculate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { ...raw, breakdown: mapBreakdown(raw.breakdown) };
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
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.perPage != null) searchParams.set('per_page', String(params.perPage));
  if (params.q) searchParams.set('q', params.q);
  if (params.destinationCountry) searchParams.set('destination_country', params.destinationCountry);
  if (params.dateFrom) searchParams.set('date_from', params.dateFrom);
  if (params.dateTo) searchParams.set('date_to', params.dateTo);
  if (params.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();
  return request<QuoteListResponse>(`/api/v1/quotes${qs ? `?${qs}` : ''}`);
};

export const getQuote = async (id: number): Promise<QuoteDetail> => {
  const raw = await request<QuoteDetail & { breakdown: unknown }>(`/api/v1/quotes/${id}`);
  return { ...raw, breakdown: mapBreakdown(raw.breakdown) };
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
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
};
