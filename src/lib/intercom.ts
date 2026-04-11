/**
 * Intercom tracking helpers — thin wrappers around `window.Intercom`.
 *
 * All functions are no-ops if the Intercom SDK hasn't loaded yet, so they're
 * safe to call unconditionally from components. Event names follow
 * `snake_case` per Intercom's convention and are documented in the Intercom
 * dashboard's Event Library.
 *
 * @see https://developers.intercom.com/installing-intercom/web/methods/
 */

/** Safe, typed call into the Intercom global. */
function call(method: string, ...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  const fn = (window as Window & { Intercom?: (...a: unknown[]) => void }).Intercom;
  if (typeof fn !== 'function') return;
  try {
    fn(method, ...args);
  } catch {
    // Intercom silently — tracking must never break the app.
  }
}

/**
 * Track a custom event with optional metadata.
 * Events become available in Intercom for outbound message targeting,
 * segments, and reports.
 *
 * Keep metadata small (max ~5 fields, primitive values) — Intercom rejects
 * deeply nested objects.
 */
export function trackEvent(name: string, metadata?: Record<string, unknown>): void {
  if (metadata && Object.keys(metadata).length > 0) {
    call('trackEvent', name, metadata);
  } else {
    call('trackEvent', name);
  }
}

/**
 * Update visitor/user attributes on the current Intercom session.
 * Useful for page tracking, feature flags, or any state that changes
 * between mounts.
 */
export function updateContext(attrs: Record<string, unknown>): void {
  call('update', attrs);
}

/**
 * Open the Intercom Messenger with a pre-filled draft message.
 * Used by "Ask about this quote" style entry points.
 */
export function showNewMessage(prefilledText: string): void {
  call('showNewMessage', prefilledText);
}

// ── Well-known event names ──
// Centralized so refactors don't drift.

export const IntercomEvents = {
  QuoteCalculated: 'quote_calculated',
  QuoteSaved: 'quote_saved',
  // Reserved for future hooks:
  // PdfExported: 'pdf_exported',
  // ScheduleViewed: 'schedule_viewed',
} as const;
