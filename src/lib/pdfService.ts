import { jsPDF } from "jspdf";
import { QuoteInput, QuoteResult } from "@/types";
import { DOMESTIC_REGIONS } from "@/config/zones";
import { COUNTRY_OPTIONS } from "@/config/options";
import { PDF_LAYOUT } from "@/config/ui-constants";

const { COLORS, FONTS, MARGIN_X, LINE_HEIGHT } = PDF_LAYOUT;

const nextLine = (currentY: number, h = LINE_HEIGHT): number => currentY + h;

const drawHeader = (doc: jsPDF, yPos: number): number => {
  doc.setFontSize(FONTS.SIZE_HEADER);
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text("J-Ways Smart Quote", MARGIN_X, yPos);
  
  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  doc.text("Integrated Logistics Solution", 150, yPos);
  
  return nextLine(yPos, 15);
};

const drawMetaData = (doc: jsPDF, yPos: number): number => {
  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setTextColor(0);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, MARGIN_X, yPos);
  doc.text(`Quote Ref: JW-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, 150, yPos);
  return nextLine(yPos, 10);
};

const drawShipmentDetails = (doc: jsPDF, input: QuoteInput, yPos: number): number => {
  doc.setFillColor(...COLORS.BG_HEADER);
  doc.rect(15, yPos - 5, 180, 28, 'F');
  
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setFont("helvetica", "bold");
  doc.text("Shipment Details", MARGIN_X, yPos);
  yPos = nextLine(yPos, 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONTS.SIZE_NORMAL);
  
  const regionLabel = DOMESTIC_REGIONS.find(r => r.code === input.domesticRegionCode)?.label || input.domesticRegionCode;
  const countryLabel = COUNTRY_OPTIONS.find(c => c.code === input.destinationCountry)?.name || input.destinationCountry;

  doc.text(`Origin: ${input.originCountry} - ${regionLabel} (Pickup)`, MARGIN_X, yPos);
  doc.text(`Destination: ${countryLabel} (${input.destinationZip})`, 110, yPos);
  yPos = nextLine(yPos);
  doc.text(`Incoterm: ${input.incoterm}`, MARGIN_X, yPos);
  doc.text(`Packing: ${input.packingType}`, 110, yPos);
  return nextLine(yPos, 15);
};

const drawCargoManifest = (doc: jsPDF, items: QuoteInput['items'], result: QuoteResult, yPos: number): number => {
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setFont("helvetica", "bold");
  doc.text("Cargo Manifest", MARGIN_X, yPos);
  yPos = nextLine(yPos, 8);

  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setFont("helvetica", "normal");
  
  // Table Header
  doc.setFillColor(...COLORS.BG_TABLE);
  doc.rect(20, yPos - 4, 170, 8, 'F');
  doc.text("#", 25, yPos);
  doc.text("Dimensions (LxWxH)", 40, yPos);
  doc.text("Weight", 100, yPos);
  doc.text("Qty", 140, yPos);
  yPos = nextLine(yPos, 8);

  // Table Rows
  items.forEach((item, index) => {
    doc.text(`${index + 1}`, 25, yPos);
    doc.text(`${item.length} x ${item.width} x ${item.height} cm`, 40, yPos);
    doc.text(`${item.weight} kg`, 100, yPos);
    doc.text(`${item.quantity}`, 140, yPos);
    yPos = nextLine(yPos);
  });

  yPos = nextLine(yPos, 5);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Actual Weight: ${new Intl.NumberFormat('ko-KR').format(result.totalActualWeight)} kg`, 100, yPos);
  yPos = nextLine(yPos);
  doc.text(`Billable Weight: ${new Intl.NumberFormat('ko-KR').format(result.billableWeight)} kg`, 100, yPos);
  
  return nextLine(yPos, 15);
};

