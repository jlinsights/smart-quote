// @ts-expect-error -- Vite injects import.meta.env at build time
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  nationality: string | null;
  role: 'admin' | 'user' | 'member';
  quoteCount: number;
  createdAt: string;
}

export interface UpdateUserParams {
  name?: string;
  company?: string;
  nationality?: string;
  role?: 'admin' | 'user' | 'member';
}

class UserApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'UserApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('smartQuoteToken');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: { ...headers, ...(options?.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('smartQuoteToken');
      window.location.href = '/login';
    }
    const body = await response.json().catch(() => ({}));
    throw new UserApiError(
      response.status,
      body?.error?.message || `API Error: ${response.statusText}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const listUsers = async (): Promise<AdminUser[]> => {
  return request<AdminUser[]>('/api/v1/users');
};

export const updateUser = async (id: number, params: UpdateUserParams): Promise<AdminUser> => {
  return request<AdminUser>(`/api/v1/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
};

export const deleteUser = async (id: number): Promise<void> => {
  return request<void>(`/api/v1/users/${id}`, { method: 'DELETE' });
};
