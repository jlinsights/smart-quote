import type { jsPDF } from 'jspdf';
import { QuoteInput, QuoteResult, PackingType } from '@/types';
import { applyPackingDimensions } from '../packing-utils';
import { formatNum, formatNumDec } from '../format';
import {
  COLORS,
  FONTS,
  MARGIN_X,
  getLastAutoTableY,
  nextLine,
  CurrencyMode,
  pdfFormatKRW,
  pdfFormatUSD,
} from './pdfUtils';

export const drawCargoTable = async (
  doc: jsPDF,
  items: QuoteInput['items'],
  result: QuoteResult,
  yPos: number,
  packingType: PackingType = PackingType.NONE,
  volumetricDivisor: number = 5000,
): Promise<number> => {
  const autoTable = (await import('jspdf-autotable')).default;
  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('Cargo Manifest', MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Dimensions L×W×H (cm)', 'Weight (kg)', 'Qty', 'Vol. Weight (kg)']],
    body: items.map((item, i) => {
      const packed = applyPackingDimensions(
        item.length,
        item.width,
        item.height,
        item.weight,
        packingType,
      );
      const volWeight = ((packed.l * packed.w * packed.h) / volumetricDivisor) * item.quantity;
      return [
        i + 1,
        `${item.length} × ${item.width} × ${item.height}`,
        formatNum(item.weight),
        item.quantity,
        formatNumDec(volWeight),
      ];
    }),
    foot: [
      [
        { content: '', colSpan: 2 },
        `Actual: ${formatNum(result.totalActualWeight)} kg`,
        '',
        `Billable: ${formatNum(result.billableWeight)} kg`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.PRIMARY as [number, number, number],
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
      halign: 'center',
    },
    bodyStyles: { font: FONTS.FAMILY, fontSize: FONTS.SIZE_TABLE, halign: 'center' },
    footStyles: {
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
      fontStyle: 'bold',
      halign: 'center',
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  return getLastAutoTableY(doc) + 10;
};

const buildPackingRows = (
  bd: QuoteResult['breakdown'],
  fmtAmt: (v: number) => string,
): (string | number)[][] => {
  const total = bd.packingMaterial + bd.packingLabor + bd.packingFumigation + bd.handlingFees;
  if (total <= 0) return [];
  const rows: (string | number)[][] = [['Packing & Handling', fmtAmt(total)]];
  if (bd.packingMaterial > 0) rows.push(['  Material', fmtAmt(bd.packingMaterial)]);
  if (bd.packingLabor > 0) rows.push(['  Labor', fmtAmt(bd.packingLabor)]);
  if (bd.packingFumigation > 0) rows.push(['  Fumigation', fmtAmt(bd.packingFumigation)]);
  if (bd.handlingFees > 0) rows.push(['  Handling', fmtAmt(bd.handlingFees)]);
  return rows;
};

const buildSurchargeRows = (
  bd: QuoteResult['breakdown'],
  fmtAmt: (v: number) => string,
): (string | number)[][] => {
  if (bd.appliedSurcharges && bd.appliedSurcharges.length > 0) {
    const rows: (string | number)[][] = bd.appliedSurcharges.map((s) => {
      const suffix = s.chargeType === 'rate' ? ` (${s.amount}%)` : '';
      return [`  ${s.name}${suffix}`, fmtAmt(s.appliedAmount)];
    });
    if ((bd.intlManualSurge ?? 0) > 0) rows.push(['  Manual Surge', fmtAmt(bd.intlManualSurge!)]);
    return rows;
  }
  const rows: (string | number)[][] = [];
  if (bd.intlWarRisk > 0) rows.push(['War Risk Surcharge', fmtAmt(bd.intlWarRisk)]);
  if (bd.intlSurge > 0) rows.push(['Surcharge', fmtAmt(bd.intlSurge)]);
  return rows;
};

const buildAddonRows = (
  bd: QuoteResult['breakdown'],
  carrier: string,
  fmtAmt: (v: number) => string,
): (string | number)[][] => {
  if (!bd.carrierAddOnDetails || bd.carrierAddOnDetails.length === 0) return [];
  const rows: (string | number)[][] = [
    [`${carrier} Add-on Services`, fmtAmt(bd.carrierAddOnTotal || 0)],
  ];
  bd.carrierAddOnDetails.forEach((d) => {
    const fscNote = d.fscAmount > 0 ? ' +FSC' : '';
    rows.push([`  ${d.nameEn} (${d.code})${fscNote}`, fmtAmt(d.amount + d.fscAmount)]);
  });
  return rows;
};

export const drawCostTable = async (
  doc: jsPDF,
  result: QuoteResult,
  yPos: number,
  currency: CurrencyMode = 'both',
): Promise<number> => {
  const exchangeRate = result.totalQuoteAmount / result.totalQuoteAmountUSD;
  const fmtAmt = (krw: number) =>
    currency === 'usd' ? pdfFormatUSD(krw / exchangeRate) : pdfFormatKRW(krw);
  const amountHeader = currency === 'usd' ? 'Amount (USD)' : 'Amount (KRW)';
  const autoTable = (await import('jspdf-autotable')).default;

  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('Cost Breakdown', MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);

  const bd = result.breakdown;
  const rows: (string | number)[][] = [
    ...buildPackingRows(bd, fmtAmt),
    ...(bd.pickupInSeoul > 0 ? [['Seoul Pickup', fmtAmt(bd.pickupInSeoul)]] : []),
    [`International Freight (${result.carrier})`, fmtAmt(bd.intlBase)],
    ...(bd.intlFsc > 0 ? [['Fuel Surcharge (FSC)', fmtAmt(bd.intlFsc)]] : []),
    ...buildSurchargeRows(bd, fmtAmt),
    ...buildAddonRows(bd, result.carrier, fmtAmt),
    ...(bd.destDuty > 0 ? [['Duty & Tax (Est.)', fmtAmt(bd.destDuty)]] : []),
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Item', amountHeader]],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.PRIMARY as [number, number, number],
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
    },
    bodyStyles: { font: FONTS.FAMILY, fontSize: FONTS.SIZE_TABLE },
    columnStyles: { 0: { halign: 'left', cellWidth: 100 }, 1: { halign: 'right' } },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  return getLastAutoTableY(doc) + 8;
};

export const buildComparisonRows = (
  results: QuoteResult[],
  carriers: string[],
): { headRow: string[]; bodyRows: (string | number)[][] } => {
  const headRow = ['Item', ...carriers];
  const bodyRows: (string | number)[][] = [
    ['Zone', ...results.map((r) => r.appliedZone)],
    ['Transit Time', ...results.map((r) => r.transitTime)],
    ['Billable Weight (kg)', ...results.map((r) => formatNum(r.billableWeight))],
    [
      'Packing/Handling',
      ...results.map((r) =>
        pdfFormatKRW(
          r.breakdown.packingMaterial +
            r.breakdown.packingLabor +
            r.breakdown.packingFumigation +
            r.breakdown.handlingFees,
        ),
      ),
    ],
    [
      'International Freight',
      ...results.map((r) =>
        pdfFormatKRW(
          r.breakdown.intlBase +
            r.breakdown.intlFsc +
            r.breakdown.intlWarRisk +
            r.breakdown.intlSurge,
        ),
      ),
    ],
    ['Total Cost', ...results.map((r) => pdfFormatKRW(r.breakdown.totalCost))],
    ['Quote (KRW)', ...results.map((r) => pdfFormatKRW(r.totalQuoteAmount))],
    ['Quote (USD)', ...results.map((r) => pdfFormatUSD(r.totalQuoteAmountUSD))],
  ];
  return { headRow, bodyRows };
};

export const makeDidParseCell =
  (amounts: number[], minAmount: number) =>
  (data: import('jspdf-autotable').CellHookData): void => {
    if (data.row.index !== 6 || data.column.index === 0) return;
    const carrierIdx = data.column.index - 1;
    if (amounts[carrierIdx] === minAmount) {
      data.cell.styles.textColor = COLORS.PRIMARY;
      data.cell.styles.fontStyle = 'bold';
    }
  };
