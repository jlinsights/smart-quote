export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const TOKEN_KEY = 'smartQuoteToken';

/** Fired when the API returns 401 — AuthContext listens for this. */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
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
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body?.error?.message || `API Error: ${response.status}`.trim()
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
