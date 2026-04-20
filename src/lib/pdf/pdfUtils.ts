import type { jsPDF } from 'jspdf';
import { PDF_LAYOUT } from '@/config/ui-constants';

export const { COLORS, FONTS, MARGIN_X, PAGE_WIDTH } = PDF_LAYOUT;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
export const nextLine = (y: number, h = PDF_LAYOUT.LINE_HEIGHT): number => y + h;

export type CurrencyMode = 'krw' | 'usd' | 'both';

export const pdfFormatKRW = (val: number): string => `KRW ${Math.round(val).toLocaleString('en-US')}`;
export const pdfFormatUSD = (val: number): string =>
  `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const stripEmoji = (str: string): string => str.replace(/[^\x20-\x7E]/g, '').trim();

export const getLastAutoTableY = (doc: jsPDF): number =>
  (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

export const buildFilename = (prefix: string, referenceNo?: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  const ref = referenceNo || 'DRAFT';
  return `${prefix}_${ref}_${date}.pdf`;
};
