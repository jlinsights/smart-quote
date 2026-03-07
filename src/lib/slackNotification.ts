import { QuoteInput, QuoteResult } from '@/types';
import { COUNTRY_OPTIONS } from '@/config/options';
import { formatKRW, formatUSD, formatNum } from './format';

const SLACK_WEBHOOK_URL = import.meta.env.VITE_SLACK_WEBHOOK_URL || '';

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
  if (!SLACK_WEBHOOK_URL) return;

  const country = COUNTRY_OPTIONS.find(c => c.code === input.destinationCountry)?.name || input.destinationCountry;
  const carrier = input.overseasCarrier || 'UPS';
  const memberLine = member.company
    ? `${member.name} (${member.company}) · ${member.email}`
    : `${member.name} · ${member.email}`;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📋 Member Quote: ${referenceNo}`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Member:*\n${memberLine}` },
        { type: 'mrkdwn', text: `*Carrier:*\n${carrier}` },
        { type: 'mrkdwn', text: `*Destination:*\n${country}` },
        { type: 'mrkdwn', text: `*Billable Weight:*\n${formatNum(result.billableWeight)} kg` },
        { type: 'mrkdwn', text: `*Total Quote:*\n${formatKRW(result.totalQuoteAmount)} (${formatUSD(result.totalQuoteAmountUSD)})` },
        { type: 'mrkdwn', text: `*Zone:*\n${result.appliedZone}` },
      ],
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}` },
      ],
    },
  ];

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
  } catch {
    // Slack notification is best-effort; never block the save flow
    console.warn('Slack notification failed');
  }
};
