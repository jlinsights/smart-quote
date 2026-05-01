#!/usr/bin/env node
/**
 * rss-healthcheck.mjs — Insights NoticeWidget RSS feed healthcheck
 *
 * 사용법:
 *   node scripts/rss-healthcheck.mjs              # 8개 피드 모두 검사
 *   node scripts/rss-healthcheck.mjs --json       # JSON 결과 출력
 *   node scripts/rss-healthcheck.mjs --timeout=10000   # 개별 timeout (ms)
 *
 * 검사 항목:
 *   1. HTTP 200 응답
 *   2. Content-Type 이 RSS/XML 계열
 *   3. <rss> 또는 <feed> 루트 태그 존재
 *   4. <item> 또는 <entry> ≥ 1 개
 *   5. 가장 최근 pubDate/updated 가 30일 이내
 *
 * Exit codes:
 *   0 — 모든 피드 통과
 *   1 — 1개 이상 실패
 */

const args = process.argv.slice(2);
const flagJson = args.includes('--json');
const flagTimeout = parseInt(
  args.find((a) => a.startsWith('--timeout='))?.split('=')[1] ?? '8000',
  10
);

const FEEDS = [
  {
    id: 'aircargo-news',
    name: 'Air Cargo News',
    url: 'https://www.aircargonews.net/feed/',
    lang: 'en',
  },
  {
    id: 'theloadstar',
    name: 'The Loadstar',
    url: 'https://theloadstar.com/feed/',
    lang: 'en',
  },
  {
    id: 'aircargo-week',
    name: 'Air Cargo Week',
    url: 'https://www.aircargoweek.com/feed/',
    lang: 'en',
  },
  {
    id: 'stat-trade-times',
    name: 'STAT Trade Times',
    url: 'https://www.stattimes.com/rss',
    lang: 'en',
  },
  {
    id: 'aviation24',
    name: 'Aviation24',
    url: 'https://www.aviation24.be/feed/',
    lang: 'en',
  },
  {
    id: 'iata-pressroom',
    name: 'IATA Pressroom',
    url: 'https://www.iata.org/en/pressroom/rss/',
    lang: 'en',
  },
  {
    id: 'kotra-news',
    name: 'KOTRA News',
    url: 'https://news.kotra.or.kr/rss/news.xml',
    lang: 'ko',
  },
  {
    id: 'shippersjournal',
    name: 'Shippers Journal',
    url: 'https://www.shippersjournal.com/rss',
    lang: 'ko',
  },
];

const NOW = Date.now();
const STALE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function checkFeed(feed) {
  const result = {
    id: feed.id,
    name: feed.name,
    url: feed.url,
    lang: feed.lang,
    status: 'unknown',
    httpStatus: null,
    contentType: null,
    itemCount: 0,
    latestPubDate: null,
    staleDays: null,
    errors: [],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), flagTimeout);

  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'BridgeLogis-RSS-Healthcheck/1.0 (+https://bridgelogis.com)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timer);

    result.httpStatus = res.status;
    result.contentType = res.headers.get('content-type') ?? '';

    if (!res.ok) {
      result.errors.push(`HTTP ${res.status}`);
      result.status = 'fail';
      return result;
    }

    const ct = result.contentType.toLowerCase();
    const ctLooksXml =
      ct.includes('xml') ||
      ct.includes('rss') ||
      ct.includes('atom') ||
      ct === '' ||
      ct.startsWith('text/');
    if (!ctLooksXml) {
      result.errors.push(`Unexpected content-type: ${result.contentType}`);
    }

    const text = await res.text();

    const isRss = /<rss[\s>]/i.test(text);
    const isAtom = /<feed[\s>]/i.test(text);
    if (!isRss && !isAtom) {
      result.errors.push('No <rss> or <feed> root element found');
      result.status = 'fail';
      return result;
    }

    // <item> 또는 <entry> 카운트
    const itemMatches = text.match(/<item[\s>]/gi);
    const entryMatches = text.match(/<entry[\s>]/gi);
    result.itemCount = (itemMatches?.length ?? 0) + (entryMatches?.length ?? 0);

    if (result.itemCount === 0) {
      result.errors.push('Feed has 0 items/entries');
      result.status = 'fail';
      return result;
    }

    // 가장 최근 pubDate / updated 추출
    const pubDateMatches = [
      ...text.matchAll(/<pubDate>([^<]+)<\/pubDate>/g),
      ...text.matchAll(/<updated>([^<]+)<\/updated>/g),
      ...text.matchAll(/<dc:date>([^<]+)<\/dc:date>/g),
    ];
    const dates = pubDateMatches
      .map((m) => Date.parse(m[1]))
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => b - a);

    if (dates.length === 0) {
      result.errors.push('No parseable date in feed');
      result.status = 'fail';
      return result;
    }

    result.latestPubDate = new Date(dates[0]).toISOString();
    const ageMs = NOW - dates[0];
    result.staleDays = Math.round(ageMs / (24 * 60 * 60 * 1000));

    if (ageMs > STALE_THRESHOLD_MS) {
      result.errors.push(`Latest item is ${result.staleDays} days old (> 30d threshold)`);
      result.status = 'stale';
      return result;
    }

    result.status = 'ok';
    return result;
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fetch error: ${msg}`);
    result.status = 'fail';
    return result;
  }
}

const results = await Promise.all(FEEDS.map(checkFeed));

if (flagJson) {
  process.stdout.write(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  process.exit(results.some((r) => r.status === 'fail') ? 1 : 0);
}

console.log(`\n📡 RSS Healthcheck — ${FEEDS.length} feeds @ ${new Date().toISOString()}\n`);

const ICON = { ok: '✅', stale: '⚠️ ', fail: '❌', unknown: '❓' };

for (const r of results) {
  const icon = ICON[r.status] ?? '❓';
  const items = r.itemCount > 0 ? `${r.itemCount} items` : 'no items';
  const fresh = r.latestPubDate
    ? `latest ${r.staleDays}d ago`
    : 'no date';
  console.log(`${icon} ${r.name.padEnd(22)} HTTP ${r.httpStatus ?? '---'}  ${items}  ${fresh}`);
  for (const e of r.errors) {
    console.log(`         └─ ${e}`);
  }
}

const okCount = results.filter((r) => r.status === 'ok').length;
const staleCount = results.filter((r) => r.status === 'stale').length;
const failCount = results.filter((r) => r.status === 'fail').length;

console.log(
  `\n📊 Summary: ${okCount} OK / ${staleCount} stale / ${failCount} fail (total ${FEEDS.length})\n`
);

process.exit(failCount > 0 ? 1 : 0);
