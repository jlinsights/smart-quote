import { vi } from 'vitest';
import { fetchLogisticsNews } from '../noticeApi';

// Mock fetchWithRetry to call fn directly
vi.mock('@/lib/fetchWithRetry', () => ({
  fetchWithRetry: <T>(fn: () => Promise<T>) => fn(),
}));

describe('fetchLogisticsNews', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns normalized LogisticsNews[]', async () => {
    const mockItems = [
      { title: 'Port congestion easing', link: 'https://example.com/1', pubDate: '2026-02-26T08:00:00Z', source: 'FreightWaves' },
      { title: 'Fuel surcharge update', link: 'https://example.com/2', pubDate: '2026-02-25T10:00:00Z', source: 'The Loadstar' },
    ];

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: mockItems, fetchedAt: '2026-02-26T10:00:00Z' }),
    }));

    const result = await fetchLogisticsNews();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.objectContaining({
      title: 'Port congestion easing',
      source: 'FreightWaves',
    }));
  });

  it('handles server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(fetchLogisticsNews()).rejects.toThrow('Logistics news API error: 500');
  });

  it('returns empty array when items is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], fetchedAt: '2026-02-26T10:00:00Z' }),
    }));

    const result = await fetchLogisticsNews();
    expect(result).toEqual([]);
  });
});