const drawCostBreakdown = (doc: jsPDF, result: QuoteResult, yPos: number): number => {
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Cost Breakdown", MARGIN_X, yPos);
  yPos = nextLine(yPos, 8);

  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setFont("helvetica", "normal");
  
  const formatKRW = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  // Domestic
  doc.text("Domestic Transport (ez):", MARGIN_X, yPos);
  doc.text(formatKRW(result.breakdown.domesticBase), 160, yPos, { align: 'right' });
  yPos = nextLine(yPos);

  if (result.breakdown.domesticSurcharge > 0) {
    doc.text("Island/Remote Surcharge:", MARGIN_X, yPos);
    doc.text(formatKRW(result.breakdown.domesticSurcharge), 160, yPos, { align: 'right' });
    yPos = nextLine(yPos);
  }

  // Packing
  const packingTotal = result.breakdown.packingMaterial + result.breakdown.packingLabor + result.breakdown.packingFumigation + result.breakdown.handlingFees;
  doc.text("Packing & Handling:", MARGIN_X, yPos);
  doc.text(formatKRW(packingTotal), 160, yPos, { align: 'right' });
  yPos = nextLine(yPos);

  // International
  const upsTotal = result.breakdown.upsBase + result.breakdown.upsFsc + result.breakdown.upsWarRisk + result.breakdown.upsSurge;
  doc.text("International Freight (UPS):", MARGIN_X, yPos);
  doc.text(formatKRW(upsTotal), 160, yPos, { align: 'right' });
  yPos = nextLine(yPos);

  // UPS Surge Detail (Only if applied)
  if (result.breakdown.upsSurge > 0) {
      doc.setTextColor(...COLORS.WARNING);
      doc.setFontSize(9);
      doc.text(`  ↳ Includes Demand/Surge Fees: ${formatKRW(result.breakdown.upsSurge)}`, MARGIN_X, yPos);
      doc.setFontSize(FONTS.SIZE_NORMAL);
      doc.setTextColor(0);
      yPos = nextLine(yPos);
  }

  // Duty
  if (result.breakdown.destDuty > 0) {
    doc.text("Destination Duty (Est.):", MARGIN_X, yPos);
    doc.text(formatKRW(result.breakdown.destDuty), 160, yPos, { align: 'right' });
    yPos = nextLine(yPos);
  }
  
  // Line
  doc.setDrawColor(200);
  doc.line(MARGIN_X, yPos, 160, yPos);
  return nextLine(yPos, 6);
};

const drawQuoteSummary = (doc: jsPDF, result: QuoteResult, yPos: number): number => {
  doc.setDrawColor(...COLORS.PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, yPos, 190, yPos);
  yPos = nextLine(yPos, 10);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.PRIMARY);
  doc.text("Total Estimated Quote", MARGIN_X, yPos);
  yPos = nextLine(yPos, 10);

  doc.setFontSize(24);
  doc.setTextColor(0);
  doc.text(new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(result.totalQuoteAmount), MARGIN_X, yPos);
  
  doc.setFontSize(FONTS.SIZE_SUBHEADER);
  doc.setTextColor(...COLORS.TEXT_LIGHT);
  doc.text(`(approx. ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(result.totalQuoteAmountUSD)})`, 100, yPos);
  
  yPos = nextLine(yPos, 15);

  // --- Service Level ---
  doc.setFontSize(FONTS.SIZE_NORMAL);
  doc.setTextColor(50);
  doc.text(`Service Level: UPS International (Door-to-Door)`, MARGIN_X, yPos);
  yPos = nextLine(yPos);
  doc.text(`Applied Zone: ${result.appliedZone}`, MARGIN_X, yPos);
  yPos = nextLine(yPos);
  doc.text(`Transit Time: ${result.transitTime}`, MARGIN_X, yPos);
  
  return nextLine(yPos, 15);
};

const drawWarnings = (doc: jsPDF, warnings: string[], yPos: number): number => {
  if (warnings.length > 0) {
    doc.setTextColor(...COLORS.WARNING);
    doc.setFont("helvetica", "bold");
    doc.text("Notice / Warnings:", MARGIN_X, yPos);
    yPos = nextLine(yPos, 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    warnings.forEach(w => {
      doc.text(`• ${w}`, MARGIN_X, yPos);
      yPos = nextLine(yPos, 5);
    });
    yPos = nextLine(yPos, 5); // Extra space after warnings
  }
  return yPos;
};

const drawFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(FONTS.SIZE_SMALL);
  doc.setTextColor(150);
  doc.text("This quote is an estimate based on provided dimensions and is subject to change upon final measurement.", MARGIN_X, pageHeight - 20);
  doc.text("© 2025 J-Ways Co., Ltd.", MARGIN_X, pageHeight - 15);
};


export const generatePDF = (input: QuoteInput, result: QuoteResult) => {
  const doc = new jsPDF();
  let yPos = 20;

  yPos = drawHeader(doc, yPos);
  yPos = drawMetaData(doc, yPos);
  yPos = drawShipmentDetails(doc, input, yPos);
  yPos = drawCargoManifest(doc, input.items, result, yPos);
  yPos = drawCostBreakdown(doc, result, yPos);
  yPos = drawQuoteSummary(doc, result, yPos);
  drawWarnings(doc, result.warnings, yPos);
  
  drawFooter(doc);

  doc.save("jways_smart_quote.pdf");
};