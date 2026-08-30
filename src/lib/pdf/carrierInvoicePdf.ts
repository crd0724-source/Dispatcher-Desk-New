import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoadWithRelations } from '../../modules/loads/loadTypes.ts';
import { AccessorialClaim } from '../../modules/accessorials/accessorialTypes.ts';
import { Organization } from '../../types/domain.types.ts';
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

export interface CarrierInvoicePdfOptions {
  load: LoadWithRelations;
  accessorials?: AccessorialClaim[];
  organization?: Organization | null;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  operationalTimezone?: string;
  dispatcherTimezone?: string;
}

export function generateCarrierInvoicePdf(options: CarrierInvoicePdfOptions): jsPDF {
  const {
    load,
    accessorials = [],
    organization,
    invoiceNumber = `INV-${load.load_number}`,
    invoiceDate = new Date().toISOString(),
    paymentTerms,
    operationalTimezone = 'America/Chicago',
    dispatcherTimezone = 'Asia/Kolkata',
  } = options;

  const doc = createStandardPdf();

  const orgName = organization?.name || load.client?.company_name || 'DispatcherDesk Fleet Operations';
  const mcDot = [
    organization?.mc_number ? `MC-${organization.mc_number}` : null,
    organization?.dot_number ? `DOT-${organization.dot_number}` : null,
  ].filter(Boolean).join(' | ');

  // Determine Payment Terms & Due Date
  const termsDays = load.broker?.payment_terms_days || 30;
  const termsLabel = paymentTerms || `${termsDays} Days Net`;
  
  const invDateObj = new Date(invoiceDate);
  const dueDateObj = options.dueDate
    ? new Date(options.dueDate)
    : new Date(invDateObj.getTime() + termsDays * 86400000);

  const formattedInvoiceDate = formatInTimezone(invoiceDate, operationalTimezone, { includeTime: false });
  const formattedDueDate = formatInTimezone(dueDateObj.toISOString(), operationalTimezone, { includeTime: false });

  // 1. Render Header
  let startY = drawDocumentHeader(doc, {
    docTypeTitle: 'Carrier Freight Invoice',
    docSubtitle: 'Commercial Freight Billing & Remittance Statement',
    docNumber: invoiceNumber,
    organizationName: orgName,
    mcDot: mcDot || undefined,
    operationalTimezone,
    dispatcherTimezone,
  });

  // 2. Invoice Meta & Bill To / Billed By Details
  const cardWidth = (PDF_PAGE.contentWidth - 14) / 2;
  const cardHeight = 92;

  // Left Card: Billed By (Carrier / Client)
  drawCardBox(doc, PDF_PAGE.marginLeft, startY, cardWidth, cardHeight, 'Billed By (Carrier / Dispatcher)', PDF_COLORS.indigo);
  let cy = startY + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(load.client?.company_name || orgName, PDF_PAGE.marginLeft + 8, cy);

  cy += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.text(`Contact: ${load.client?.contact_name || 'Billing Department'}`, PDF_PAGE.marginLeft + 8, cy);
  cy += 10;
  doc.text(`Phone: ${load.client?.contact_phone || '—'}`, PDF_PAGE.marginLeft + 8, cy);
  cy += 10;
  doc.text(`Remit Email: ${load.client?.contact_email || 'billing@dispatchdesk.com'}`, PDF_PAGE.marginLeft + 8, cy);
  cy += 10;
  doc.text(`Carrier Authority: ${load.client?.client_type === 'owner_operator' ? 'Owner Operator Authority' : 'Fleet Carrier'}`, PDF_PAGE.marginLeft + 8, cy);

  // Right Card: Bill To (Broker / Payer)
  drawCardBox(doc, PDF_PAGE.marginLeft + cardWidth + 14, startY, cardWidth, cardHeight, 'Bill To (Payer / Broker)', PDF_COLORS.slate800);
  cy = startY + 22;
  const rx = PDF_PAGE.marginLeft + cardWidth + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text(load.broker?.company_name || 'Freight Brokerage Payer', rx, cy);

  cy += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.slate600);
  const brokerAuth = [
    load.broker?.mc_number ? `MC: ${load.broker.mc_number}` : null,
    load.broker?.dot_number ? `DOT: ${load.broker.dot_number}` : null,
  ].filter(Boolean).join(' • ');
  doc.text(brokerAuth || 'Broker On File', rx, cy);
  cy += 10;
  doc.text(`Attention: Accounts Payable / ${load.broker?.contact_name || 'Billing Desk'}`, rx, cy);
  cy += 10;
  doc.text(`Phone: ${load.broker?.contact_phone || '—'} | Email: ${load.broker?.contact_email || '—'}`, rx, cy);
  cy += 10;
  doc.text(`Invoice Date: ${formattedInvoiceDate} | Due: ${formattedDueDate} (${termsLabel})`, rx, cy);

  startY += cardHeight + 10;

  // 3. Freight Service Reference Banner
  drawCardBox(doc, PDF_PAGE.marginLeft, startY, PDF_PAGE.contentWidth, 44, 'Freight Transportation Reference', PDF_COLORS.slate700);
  let fy = startY + 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  doc.setTextColor(...PDF_COLORS.slate500);
  doc.text('LOAD NUMBER:', PDF_PAGE.marginLeft + 8, fy);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.text(load.load_number, PDF_PAGE.marginLeft + 8, fy + 10);

  const col2 = PDF_PAGE.marginLeft + 110;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.slate500);
  doc.text('ROUTE LANE:', col2, fy);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.text(`${load.origin_city}, ${load.origin_state} ➔ ${load.dest_city}, ${load.dest_state}`, col2, fy + 10);

  const col3 = PDF_PAGE.marginLeft + 310;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.slate500);
  doc.text('COMPLETED DELIVERY:', col3, fy);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  const delDate = formatInTimezone(load.delivery_datetime, operationalTimezone, { includeTime: false });
  doc.text(delDate !== '—' ? delDate : 'Delivered & Verified', col3, fy + 10);

  const col4 = PDF_PAGE.marginLeft + 440;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.slate500);
  doc.text('EQUIPMENT / MILES:', col4, fy);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.text(`${load.equipment_type.replace('_', ' ').toUpperCase()} • ${formatMiles(load.loaded_miles)}`, col4, fy + 10);

  startY += 52;

  // 4. Itemized Invoicing Charges Table
  const baseRate = Number(load.rate || 0);

  // Relevant billable accessorials
  const billableAccessorials = accessorials.filter(
    (a) => a.load_id === load.id && (a.status === 'invoiced' || a.status === 'approved_on_rate_con' || a.status === 'submitted_to_broker')
  );

  const invoiceItems: (string | number)[][] = [
    [
      '1',
      `Linehaul Freight Transportation (Load #${load.load_number})`,
      `${load.origin_city}, ${load.origin_state} to ${load.dest_city}, ${load.dest_state} (${formatMiles(load.loaded_miles)})`,
      formatCurrency(baseRate),
    ],
  ];

  let itemNum = 2;
  let totalAccessorials = 0;

  billableAccessorials.forEach((acc) => {
    const accAmount = Number(acc.amount) || 0;
    totalAccessorials += accAmount;
    invoiceItems.push([
      String(itemNum++),
      `Accessorial: ${acc.type.replace('_', ' ').toUpperCase()}`,
      `${acc.description || 'Approved freight accessorial claim'}${acc.receipt_number ? ` (Receipt #${acc.receipt_number})` : ''}`,
      formatCurrency(accAmount),
    ]);
  });

  const totalInvoiceAmount = baseRate + totalAccessorials;

  autoTable(doc, {
    startY,
    head: [['#', 'Item Description', 'Details / Supporting Documentation', 'Amount (USD)']],
    body: invoiceItems,
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
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 175, fontStyle: 'bold' },
      2: { cellWidth: 240 },
      3: { cellWidth: 100, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.slate50,
    },
    margin: { left: PDF_PAGE.marginLeft, right: PDF_PAGE.marginLeft },
  });

  startY = (doc as any).lastAutoTable.finalY + 12;

  // 5. Total Balance & Factoring Notice (Two column layout)
  const leftWidth = 320;
  const rightWidth = PDF_PAGE.contentWidth - leftWidth - 14;

  // Left: Factoring Notice / Remittance Instructions
  drawCardBox(doc, PDF_PAGE.marginLeft, startY, leftWidth, 80, 'Notice of Assignment & Remittance Instructions', PDF_COLORS.slate800);
  let ry = startY + 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.slate700);

  const remitText =
    'NOTICE OF ASSIGNMENT: This invoice and the right to receive payment have been assigned to our authorized factoring provider. Please remit electronic ACH/wire payment directly according to the Notice of Assignment on file, or mail check referencing this invoice number.';
  const splitRemit = doc.splitTextToSize(remitText, leftWidth - 16);
  doc.text(splitRemit, PDF_PAGE.marginLeft + 8, ry);
  ry += 32;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text('Payment Queries: billing@dispatchdesk.com', PDF_PAGE.marginLeft + 8, ry);

  // Right: Financial Summary Box
  drawCardBox(doc, PDF_PAGE.marginLeft + leftWidth + 14, startY, rightWidth, 80, 'Invoice Summary', PDF_COLORS.indigo);
  let sy = startY + 22;
  const sX = PDF_PAGE.marginLeft + leftWidth + 22;
  const sRight = PDF_PAGE.marginRight - 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.text('Linehaul Subtotal:', sX, sy);
  doc.text(formatCurrency(baseRate), sRight, sy, { align: 'right' });

  sy += 12;
  doc.text('Accessorial Charges:', sX, sy);
  doc.text(formatCurrency(totalAccessorials), sRight, sy, { align: 'right' });

  sy += 14;
  doc.setDrawColor(...PDF_COLORS.slate200);
  doc.line(sX, sy - 4, sRight, sy - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.text('TOTAL DUE:', sX, sy + 6);
  doc.setTextColor(...PDF_COLORS.indigo);
  doc.text(formatCurrency(totalInvoiceAmount), sRight, sy + 6, { align: 'right' });

  startY += 90;

  // 6. Billing Authorization Sign-off
  drawCardBox(doc, PDF_PAGE.marginLeft, startY, PDF_PAGE.contentWidth, 42, 'Authorized Billing Desk Sign-off');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.text('Authorized By: ____________________________________', PDF_PAGE.marginLeft + 8, startY + 30);
  doc.text(`Date Processed: ${formattedInvoiceDate}`, PDF_PAGE.marginLeft + 310, startY + 30);

  // 7. Add Multi-Page Footers
  addDocumentFooters(doc, {
    documentRef: `Invoice-${invoiceNumber}`,
    confidentialText: 'Official Commercial Freight Invoice',
  });

  return doc;
}
