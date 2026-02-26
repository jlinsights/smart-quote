import { vi } from 'vitest';
import { fetchExchangeRates } from '../exchangeRateApi';

vi.mock('@/lib/fetchWithRetry', () => ({
  fetchWithRetry: <T>(fn: () => Promise<T>) => fn(),
}));

function makeMockResponse(overrides: Record<string, number> = {}) {
  return {
    result: 'success',
    base_code: 'KRW',
    time_last_update_utc: '2026-02-26T00:00:00+00:00',
    rates: {
      KRW: 1,
      USD: 0.000722, // ~1385 KRW per USD
      EUR: 0.000661, // ~1513 KRW per EUR
      JPY: 0.001117, // ~895 KRW per 100 JPY
      CNY: 0.005123, // ~195 KRW per CNY
      GBP: 0.000571, // ~1752 KRW per GBP
      SGD: 0.000959, // ~1043 KRW per SGD
      ...overrides,
    },
  };
}

describe('fetchExchangeRates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('fetches and returns 6 currencies with correct structure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMockResponse()),
    }));

    const result = await fetchExchangeRates();

    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({
      currency: 'USD',
      code: 'USA',
      flag: '🇺🇸',
    });
    expect(result[0].rate).toBeGreaterThan(0);
    expect(['up', 'down', 'flat']).toContain(result[0].trend);
  });

  it('converts KRW-based rate to "1 foreign = X KRW"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMockResponse({ USD: 0.000722 })),
    }));

    const result = await fetchExchangeRates();
    const usd = result.find(r => r.currency === 'USD')!;

    // 1 / 0.000722 ≈ 1385.04
    expect(usd.rate).toBeCloseTo(1385.04, 0);
  });

  it('handles network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    await expect(fetchExchangeRates()).rejects.toThrow('Network error');
  });

  it('handles non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(fetchExchangeRates()).rejects.toThrow('Exchange rate API error: 429');
  });

  it('handles API error result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'error', 'error-type': 'unsupported-code' }),
    }));
    await expect(fetchExchangeRates()).rejects.toThrow('Exchange rate API returned error');
  });

  it('handles zero rate gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMockResponse({ USD: 0 })),
    }));

    const result = await fetchExchangeRates();
    const usd = result.find(r => r.currency === 'USD')!;
    expect(usd.rate).toBe(0);
    expect(usd.trend).toBe('flat');
  });

  it('includes all expected currencies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMockResponse()),
    }));

    const result = await fetchExchangeRates();
    const currencies = result.map(r => r.currency);
    expect(currencies).toEqual(['USD', 'EUR', 'JPY', 'CNY', 'GBP', 'SGD']);
  });

  it('uses cached previous rates for change calculation', async () => {
    // Seed localStorage with a previous USD rate of 1400 KRW
    localStorage.setItem('exchange_rates_prev', JSON.stringify({
      rates: { USD: 1400, EUR: 1500, JPY: 900, CNY: 195, GBP: 1750, SGD: 1040 },
      timestamp: Date.now() - 60000,
    }));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMockResponse({ USD: 0.000722 })),
    }));

    const result = await fetchExchangeRates();
    const usd = result.find(r => r.currency === 'USD')!;

    // 1/0.000722 ≈ 1385.04, previous = 1400 → change ≈ -14.96
    expect(usd.change).toBeCloseTo(-14.96, 0);
    expect(usd.trend).toBe('down');
  });

  it('shows flat when no cached previous rates exist', async () => {
    // No localStorage data → previousClose = current rate → change = 0
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMockResponse()),
    }));

    const result = await fetchExchangeRates();
    const usd = result.find(r => r.currency === 'USD')!;
    expect(usd.change).toBe(0);
    expect(usd.trend).toBe('flat');
  });

  it('saves current rates to localStorage after fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeMockResponse()),
    }));

    await fetchExchangeRates();

    const cached = JSON.parse(localStorage.getItem('exchange_rates_prev')!);
    expect(cached.rates.USD).toBeCloseTo(1385.04, 0);
    expect(cached.timestamp).toBeGreaterThan(0);
  });
});
