import { safeExternalHref } from './urlSafety';

describe('safeExternalHref', () => {
  it('passes through https URLs', () => {
    expect(safeExternalHref('https://example.com/news/1')).toBe(
      'https://example.com/news/1',
    );
  });

  it('passes through http URLs', () => {
    expect(safeExternalHref('http://example.com')).toBe('http://example.com');
  });

  it('passes through relative paths', () => {
    expect(safeExternalHref('/path/to/page')).toBe('/path/to/page');
  });

  it('blocks javascript: URLs', () => {
    expect(safeExternalHref('javascript:alert(1)')).toBe('#');
  });

  it('blocks javascript: URLs with uppercase / mixed case', () => {
    expect(safeExternalHref('JavaScript:alert(1)')).toBe('#');
  });

  it('blocks data: URLs', () => {
    expect(safeExternalHref('data:text/html,<script>alert(1)</script>')).toBe(
      '#',
    );
  });

  it('blocks vbscript: URLs', () => {
    expect(safeExternalHref('vbscript:msgbox(1)')).toBe('#');
  });

  it('returns # for empty string, whitespace, null, undefined, and non-strings', () => {
    expect(safeExternalHref('')).toBe('#');
    expect(safeExternalHref('   ')).toBe('#');
    expect(safeExternalHref(null)).toBe('#');
    expect(safeExternalHref(undefined)).toBe('#');
    expect(safeExternalHref(123)).toBe('#');
    expect(safeExternalHref({ href: 'https://x.com' })).toBe('#');
  });

  it('trims whitespace before checking scheme', () => {
    expect(safeExternalHref('  https://example.com  ')).toBe(
      'https://example.com',
    );
  });
});
