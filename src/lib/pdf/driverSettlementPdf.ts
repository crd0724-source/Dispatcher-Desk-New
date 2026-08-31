import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoadWithRelations } from '../../modules/loads/loadTypes.ts';
import { AccessorialClaim } from '../../modules/accessorials/accessorialTypes.ts';
import { Organization, Driver } from '../../types/domain.types.ts';
import {
  createStandardPdf,
  drawDocumentHeader,
  addDocumentFooters,
  drawCardBox,
  PDF_COLORS,
  PDF_PAGE,
  formatCurrency,
  formatMiles,
  formatInTimezone,
} from './pdfTheme.ts';
import { estimateDriverPay } from '../calculations.ts';

export interface DriverSettlementPdfOptions {
  load: LoadWithRelations;
  driver?: Driver | LoadWithRelations['driver'] | null;
  accessorials?: AccessorialClaim[];
  organization?: Organization | null;
  settlementNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  operationalTimezone?: string;
  dispatcherTimezone?: string;
}

export function generateDriverSettlementPdf(options: DriverSettlementPdfOptions): jsPDF {
  const {
    load,
    driver = load.driver,
    accessorials = [],
    organization,
    settlementNumber = `SET-${load.load_number}`,
    operationalTimezone = 'America/Chicago',
    dispatcherTimezone = 'Asia/Kolkata',
  } = options;

  const doc = createStandardPdf();

  const orgName = organization?.name || load.client?.company_name || 'DispatcherDesk Fleet Operations';
  const mcDot = [
    organization?.mc_number ? `MC-${organization.mc_number}` : null,
    organization?.dot_number ? `DOT-${organization.dot_number}` : null,
  ].filter(Boolean).join(' | ');

  // 1. Render Header
  let startY = drawDocumentHeader(doc, {
    docTypeTitle: 'Driver Settlement',
    docSubtitle: 'Driver Compensation & Trip Earnings Statement',
    docNumber: settlementNumber,
    organizationName: orgName,
    mcDot: mcDot || undefined,
    operationalTimezone,
    dispatcherTimezone,
  });

  // 2. Driver & Employer Information (Two side-by-side cards)
  const cardWidth = (PDF_PAGE.contentWidth - 14) / 2;
  const cardHeight = 92;

  // Left Card: Driver Profile
  drawCardBox(doc, PDF_PAGE.marginLeft, startY, cardWidth, cardHeight, 'Driver Profile & Pay Agreement', PDF_COLORS.indigo);
  let cy = startY + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(driver?.full_name || 'Assigned Driver', PDF_PAGE.marginLeft + 8, cy);

  cy += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.text(`Phone: ${driver?.phone || '—'} | Email: ${driver?.email || '—'}`, PDF_PAGE.marginLeft + 8, cy);
  cy += 10;
  doc.text(`Driver Status: ${(driver?.status || 'available').toUpperCase()}`, PDF_PAGE.marginLeft + 8, cy);
  cy += 10;

  // Pay Structure formatting
  const payType = driver?.pay_type || 'percentage_gross';
  const payRate = driver?.pay_rate || 25;
  let payRateLabel = `${payRate}% of Gross Revenue`;
  if (payType === 'per_mile') payRateLabel = `$${payRate.toFixed(2)} per Mile (Loaded + DH)`;
  if (payType === 'flat_rate') payRateLabel = `${formatCurrency(payRate)} Flat per Load`;

  doc.text(`Compensation Agreement: ${payRateLabel}`, PDF_PAGE.marginLeft + 8, cy);
  cy += 10;
  doc.text(`Assigned Unit: Trk #${load.truck?.truck_number || 'Unit'} (${load.equipment_type.replace('_', ' ').toUpperCase()})`, PDF_PAGE.marginLeft + 8, cy);

  // Right Card: Employer / Carrier Fleet
  drawCardBox(doc, PDF_PAGE.marginLeft + cardWidth + 14, startY, cardWidth, cardHeight, 'Carrier Fleet / Employer', PDF_COLORS.slate800);
  cy = startY + 22;
  const rx = PDF_PAGE.marginLeft + cardWidth + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(load.client?.company_name || orgName, rx, cy);

  cy += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.text(`Dispatch Contact: ${load.client?.contact_name || 'Fleet Manager'}`, rx, cy);
  cy += 10;
  doc.text(`Phone: ${load.client?.contact_phone || '—'} | Email: ${load.client?.contact_email || '—'}`, rx, cy);
  cy += 10;
  doc.text(`Settlement Date: ${formatInTimezone(new Date().toISOString(), operationalTimezone, { includeTime: false })}`, rx, cy);
  cy += 10;
  doc.text(`Settlement Ref: ${settlementNumber}`, rx, cy);

  startY += cardHeight + 10;

  // 3. Dispatched Trip Summary Table
  const loadedMiles = load.loaded_miles || 0;
  const deadheadMiles = load.deadhead_miles || 0;
  const totalMiles = loadedMiles + deadheadMiles;
  const grossRate = Number(load.rate || 0);

  const tripData = [
    [
      load.load_number,
      `${load.origin_city}, ${load.origin_state} to ${load.dest_city}, ${load.dest_state}`,
      `${formatMiles(loadedMiles)} loaded + ${formatMiles(deadheadMiles)} DH (${formatMiles(totalMiles)} total)`,
      formatInTimezone(load.delivery_datetime, operationalTimezone, { includeTime: false }),
      formatCurrency(grossRate),
    ],
  ];

  autoTable(doc, {
    startY,
    head: [['Load #', 'Trip Lane (Origin ➔ Destination)', 'Mileage Breakdown', 'Delivery Date', 'Gross Freight']],
    body: tripData,
    theme: 'grid',
    headStyles: {
      fillColor: PDF_COLORS.slate800,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: PDF_COLORS.primaryDark,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 160 },
      2: { cellWidth: 140 },
      3: { cellWidth: 80 },
      4: { cellWidth: 90, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.slate50,
    },
    margin: { left: PDF_PAGE.marginLeft, right: PDF_PAGE.marginLeft },
  });

  startY = (doc as any).lastAutoTable.finalY + 12;

  // 4. Detailed Driver Earnings Breakdown
  // Calculate base compensation: use load.driver_pay if set, otherwise estimateDriverPay
  let calculatedBaseDriverPay = load.driver_pay;
  if (!calculatedBaseDriverPay || calculatedBaseDriverPay <= 0) {
    calculatedBaseDriverPay = estimateDriverPay(payType, payRate, grossRate, loadedMiles, deadheadMiles);
  }

  // Calculate driver accessorial reimbursements (e.g. lumper paid by driver, detention share)
  const driverReimbursements = accessorials.filter(
    (a) => a.load_id === load.id && (a.payment_method === 'driver_cash' || a.type === 'lumper' || a.type === 'scale_tickets')
  );
  const totalReimbursements = driverReimbursements.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  // Other driver deductions if recorded on the load
  const fuelExpenseDeduction = 0; // Fuel is generally company expense unless agreed
  const otherDeductions = Number(load.other_expenses || 0) > 0 && load.other_expenses !== undefined ? 0 : 0;

  const totalGrossEarnings = calculatedBaseDriverPay + totalReimbursements;
  const totalDeductions = fuelExpenseDeduction + otherDeductions;
  const netSettlementPayout = totalGrossEarnings - totalDeductions;

  const earningsRows: (string | number)[][] = [
    [
      'Base Trip Compensation',
      `${payRateLabel} (Gross: ${formatCurrency(grossRate)}, Miles: ${formatMiles(totalMiles)})`,
      formatCurrency(calculatedBaseDriverPay),
    ],
  ];

  driverReimbursements.forEach((acc) => {
    earningsRows.push([
      `Reimbursement: ${acc.type.replace('_', ' ').toUpperCase()}`,
      `${acc.description || 'Driver out-of-pocket receipt'} (Receipt #${acc.receipt_number || 'On File'})`,
      formatCurrency(acc.amount),
    ]);
  });

  if (totalDeductions > 0) {
    earningsRows.push([
      'Approved Advances / Deductions',
      'Fuel Advance / Operating Settlement Deductions',
      `-${formatCurrency(totalDeductions)}`,
    ]);
  }

  earningsRows.push([
    'NET DRIVER SETTLEMENT PAYOUT',
    'Total Payable Net Compensation for Dispatched Trip',
    formatCurrency(netSettlementPayout),
  ]);

  autoTable(doc, {
    startY,
    head: [['Earnings Item', 'Calculation Basis / Notes', 'Net Amount (USD)']],
    body: earningsRows,
    theme: 'grid',
    headStyles: {
      fillColor: PDF_COLORS.indigo,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: PDF_COLORS.primaryDark,
      cellPadding: 5.5,
    },
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold' },
      1: { cellWidth: 270 },
      2: { cellWidth: 110, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.slate50,
    },
    margin: { left: PDF_PAGE.marginLeft, right: PDF_PAGE.marginLeft },
  });

  startY = (doc as any).lastAutoTable.finalY + 12;

  // 5. Net Payout Summary Highlight Card
  drawCardBox(doc, PDF_PAGE.marginLeft, startY, PDF_PAGE.contentWidth, 48, 'Net Settlement Summary', PDF_COLORS.slate800);
  let hy = startY + 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.text(`Base Pay: ${formatCurrency(calculatedBaseDriverPay)}`, PDF_PAGE.marginLeft + 10, hy + 10);
  doc.text(`+ Reimbursements: ${formatCurrency(totalReimbursements)}`, PDF_PAGE.marginLeft + 150, hy + 10);
  doc.text(`- Deductions: ${formatCurrency(totalDeductions)}`, PDF_PAGE.marginLeft + 300, hy + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.indigo);
  doc.text(`NET PAYOUT: ${formatCurrency(netSettlementPayout)}`, PDF_PAGE.marginRight - 10, hy + 10, { align: 'right' });

  startY += 58;

  // 6. Driver Acknowledgement & Signatures
  const sigBoxWidth = (PDF_PAGE.contentWidth - 14) / 2;
  const sigBoxHeight = 52;

  // Left: Driver Sign-off
  drawCardBox(doc, PDF_PAGE.marginLeft, startY, sigBoxWidth, sigBoxHeight, 'Driver Acceptance');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.text('Driver Signature: _______________________________', PDF_PAGE.marginLeft + 8, startY + 34);
  doc.text('Date: ________________________', PDF_PAGE.marginLeft + 8, startY + 46);

  // Right: Carrier Approval
  drawCardBox(doc, PDF_PAGE.marginLeft + sigBoxWidth + 14, startY, sigBoxWidth, sigBoxHeight, 'Authorized Dispatch / Payroll');
  doc.text('Authorized By: _________________________________', PDF_PAGE.marginLeft + sigBoxWidth + 22, startY + 34);
  doc.text(`Date: ${formatInTimezone(new Date().toISOString(), operationalTimezone, { includeTime: false })}`, PDF_PAGE.marginLeft + sigBoxWidth + 22, startY + 46);

  // 7. Add Multi-Page Footers
  addDocumentFooters(doc, {
    documentRef: `Settlement-${settlementNumber}`,
    confidentialText: 'Driver Compensation & Settlement Agreement',
  });

  return doc;
}
