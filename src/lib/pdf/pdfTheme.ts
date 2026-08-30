import jsPDF from 'jspdf';
import { formatInTimezone, formatDualTime } from '../timezones.ts';
import { formatCurrency, formatMiles, formatRPM } from '../calculations.ts';

export interface PdfThemeColors {
  primaryDark: [number, number, number];
  slate800: [number, number, number];
  slate700: [number, number, number];
  slate600: [number, number, number];
  slate500: [number, number, number];
  slate400: [number, number, number];
  slate200: [number, number, number];
  slate100: [number, number, number];
  slate50: [number, number, number];
  indigo: [number, number, number];
  indigoLight: [number, number, number];
  emerald: [number, number, number];
  emeraldLight: [number, number, number];
  amber: [number, number, number];
  amberLight: [number, number, number];
  rose: [number, number, number];
  roseLight: [number, number, number];
}

export const PDF_COLORS: PdfThemeColors = {
  primaryDark: [15, 23, 42],    // #0f172a Slate 900
  slate800: [30, 41, 59],       // #1e293b Slate 800
  slate700: [51, 65, 85],       // #334155 Slate 700
  slate600: [71, 85, 105],      // #475569 Slate 600
  slate500: [100, 116, 139],    // #64748b Slate 500
  slate400: [148, 163, 184],    // #94a3b8 Slate 400
  slate200: [226, 232, 240],    // #e2e8f0 Slate 200
  slate100: [241, 245, 249],    // #f1f5f9 Slate 100
  slate50: [248, 250, 252],     // #f8fafc Slate 50
  indigo: [79, 70, 229],        // #4f46e5 Indigo 600
  indigoLight: [238, 242, 255], // #eef2ff Indigo 50
  emerald: [16, 185, 129],      // #10b981 Emerald 500
  emeraldLight: [236, 253, 245],// #ecfdf5 Emerald 50
  amber: [217, 119, 6],         // #d97706 Amber 600
  amberLight: [254, 243, 199],  // #fef3c7 Amber 50
  rose: [225, 29, 72],          // #e11d48 Rose 600
  roseLight: [255, 241, 242],   // #fff1f2 Rose 50
};

export const PDF_PAGE = {
  width: 612,     // US Letter width in points (8.5 inches * 72)
  height: 792,    // US Letter height in points (11 inches * 72)
  marginLeft: 36, // 0.5 inch margin
  marginRight: 576,
  marginTop: 36,
  marginBottom: 756,
  contentWidth: 540, // 612 - 72
};

/**
 * Creates a standard jsPDF instance initialized with US Letter portrait geometry
 */
export function createStandardPdf(): jsPDF {
  return new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
    compress: true,
  });
}

/**
 * Draws a standardized header bar with DispatcherDesk logo badge and document metadata
 */
export function drawDocumentHeader(
  doc: jsPDF,
  options: {
    docTypeTitle: string;
    docSubtitle?: string;
    docNumber?: string;
    organizationName?: string;
    mcDot?: string;
    generatedAt?: string;
    operationalTimezone?: string;
    dispatcherTimezone?: string;
  }
): number {
  const {
    docTypeTitle,
    docSubtitle,
    docNumber,
    organizationName = 'DispatcherDesk Fleet Operations',
    mcDot,
    generatedAt = new Date().toISOString(),
    operationalTimezone = 'America/Chicago',
    dispatcherTimezone = 'Asia/Kolkata',
  } = options;

  let y = PDF_PAGE.marginTop;

  // Background Accent Brand Top Bar
  doc.setFillColor(...PDF_COLORS.indigo);
  doc.rect(PDF_PAGE.marginLeft, y, PDF_PAGE.contentWidth, 4, 'F');
  y += 14;

  // DispatchDesk Brand Tag + Org Name
  doc.setFillColor(...PDF_COLORS.slate800);
  doc.roundedRect(PDF_PAGE.marginLeft, y - 2, 90, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DISPATCHERDESK', PDF_PAGE.marginLeft + 6, y + 9);

  // Organization Name
  doc.setTextColor(...PDF_COLORS.primaryDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(organizationName, PDF_PAGE.marginLeft + 98, y + 10);

  // Right Side: Document Type Title Badge
  doc.setTextColor(...PDF_COLORS.indigo);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(docTypeTitle.toUpperCase(), PDF_PAGE.marginRight, y + 6, { align: 'right' });

  // Document Number on Right
  if (docNumber) {
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(docNumber, PDF_PAGE.marginRight, y + 19, { align: 'right' });
  }

  y += 24;

  // MC/DOT & Subtitle
  doc.setTextColor(...PDF_COLORS.slate600);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const orgSubtext = [
    mcDot ? `Authority: ${mcDot}` : null,
    docSubtitle || null,
  ].filter(Boolean).join(' • ');

  if (orgSubtext) {
    doc.text(orgSubtext, PDF_PAGE.marginLeft, y);
  }

  // Dual Timestamp on right
  const dualTime = formatDualTime(generatedAt, operationalTimezone, dispatcherTimezone);
  doc.setTextColor(...PDF_COLORS.slate500);
  doc.setFontSize(8);
  doc.text(
    `Generated: ${dualTime.primary} (${dualTime.secondary})`,
    PDF_PAGE.marginRight,
    y,
    { align: 'right' }
  );

  y += 12;

  // Subtle separator line
  doc.setDrawColor(...PDF_COLORS.slate200);
  doc.setLineWidth(0.75);
  doc.line(PDF_PAGE.marginLeft, y, PDF_PAGE.marginRight, y);

  return y + 14;
}

/**
 * Draws standard page numbering and footer across all pages
 */
export function addDocumentFooters(
  doc: jsPDF,
  options: {
    documentRef?: string;
    confidentialText?: string;
  } = {}
) {
  const pageCount = doc.getNumberOfPages();
  const {
    documentRef = 'DispatcherDesk Operational Document',
    confidentialText = 'Confidential — For Authorized Freight Operations & Billing Only',
  } = options;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const y = PDF_PAGE.marginBottom + 12;

    // Divider Line
    doc.setDrawColor(...PDF_COLORS.slate200);
    doc.setLineWidth(0.5);
    doc.line(PDF_PAGE.marginLeft, y - 6, PDF_PAGE.marginRight, y - 6);

    // Left: Document Ref & Confidential notice
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.slate500);
    doc.text(`${documentRef} • ${confidentialText}`, PDF_PAGE.marginLeft, y + 4);

    // Right: Page X of Y
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.slate600);
    doc.text(`Page ${i} of ${pageCount}`, PDF_PAGE.marginRight, y + 4, { align: 'right' });
  }
}

/**
 * Draws a clean card / container box with optional header title
 */
export function drawCardBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  title?: string,
  accentColor: [number, number, number] = PDF_COLORS.slate800
): number {
  // Card background
  doc.setFillColor(...PDF_COLORS.slate50);
  doc.setDrawColor(...PDF_COLORS.slate200);
  doc.setLineWidth(0.75);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');

  if (title) {
    // Header strip
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, width, 16, 4, 4, 'F');
    // Square off bottom of header strip
    doc.rect(x, y + 10, width, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title.toUpperCase(), x + 8, y + 11);
  }

  return y + (title ? 22 : 6);
}

export { formatCurrency, formatMiles, formatRPM, formatInTimezone, formatDualTime };
