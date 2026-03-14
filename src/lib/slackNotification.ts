import * as Sentry from '@sentry/browser';
import { request } from '@/api/apiClient';
import { QuoteInput, QuoteResult } from '@/types';
import { COUNTRY_OPTIONS } from '@/config/options';
import { formatKRW, formatUSD, formatNum } from './format';

interface SlackMemberInfo {
  name: string;
  email: string;
  company?: string;
}

export const sendQuoteSlackNotification = async (
  input: QuoteInput,
  result: QuoteResult,
  referenceNo: string,
  member: SlackMemberInfo
): Promise<void> => {
  const country = COUNTRY_OPTIONS.find(c => c.code === input.destinationCountry)?.name || input.destinationCountry;
  const carrier = input.overseasCarrier || 'UPS';
  const memberLine = member.company
    ? `${member.company} / ${member.name} / ${member.email}`
    : `${member.name} / ${member.email}`;

  try {
    await request('/api/v1/notifications/slack', {
      method: 'POST',
      body: JSON.stringify({
        referenceNo,
        member: memberLine,
        carrier,
        destination: country,
        billableWeight: formatNum(result.billableWeight),
        totalQuote: `${formatKRW(result.totalQuoteAmount)} (${formatUSD(result.totalQuoteAmountUSD)})`,
        margin: `${result.profitMargin.toFixed(1)}%`,
      }),
    });
  } catch (e) {
    // Slack notification is best-effort; never block the save flow
    Sentry.captureException(e);
  }
};
