import { fetchLogisticsNews } from '../noticeApi';

describe('fetchLogisticsNews', () => {
  it('returns all static LogisticsNews[]', async () => {
    const result = await fetchLogisticsNews();

    expect(result).toHaveLength(8);
    expect(result[0]).toEqual(expect.objectContaining({
      title: 'UPS 2025 공휴일 서비스 일정 안내',
      source: 'UPS Korea',
    }));
  });

  it('returns items with required fields', async () => {
    const result = await fetchLogisticsNews();

    for (const item of result) {
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('link');
      expect(item).toHaveProperty('pubDate');
      expect(item).toHaveProperty('source');
    }
  });

  it('returns a promise (async interface)', async () => {
    const promise = fetchLogisticsNews();
    expect(promise).toBeInstanceOf(Promise);
    await promise;
  });
});
