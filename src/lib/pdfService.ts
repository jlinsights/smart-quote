import type { jsPDF } from 'jspdf';
import { QuoteInput, QuoteResult } from '@/types';
import { COUNTRY_OPTIONS } from '@/config/options';
import { PDF_LAYOUT } from '@/config/ui-constants';
import { formatKRW, formatUSD, formatNum, formatNumDec } from './format';
import { loadKoreanFont } from './pdfFontLoader';
import logoBase64 from '@/assets/logo-base64';

/** Helper to access jspdf-autotable's lastAutoTable property (untyped) */
const getLastAutoTableY = (doc: jsPDF): number =>
  (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

const { COLORS, FONTS, MARGIN_X, PAGE_WIDTH } = PDF_LAYOUT;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const nextLine = (y: number, h = PDF_LAYOUT.LINE_HEIGHT): number => y + h;

// ─── Header ──────────────────────────────────────────────

const drawHeader = (doc: jsPDF, yPos: number, referenceNo?: string, validityDate?: string): number => {
  // Logo (left)
  doc.addImage(logoBase64, 'PNG', MARGIN_X, yPos - 8, PDF_LAYOUT.LOGO.WIDTH, PDF_LAYOUT.LOGO.HEIGHT);

  // Title (right)
  doc.setFontSize(FONTS.SIZE_TITLE);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('견적서 / Quotation', PAGE_WIDTH - MARGIN_X, yPos, { align: 'right' });

  yPos = nextLine(yPos, 16);

  // Separator line
  doc.setDrawColor(...COLORS.PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, yPos, PAGE_WIDTH - MARGIN_X, yPos);
  yPos = nextLine(yPos, 8);

  // Meta row
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  doc.text(`Date: ${new Date().toLocaleDateString('ko-KR')}`, MARGIN_X, yPos);
  const ref = referenceNo || 'DRAFT';
  doc.text(`Ref: ${ref}`, PAGE_WIDTH - MARGIN_X, yPos, { align: 'right' });

  if (validityDate) {
    yPos = nextLine(yPos, 5);
    doc.text(`Valid until: ${validityDate}`, MARGIN_X, yPos);
  }

  return nextLine(yPos, 12);
};

// ─── Shipment Details ────────────────────────────────────

const drawShipmentDetails = (doc: jsPDF, input: QuoteInput, yPos: number): number => {
  doc.setFillColor(...COLORS.BG_HEADER);
  doc.roundedRect(MARGIN_X, yPos - 5, CONTENT_WIDTH, 28, 2, 2, 'F');

  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setFont(FONTS.FAMILY, 'normal');
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('배송 정보 / Shipment Details', MARGIN_X + 5, yPos);
  yPos = nextLine(yPos, 9);

  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setTextColor(...COLORS.TEXT);

  const countryLabel = COUNTRY_OPTIONS.find(c => c.code === input.destinationCountry)?.name || input.destinationCountry;

  doc.text(`출발지: ${input.originCountry}`, MARGIN_X + 5, yPos);
  doc.text(`도착지: ${countryLabel} (${input.destinationZip || '-'})`, 110, yPos);
  yPos = nextLine(yPos);
  doc.text(`배송 방식: ${input.shippingMode || 'Door-to-Door'}`, MARGIN_X + 5, yPos);
  doc.text(`포장: ${input.packingType}`, 110, yPos);

  return nextLine(yPos, 15);
};

// ─── Cargo Manifest Table ────────────────────────────────

const drawCargoTable = async (doc: jsPDF, items: QuoteInput['items'], result: QuoteResult, yPos: number): Promise<number> => {
  const autoTable = (await import('jspdf-autotable')).default;

  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('화물 명세 / Cargo Manifest', MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);

  autoTable(doc, {
    startY: yPos,
    head: [['#', '규격 L×W×H (cm)', '중량 (kg)', '수량', '용적중량 (kg)']],
    body: items.map((item, i) => [
      i + 1,
      `${item.length} × ${item.width} × ${item.height}`,
      formatNum(item.weight),
      item.quantity,
      formatNumDec((item.length + 10) * (item.width + 10) * (item.height + 15) / 5000 * item.quantity),
    ]),
    foot: [[
      { content: '', colSpan: 2 },
      `실중량: ${formatNum(result.totalActualWeight)} kg`,
      '',
      `청구중량: ${formatNum(result.billableWeight)} kg`,
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.PRIMARY as [number, number, number],
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
      halign: 'center',
    },
    bodyStyles: {
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
      halign: 'center',
    },
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

// ─── Cost Breakdown Table ────────────────────────────────

const drawCostTable = async (doc: jsPDF, result: QuoteResult, yPos: number): Promise<number> => {
  const autoTable = (await import('jspdf-autotable')).default;

  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('비용 내역 / Cost Breakdown', MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);

  const bd = result.breakdown;
  const rows: (string | number)[][] = [];

  const packingTotal = bd.packingMaterial + bd.packingLabor + bd.packingFumigation + bd.handlingFees;
  if (packingTotal > 0) rows.push(['포장 / 핸들링', formatKRW(packingTotal)]);
  if (bd.pickupInSeoul > 0) rows.push(['서울 픽업비', formatKRW(bd.pickupInSeoul)]);
  rows.push([`국제운송 (${result.carrier})`, formatKRW(bd.intlBase)]);
  if (bd.intlFsc > 0) rows.push(['유류할증료 (FSC)', formatKRW(bd.intlFsc)]);
  // Individual surcharge rows from appliedSurcharges (V2)
  if (bd.appliedSurcharges && bd.appliedSurcharges.length > 0) {
    bd.appliedSurcharges.forEach((s) => {
      const label = s.nameKo || s.name;
      const suffix = s.chargeType === 'rate' ? ` (${s.amount}%)` : '';
      rows.push([`  ${label}${suffix}`, formatKRW(s.appliedAmount)]);
    });
    if ((bd.intlManualSurge ?? 0) > 0) {
      rows.push(['  수동 할증 (Manual Surge)', formatKRW(bd.intlManualSurge!)]);
    }
  } else {
    // Backward compat: single row for legacy quotes without appliedSurcharges
    if (bd.intlWarRisk > 0) rows.push(['전쟁위험할증', formatKRW(bd.intlWarRisk)]);
    if (bd.intlSurge > 0) rows.push(['할증료 (Surge)', formatKRW(bd.intlSurge)]);
  }
  if (bd.destDuty > 0) rows.push(['관세/세금 (예상)', formatKRW(bd.destDuty)]);

  autoTable(doc, {
    startY: yPos,
    head: [['항목', '금액 (KRW)']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.PRIMARY as [number, number, number],
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
    },
    bodyStyles: {
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 100 },
      1: { halign: 'right' },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  return getLastAutoTableY(doc) + 8;
};

// ─── Quote Summary Box ───────────────────────────────────

const drawQuoteSummary = (doc: jsPDF, input: QuoteInput, result: QuoteResult, yPos: number): number => {
  // Blue summary box
  doc.setFillColor(...COLORS.PRIMARY);
  doc.roundedRect(MARGIN_X, yPos, CONTENT_WIDTH, 35, 3, 3, 'F');

  doc.setTextColor(...COLORS.WHITE);
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.text('총 견적가 / Total Quote', MARGIN_X + 8, yPos + 10);

  doc.setFontSize(20);
  doc.text(formatKRW(result.totalQuoteAmount), MARGIN_X + 8, yPos + 23);

  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.text(`(≈ ${formatUSD(result.totalQuoteAmountUSD)})`, MARGIN_X + 8, yPos + 30);

  // Right side info
  const rightX = PAGE_WIDTH - MARGIN_X - 8;
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.text(`Carrier: ${result.carrier}`, rightX, yPos + 10, { align: 'right' });
  doc.text(`Zone: ${result.appliedZone}`, rightX, yPos + 17, { align: 'right' });
  doc.text(`Transit: ${result.transitTime}`, rightX, yPos + 24, { align: 'right' });
  doc.text(`Incoterm: ${input.incoterm}`, rightX, yPos + 31, { align: 'right' });

  return yPos + 45;
};

// ─── Warnings ────────────────────────────────────────────

const drawWarnings = (doc: jsPDF, warnings: string[], yPos: number): number => {
  if (warnings.length === 0) return yPos;

  doc.setTextColor(...COLORS.WARNING);
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.text('⚠ 주의사항 / Warnings:', MARGIN_X, yPos);
  yPos = nextLine(yPos, 5);

  warnings.forEach(w => {
    doc.text(`• ${w}`, MARGIN_X + 3, yPos);
    yPos = nextLine(yPos, 5);
  });

  return nextLine(yPos, 5);
};

// ─── Disclaimer ─────────────────────────────────────────

const drawDisclaimer = (doc: jsPDF, yPos: number): number => {
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);

  const disclaimerKo = '본 견적서는 유효기간 내 확인 기준이며, 할증료 변동 시 재산정될 수 있습니다.';
  const disclaimerEn = 'This quotation is valid within the stated period. Surcharges are subject to change at time of booking.';
  const rateDate = `Rates as of: ${new Date().toLocaleDateString('ko-KR')}`;

  doc.text(disclaimerKo, MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);
  doc.text(disclaimerEn, MARGIN_X, yPos);
  yPos = nextLine(yPos, 4);
  doc.text(rateDate, MARGIN_X, yPos);

  return nextLine(yPos, 6);
};

// ─── Footer ──────────────────────────────────────────────

const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.height;

  doc.setDrawColor(...COLORS.PRIMARY);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, pageHeight - 28, PAGE_WIDTH - MARGIN_X, pageHeight - 28);

  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  doc.text(
    '본 견적서는 제공된 규격 기준 추정치이며, 최종 실측 시 변경될 수 있습니다.',
    MARGIN_X,
    pageHeight - 22
  );
  doc.text(
    'This quote is an estimate based on provided dimensions and is subject to change upon final measurement.',
    MARGIN_X,
    pageHeight - 17
  );
  doc.text(`© ${new Date().getFullYear()} Goodman GLS / J-Ways Co., Ltd.`, MARGIN_X, pageHeight - 12);

  // Page number
  doc.text(
    `Page ${doc.getCurrentPageInfo().pageNumber}`,
    PAGE_WIDTH - MARGIN_X,
    pageHeight - 12,
    { align: 'right' }
  );
};

// ─── Build Filename ──────────────────────────────────────

const buildFilename = (prefix: string, referenceNo?: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  const ref = referenceNo || 'DRAFT';
  return `${prefix}_${ref}_${date}.pdf`;
};

// ─── Public: Generate Single Quote PDF ───────────────────

export const generatePDF = async (input: QuoteInput, result: QuoteResult, referenceNo?: string) => {
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF();

  await loadKoreanFont(doc);

  const validityDate = referenceNo
    ? new Date(Date.now() + 7 * 86400000).toLocaleDateString('ko-KR')
    : undefined;

  let yPos = 20;
  yPos = drawHeader(doc, yPos, referenceNo, validityDate);
  yPos = drawShipmentDetails(doc, input, yPos);
  yPos = await drawCargoTable(doc, input.items, result, yPos);
  yPos = await drawCostTable(doc, result, yPos);
  yPos = drawQuoteSummary(doc, input, result, yPos);
  yPos = drawWarnings(doc, result.warnings, yPos);
  drawDisclaimer(doc, yPos);
  drawFooter(doc);

  doc.save(buildFilename('JWays_Quote', referenceNo));
};

// ─── Public: Generate Carrier Comparison PDF ─────────────

export const generateComparisonPDF = async (
  input: QuoteInput,
  upsResult: QuoteResult,
  dhlResult: QuoteResult,
  emaxResult?: QuoteResult,
) => {
  const { jsPDF: JsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new JsPDF();

  await loadKoreanFont(doc);

  const comparisonValidityDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString('ko-KR');

  let yPos = 20;

  // Header
  yPos = drawHeader(doc, yPos, undefined, comparisonValidityDate);
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text('캐리어 비교 / Carrier Comparison Report', MARGIN_X, yPos);
  yPos = nextLine(yPos, 10);

  // Shipment info
  yPos = drawShipmentDetails(doc, input, yPos);
  yPos = await drawCargoTable(doc, input.items, upsResult, yPos);

  // Comparison table
  const carriers = emaxResult ? ['UPS', 'DHL', 'EMAX'] : ['UPS', 'DHL'];
  const results = emaxResult ? [upsResult, dhlResult, emaxResult] : [upsResult, dhlResult];
  const amounts = results.map(r => r.totalQuoteAmount);
  const minAmount = Math.min(...amounts);

  const headRow = ['항목', ...carriers];
  const bodyRows = [
    ['Zone', ...results.map(r => r.appliedZone)],
    ['Transit Time', ...results.map(r => r.transitTime)],
    ['청구중량 (kg)', ...results.map(r => formatNum(r.billableWeight))],
    ['포장/핸들링', ...results.map(r => formatKRW(
      r.breakdown.packingMaterial + r.breakdown.packingLabor + r.breakdown.packingFumigation + r.breakdown.handlingFees
    ))],
    ['국제운송', ...results.map(r => formatKRW(
      r.breakdown.intlBase + r.breakdown.intlFsc + r.breakdown.intlWarRisk + r.breakdown.intlSurge
    ))],
    ['총 비용', ...results.map(r => formatKRW(r.breakdown.totalCost))],
    ['견적가 (KRW)', ...results.map(r => formatKRW(r.totalQuoteAmount))],
    ['견적가 (USD)', ...results.map(r => formatUSD(r.totalQuoteAmountUSD))],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.PRIMARY as [number, number, number],
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
      halign: 'center',
    },
    bodyStyles: {
      font: FONTS.FAMILY,
      fontSize: FONTS.SIZE_TABLE,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (data: { row: { index: number }; column: { index: number }; cell: { styles: any } }) => {
      // Highlight cheapest carrier in the quote row
      if (data.row.index === 6 && data.column.index > 0) {
        const carrierIdx = data.column.index - 1;
        if (amounts[carrierIdx] === minAmount) {
          data.cell.styles.textColor = COLORS.PRIMARY;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });

  yPos = getLastAutoTableY(doc) + 10;

  // Savings note
  if (amounts.filter(a => a !== minAmount).length > 0) {
    const cheapestIdx = amounts.indexOf(minAmount);
    const expensiveAmount = Math.max(...amounts);
    const savings = expensiveAmount - minAmount;
    doc.setFontSize(FONTS.SIZE_NORMAL);
    doc.setTextColor(...COLORS.PRIMARY);
    doc.text(
      `→ ${carriers[cheapestIdx]}가 최저가: ${formatKRW(savings)} 절감 (≈ ${formatUSD(savings / input.exchangeRate)})`,
      MARGIN_X,
      yPos
    );
    yPos = nextLine(yPos, 10);
  }

  drawDisclaimer(doc, yPos);
  drawFooter(doc);
  doc.save(buildFilename('JWays_Comparison'));
};
