import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/authStorage', () => ({
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  setAccessToken: vi.fn(),
  clearAllTokens: vi.fn(),
}));

describe('request (AbortController timeout)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'ok' }),
        headers: new Headers(),
      }),
    );

    const { request } = await import('../apiClient');
    const result = await request<{ data: string }>('/api/test');
    expect(result).toEqual({ data: 'ok' });
  });

  it('returns undefined for 204 No Content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      }),
    );

    const { request } = await import('../apiClient');
    const result = await request('/api/test');
    expect(result).toBeUndefined();
  });

  it('throws ApiError on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      }),
    );

    const { request } = await import('../apiClient');
    await expect(request('/api/missing')).rejects.toMatchObject({ status: 404 });
  });

  it('aborts and throws when REQUEST_TIMEOUT_MS elapses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, opts?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = opts?.signal;
            if (signal) {
              signal.addEventListener('abort', () =>
                reject(new DOMException('The operation was aborted.', 'AbortError')),
              );
            }
          }),
      ),
    );

    const { request, REQUEST_TIMEOUT_MS } = await import('../apiClient');
    const pending = request('/api/slow');

    // advance clock past the timeout
    vi.advanceTimersByTime(REQUEST_TIMEOUT_MS + 1);

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('clears the timeout when request succeeds (no timer leak)', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      }),
    );

    const { request } = await import('../apiClient');
    await request('/api/test');

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
