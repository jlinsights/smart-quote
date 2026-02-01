import { jsPDF } from "jspdf";
import { QuoteInput, QuoteResult } from "../types";
import { DOMESTIC_REGIONS, COUNTRY_OPTIONS } from "../constants";

export const generatePDF = (input: QuoteInput, result: QuoteResult) => {
  const doc = new jsPDF();
  const lineHeight = 7;
  let yPos = 20;

  // Helper to advance cursor
  const nextLine = (h = lineHeight) => { yPos += h; };

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(2, 132, 199); // Blue
  doc.text("Goodman GLS Smart Quote", 20, yPos);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Integrated Logistics Solution", 140, yPos);
  
  nextLine(15);

  // --- Meta Data ---
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
  doc.text(`Quote Ref: GM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, 150, yPos);
  nextLine(10);

  // --- Route & Terms ---
  doc.setFillColor(240, 249, 255);
  doc.rect(15, yPos - 5, 180, 28, 'F');
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Shipment Details", 20, yPos);
  nextLine(8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const regionLabel = DOMESTIC_REGIONS.find(r => r.code === input.domesticRegionCode)?.label || input.domesticRegionCode;
  const countryLabel = COUNTRY_OPTIONS.find(c => c.code === input.destinationCountry)?.name || input.destinationCountry;

  // Origin display
  doc.text(`Origin: ${input.originCountry} - ${regionLabel} (Pickup)`, 20, yPos);
  doc.text(`Destination: ${countryLabel} (${input.destinationZip})`, 110, yPos);
  nextLine();
  doc.text(`Incoterm: ${input.incoterm}`, 20, yPos);
  doc.text(`Packing: ${input.packingType}`, 110, yPos);
  nextLine(15);

  // --- Cargo Details ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cargo Manifest", 20, yPos);
  nextLine(8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Table Header
  doc.setFillColor(245, 245, 245);
  doc.rect(20, yPos - 4, 170, 8, 'F');
  doc.text("#", 25, yPos);
  doc.text("Dimensions (LxWxH)", 40, yPos);
  doc.text("Weight", 100, yPos);
  doc.text("Qty", 140, yPos);
  nextLine(8);

  // Table Rows
  input.items.forEach((item, index) => {
    doc.text(`${index + 1}`, 25, yPos);
    doc.text(`${item.length} x ${item.width} x ${item.height} cm`, 40, yPos);
    doc.text(`${item.weight} kg`, 100, yPos);
    doc.text(`${item.quantity}`, 140, yPos);
    nextLine();
  });

  nextLine(5);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Actual Weight: ${new Intl.NumberFormat('ko-KR').format(result.totalActualWeight)} kg`, 100, yPos);
  nextLine();
  doc.text(`Billable Weight: ${new Intl.NumberFormat('ko-KR').format(result.billableWeight)} kg`, 100, yPos);
  
  nextLine(15);

  // --- Cost Breakdown ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Cost Breakdown", 20, yPos);
  nextLine(8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const formatKRW = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  // Domestic
  doc.text("Domestic Transport (ez):", 20, yPos);
  doc.text(formatKRW(result.breakdown.domesticBase), 160, yPos, { align: 'right' });
  nextLine();

  if (result.breakdown.domesticSurcharge > 0) {
    doc.text("Island/Remote Surcharge:", 20, yPos);
    doc.text(formatKRW(result.breakdown.domesticSurcharge), 160, yPos, { align: 'right' });
    nextLine();
  }

  // Packing
  const packingTotal = result.breakdown.packingMaterial + result.breakdown.packingLabor + result.breakdown.packingFumigation + result.breakdown.handlingFees;
  doc.text("Packing & Handling:", 20, yPos);
  doc.text(formatKRW(packingTotal), 160, yPos, { align: 'right' });
  nextLine();

  // International
  const upsTotal = result.breakdown.upsBase + result.breakdown.upsFsc + result.breakdown.upsWarRisk + result.breakdown.upsSurge;
  doc.text("International Freight (UPS):", 20, yPos);
  doc.text(formatKRW(upsTotal), 160, yPos, { align: 'right' });
  nextLine();

  // UPS Surge Detail (Only if applied)
  if (result.breakdown.upsSurge > 0) {
      doc.setTextColor(180, 83, 9);
      doc.setFontSize(9);
      doc.text(`  ↳ Includes Demand/Surge Fees: ${formatKRW(result.breakdown.upsSurge)}`, 20, yPos);
      doc.setFontSize(10);
      doc.setTextColor(0);
      nextLine();
  }

  // Duty
  if (result.breakdown.destDuty > 0) {
    doc.text("Destination Duty (Est.):", 20, yPos);
    doc.text(formatKRW(result.breakdown.destDuty), 160, yPos, { align: 'right' });
    nextLine();
  }
  
  // Line
  doc.setDrawColor(200);
  doc.line(20, yPos, 160, yPos);
  nextLine(6);

  // --- Quote Summary ---
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  nextLine(10);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(2, 132, 199);
  doc.text("Total Estimated Quote", 20, yPos);
  nextLine(10);

  doc.setFontSize(24);
  doc.setTextColor(0);
  doc.text(new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(result.totalQuoteAmount), 20, yPos);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`(approx. ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(result.totalQuoteAmountUSD)})`, 100, yPos);
  
  nextLine(15);

  // --- Service Level ---
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Service Level: UPS International (Door-to-Door)`, 20, yPos);
  nextLine();
  doc.text(`Applied Zone: ${result.appliedZone}`, 20, yPos);
  nextLine();
  doc.text(`Transit Time: ${result.transitTime}`, 20, yPos);
  
  nextLine(15);
  
  // --- Warnings ---
  if (result.warnings.length > 0) {
    doc.setTextColor(180, 83, 9); // Amber
    doc.setFont("helvetica", "bold");
    doc.text("Notice / Warnings:", 20, yPos);
    nextLine(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    result.warnings.forEach(w => {
      doc.text(`• ${w}`, 20, yPos);
      nextLine(5);
    });
    nextLine(10);
  }

  // --- Footer ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("This quote is an estimate based on provided dimensions and is subject to change upon final measurement.", 20, pageHeight - 20);
  doc.text("© 2025 Goodman GLS.", 20, pageHeight - 15);

  doc.save("goodman_gls_quote.pdf");
};