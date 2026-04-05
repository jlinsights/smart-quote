/**
 * Return original URL only if it uses http(s) or is a relative path.
 * Otherwise return '#' to block javascript:/data:/vbscript: URL injection.
 *
 * Used to guard external links whose href values come from untrusted sources
 * (e.g., third-party RSS feeds).
 */
export function safeExternalHref(href: unknown): string {
  if (typeof href !== 'string') return '#';
  const trimmed = href.trim();
  if (!trimmed) return '#';
  // Allow relative URLs
  if (trimmed.startsWith('/')) return trimmed;
  // Allow only http(s) absolute URLs
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '#';
}
