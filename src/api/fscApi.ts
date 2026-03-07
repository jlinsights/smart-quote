// @ts-expect-error -- Vite injects import.meta.env at build time
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface FscRates {
  rates: {
    UPS: { international: number; domestic: number };
    DHL: { international: number; domestic: number };
  };
  updatedAt: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('smartQuoteToken');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...(options?.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API Error: ${response.statusText}`);
  }
  return response.json();
}

export const getFscRates = async (): Promise<FscRates> => {
  return request<FscRates>('/api/v1/fsc/rates');
};

export const updateFscRate = async (
  carrier: 'UPS' | 'DHL',
  international: number,
  domestic: number
): Promise<{ success: boolean }> => {
  return request<{ success: boolean }>('/api/v1/fsc/update', {
    method: 'POST',
    body: JSON.stringify({ carrier, international, domestic }),
  });
};
