export interface Customer {
  id: number;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  country: string;
  address: string | null;
  notes: string | null;
  quoteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithQuotes extends Customer {
  recentQuotes: {
    id: number;
    referenceNo: string;
    destinationCountry: string;
    totalQuoteAmount: number;
    status: string;
    createdAt: string;
  }[];
}

export interface CustomerInput {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  country?: string;
  address?: string;
  notes?: string;
}

// @ts-expect-error -- Vite injects import.meta.env at build time
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const listCustomers = async (q?: string): Promise<Customer[]> => {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return request<Customer[]>(`/api/v1/customers${qs}`);
};

export const getCustomer = async (id: number): Promise<CustomerWithQuotes> => {
  return request<CustomerWithQuotes>(`/api/v1/customers/${id}`);
};

export const createCustomer = async (input: CustomerInput): Promise<Customer> => {
  return request<Customer>('/api/v1/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const updateCustomer = async (id: number, input: Partial<CustomerInput>): Promise<Customer> => {
  return request<Customer>(`/api/v1/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
};

export const deleteCustomer = async (id: number): Promise<void> => {
  return request<void>(`/api/v1/customers/${id}`, { method: 'DELETE' });
};
