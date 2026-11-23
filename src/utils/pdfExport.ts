import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SchoolSettings } from '../types/erp';

export interface PdfSummaryItem {
  label: string;
  value: string;
  tone?: 'teal' | 'emerald' | 'rose' | 'slate';
}

export interface TablePdfOptions {
  title: string;
  subtitle?: string;
  filename: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  settings: SchoolSettings;
  campusName: string;
  generatedDate: string;
  summaryCards?: PdfSummaryItem[];
  orientation?: 'portrait' | 'landscape';
}

export function exportTableToPdf(options: TablePdfOptions): void {
  const {
    title,
    subtitle,
    filename,
    headers,
    rows,
    settings,
    campusName,
    generatedDate,
    summaryCards = [],
    orientation,
  } = options;

  const dir: 'portrait' | 'landscape' = orientation || (headers.length > 6 ? 'landscape' : 'portrait');
  const doc = new jsPDF({ orientation: dir, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  // Top dark-teal branded letterhead bar
  doc.setFillColor(15, 118, 110); // teal-700
  doc.rect(0, 0, pageWidth, 82, 'F');

  // Emblem badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 18, 44, 44, 8, 8, 'F');
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((settings.shortCode || 'IS').slice(0, 3), margin + 22, 45, { align: 'center' });

  // School Name & Contact
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text((settings.schoolName || 'Iqra School').toUpperCase(), margin + 58, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const contactLine = [settings.address, settings.phone, settings.website].filter(Boolean).join('  ·  ');
  doc.text(contactLine || 'Official School ERP Export', margin + 58, 50);
  doc.text(`Session: ${settings.sessionName}  ·  Campus: ${campusName}`, margin + 58, 63);

  // Right report title metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, pageWidth - margin, 36, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 51, { align: 'right' });
  doc.text(`Records: ${rows.length}`, pageWidth - margin, 64, { align: 'right' });

  let cursorY = 100;

  if (subtitle) {
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(subtitle, margin, cursorY);
    cursorY += 16;
  }

  // Optional KPI summary strip
  if (summaryCards.length > 0) {
    const gap = 10;
    const cardW = (pageWidth - margin * 2 - gap * (summaryCards.length - 1)) / summaryCards.length;
    summaryCards.forEach((card, idx) => {
      const x = margin + idx * (cardW + gap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, cursorY, cardW, 42, 6, 6, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(card.label.toUpperCase(), x + 10, cursorY + 15);

      if (card.tone === 'emerald') doc.setTextColor(4, 120, 87);
      else if (card.tone === 'rose') doc.setTextColor(190, 18, 60);
      else if (card.tone === 'teal') doc.setTextColor(15, 118, 110);
      else doc.setTextColor(15, 23, 42);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(String(card.value), x + 10, cursorY + 32);
    });
    cursorY += 56;
  }

  autoTable(doc, {
    startY: cursorY,
    head: [headers],
    body: rows.map((r) => r.map((cell) => String(cell ?? '—'))),
    margin: { left: margin, right: margin, bottom: 48 },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [17, 94, 89], // teal-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: () => {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        settings.receiptFooterNote || 'Official Institution Record · Generated from School ERP',
        margin,
        pageHeight - 18
      );
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export interface CertificatePdfOptions {
  settings: SchoolSettings;
  certTitle: string;
  refCode: string;
  issuedDate: string;
  recipientHeading: string;
  bodyParagraphs: string[];
  detailsGrid: Array<{ label: string; value: string }>;
  remarks?: string;
  leftSignLabel: string;
  rightSignLabel: string;
  papersTable?: Array<{ code: string; subject: string; maxMarks: string | number }>;
  filename: string;
}

export function exportCertificatePdf(options: CertificatePdfOptions): void {
  const {
    settings,
    certTitle,
    refCode,
    issuedDate,
    recipientHeading,
    bodyParagraphs,
    detailsGrid,
    remarks,
    leftSignLabel,
    rightSignLabel,
    papersTable,
    filename,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Outer formal border (Teal + Gold accent double frame)
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(3);
  doc.rect(22, 22, w - 44, h - 44);
  doc.setDrawColor(217, 119, 6); // amber-600 gold accent
  doc.setLineWidth(1);
  doc.rect(30, 30, w - 60, h - 60);

  // Corner ornamental squares
  const corners: Array<[number, number]> = [
    [22, 22],
    [w - 34, 22],
    [22, h - 34],
    [w - 34, h - 34],
  ];
  doc.setFillColor(15, 118, 110);
  for (const [cx, cy] of corners) {
    doc.rect(cx, cy, 12, 12, 'F');
  }

  // Subtle diagonal watermark
  doc.setTextColor(241, 245, 249);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(46);
  doc.text((settings.shortCode || 'IS').toUpperCase(), w / 2, h / 2 + 20, {
    align: 'center',
    angle: 30,
  });

  // Top Institution Header
  doc.setFillColor(15, 118, 110);
  doc.circle(w / 2, 74, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((settings.shortCode || 'IS').slice(0, 3), w / 2, 80, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text((settings.schoolName || 'Iqra School').toUpperCase(), w / 2, 120, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text(settings.tagline || 'Excellence in Character & Modern Education', w / 2, 136, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${settings.address}  ·  ${settings.phone}`, w / 2, 151, { align: 'center' });

  // Reference & Date strip
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.75);
  doc.line(54, 166, w - 54, 166);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text(`REF: ${refCode}`, 56, 180);
  doc.setTextColor(71, 85, 105);
  doc.text(`ISSUED: ${issuedDate}`, w - 56, 180, { align: 'right' });

  // Certificate Title Banner
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(15, 118, 110);
  doc.roundedRect(70, 198, w - 140, 34, 6, 6, 'FD');
  doc.setTextColor(17, 94, 89);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(certTitle.toUpperCase(), w / 2, 220, { align: 'center' });

  // Recipient heading
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(recipientHeading, w / 2, 256, { align: 'center' });

  let y = 278;

  // Body paragraphs
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85);
  for (const para of bodyParagraphs) {
    const lines = doc.splitTextToSize(para, w - 120) as string[];
    doc.text(lines, 60, y, { lineHeightFactor: 1.45 });
    y += lines.length * 15 + 8;
  }

  // Structured details grid box
  if (detailsGrid.length > 0) {
    const boxRows = Math.ceil(detailsGrid.length / 2);
    const boxH = boxRows * 24 + 16;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(56, y, w - 112, boxH, 8, 8, 'FD');

    detailsGrid.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cellX = 70 + col * ((w - 140) / 2);
      const cellY = y + 20 + row * 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${item.label}:`, cellX, cellY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(item.value, cellX + 82, cellY);
    });
    y += boxH + 16;
  }

  // Optional subjects/papers table (Admit Card)
  if (papersTable && papersTable.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Subject Paper', 'Max Marks', 'Invigilator Sign']],
      body: papersTable.map((p) => [p.code, p.subject, String(p.maxMarks), '______________']),
      margin: { left: 56, right: 56 },
      styles: { fontSize: 9, cellPadding: 6, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 110) + 16;
  }

  if (remarks) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Remarks / Conduct:', 60, y);
    doc.setFont('helvetica', 'normal');
    const rLines = doc.splitTextToSize(remarks, w - 180) as string[];
    doc.text(rLines, 165, y);
  }

  // Bottom Signatures & Official Seal Stamp
  const sigY = h - 98;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.line(64, sigY, 200, sigY);
  doc.line(w - 200, sigY, w - 64, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(leftSignLabel, 132, sigY + 15, { align: 'center' });
  doc.text(rightSignLabel, w - 132, sigY + 15, { align: 'center' });

  // Center circular seal stamp
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(1.2);
  doc.circle(w / 2, sigY - 12, 26);
  doc.setFontSize(6.5);
  doc.setTextColor(15, 118, 110);
  doc.text('VERIFIED', w / 2, sigY - 14, { align: 'center' });
  doc.text(settings.shortCode || 'OFFICIAL', w / 2, sigY - 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    settings.receiptFooterNote || 'Official Institution Record · Verified Digital Document',
    w / 2,
    h - 42,
    { align: 'center' }
  );

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export interface AdmissionFormPdfOptions {
  settings: SchoolSettings;
  campusName: string;
  formTitle: string;
  refCode: string;
  appliedDate: string;
  statusLabel: string;
  studentName: string;
  fatherName: string;
  gender: string;
  dob: string;
  classLabel: string;
  rollOrCode?: string;
  phone: string;
  email?: string;
  cnic?: string;
  bFormNo?: string;
  bloodGroup?: string;
  address?: string;
  previousSchool?: string;
  monthlyFee?: string;
  notes?: string;
  filename: string;
}

export async function exportAdmissionFormPdf(options: AdmissionFormPdfOptions): Promise<void> {
  const QRCode = (await import('qrcode')).default;
  const {
    settings,
    campusName,
    formTitle,
    refCode,
    appliedDate,
    statusLabel,
    studentName,
    fatherName,
    gender,
    dob,
    classLabel,
    rollOrCode,
    phone,
    email,
    cnic,
    bFormNo,
    bloodGroup,
    address,
    previousSchool,
    monthlyFee,
    notes,
    filename,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Header band
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, w, 92, 'F');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 20, 50, 50, 8, 8, 'F');
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((settings.shortCode || 'IS').slice(0, 3), margin + 25, 51, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((settings.schoolName || 'Iqra School').toUpperCase(), margin + 64, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${campusName} · Session ${settings.sessionName}`, margin + 64, 54);
  doc.text([settings.address, settings.phone].filter(Boolean).join(' · '), margin + 64, 68);

  // Verification QR badge on header right
  try {
    const qrUrl = await QRCode.toDataURL(`ADM:${refCode}|${studentName}|${classLabel}`, {
      width: 120,
      margin: 1,
    });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(w - margin - 60, 15, 60, 60, 6, 6, 'F');
    doc.addImage(qrUrl, 'PNG', w - margin - 57, 18, 54, 54);
  } catch {
    // skip QR on canvas failure
  }

  // Sub-banner
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(15, 118, 110);
  doc.roundedRect(margin, 108, w - margin * 2, 34, 6, 6, 'FD');
  doc.setTextColor(17, 94, 89);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(formTitle.toUpperCase(), margin + 14, 129);
  doc.setFontSize(9);
  doc.text(`REF: ${refCode}  ·  ${statusLabel.toUpperCase()}`, w - margin - 14, 129, { align: 'right' });

  autoTable(doc, {
    startY: 156,
    head: [['Student & Academic Details', 'Value', 'Guardian & Contact Details', 'Value']],
    body: [
      ['Applicant / Student Name', studentName, 'Father / Guardian Name', fatherName],
      ['Class & Section', classLabel, 'Parent Mobile', phone],
      ['Student / Reg Code', rollOrCode || refCode, 'Guardian CNIC', cnic || '—'],
      ['Date of Birth', dob || '—', 'Email Address', email || '—'],
      ['Gender', gender.toUpperCase(), 'Student B-Form', bFormNo || '—'],
      ['Blood Group', bloodGroup || '—', 'Monthly Fee', monthlyFee || 'As per class tariff'],
      ['Previous School', previousSchool || 'N/A', 'Submission Date', appliedDate],
    ],
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 7, lineColor: [226, 232, 240], lineWidth: 0.5 },
    headStyles: { fillColor: [17, 94, 89], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 115 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 115 },
    },
  });

  let y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 430) + 18;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, w - margin * 2, 64, 6, 6, 'FD');
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RESIDENTIAL ADDRESS & ADMISSION NOTES', margin + 12, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Address: ${address || 'Karachi'}`, margin + 12, y + 35);
  doc.text(`Remarks: ${notes || 'Parent agrees to abide by school attendance, discipline, and fee rules.'}`, margin + 12, y + 51);

  y += 90;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 10, y + 36, margin + 170, y + 36);
  doc.line(w - margin - 170, y + 36, w - margin - 10, y + 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Parent / Guardian Signature', margin + 90, y + 50, { align: 'center' });
  doc.text(`Principal (${settings.principalName || 'Admin Office'})`, w - margin - 90, y + 50, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.receiptFooterNote || 'Official Admission Record', w / 2, h - 24, { align: 'center' });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export interface MarksheetPdfOptions {
  settings: SchoolSettings;
  examTitle: string;
  studentName: string;
  studentCode: string;
  fatherName: string;
  className: string;
  rollNo: string;
  rows: Array<{ subject: string; obtained: number; total: number; grade: string }>;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  overallGrade: string;
  remark: string;
  issuedDate: string;
  filename: string;
}

export function exportMarksheetPdf(options: MarksheetPdfOptions): void {
  const {
    settings,
    examTitle,
    studentName,
    studentCode,
    fatherName,
    className,
    rollNo,
    rows,
    totalObtained,
    totalMax,
    percentage,
    overallGrade,
    remark,
    issuedDate,
    filename,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 42;

  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(2.5);
  doc.rect(24, 24, w - 48, h - 48);

  doc.setFillColor(15, 118, 110);
  doc.rect(24, 24, w - 48, 76, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text((settings.schoolName || 'Iqra School').toUpperCase(), w / 2, 54, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`OFFICIAL STATEMENT OF MARKS · ${examTitle.toUpperCase()} (${settings.sessionName})`, w / 2, 74, {
    align: 'center',
  });

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, 118, w - margin * 2, 64, 6, 6, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Student: ${studentName} (${studentCode})`, margin + 12, 138);
  doc.text(`Class: ${className}`, w - margin - 12, 138, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Father Name: ${fatherName}`, margin + 12, 158);
  doc.text(`Roll #: ${rollNo}  ·  Issued: ${issuedDate}`, w - margin - 12, 158, { align: 'right' });

  autoTable(doc, {
    startY: 198,
    head: [['Subject', 'Obtained Marks', 'Maximum Marks', 'Percentage', 'Grade']],
    body: rows.map((r) => {
      const pct = r.total > 0 ? Math.round((r.obtained / r.total) * 100) : 0;
      return [r.subject, String(r.obtained), String(r.total), `${pct}%`, r.grade];
    }),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9.5, cellPadding: 7 },
    headStyles: { fillColor: [17, 94, 89], textColor: [255, 255, 255], fontStyle: 'bold' },
  });

  const y = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 420) + 20;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(15, 118, 110);
  doc.roundedRect(margin, y, w - margin * 2, 48, 6, 6, 'FD');
  doc.setTextColor(17, 94, 89);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Grand Total: ${totalObtained} / ${totalMax} (${percentage}%)`, margin + 14, y + 29);
  doc.text(`Grade: ${overallGrade} · ${remark}`, w - margin - 14, y + 29, { align: 'right' });

  const sigY = h - 92;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 12, sigY, margin + 165, sigY);
  doc.line(w - margin - 165, sigY, w - margin - 12, sigY);
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.text('Controller of Examinations', margin + 88, sigY + 15, { align: 'center' });
  doc.text(`Principal (${settings.principalName || 'Head of Institution'})`, w - margin - 88, sigY + 15, {
    align: 'center',
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export interface PrintableIdCardItem {
  code: string;
  name: string;
  subLine: string;
  secondaryLine: string;
  phone: string;
  roleLabel: string;
}

export async function exportIdCardsPdf(options: {
  settings: SchoolSettings;
  cards: PrintableIdCardItem[];
  cardKind: 'Student' | 'Staff';
  filename: string;
}): Promise<void> {
  const QRCode = (await import('qrcode')).default;
  const { settings, cards, cardKind, filename } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 36;
  const cardW = (w - margin * 2 - 18) / 2;
  const cardH = 158;

  for (let i = 0; i < cards.length; i += 1) {
    if (i > 0 && i % 8 === 0) {
      doc.addPage();
    }
    const slot = i % 8;
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    const x = margin + col * (cardW + 18);
    const y = 36 + row * (cardH + 16);

    const card = cards[i];
    // Card shell
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, cardW, cardH, 8, 8, 'FD');

    // Header bar
    const isStaff = cardKind === 'Staff';
    doc.setFillColor(isStaff ? 55 : 15, isStaff ? 48 : 118, isStaff ? 163 : 110);
    doc.rect(x, y, cardW, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text((settings.schoolName || 'IQRA SCHOOL').toUpperCase(), x + 10, y + 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${card.roleLabel} · ${settings.sessionName}`, x + 10, y + 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(card.code, x + cardW - 10, y + 23, { align: 'right' });

    // Avatar box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x + 10, y + 48, 44, 54, 6, 6, 'F');
    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(card.name.charAt(0).toUpperCase(), x + 32, y + 81, { align: 'center' });

    // Details
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(card.name, x + 62, y + 60, { maxWidth: cardW - 130 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(card.subLine, x + 62, y + 74, { maxWidth: cardW - 130 });
    doc.setTextColor(15, 118, 110);
    doc.setFont('helvetica', 'bold');
    doc.text(card.secondaryLine, x + 62, y + 88, { maxWidth: cardW - 130 });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Ph: ${card.phone}`, x + 62, y + 101);

    // Real QR code on bottom right
    try {
      const qrData = await QRCode.toDataURL(`QR:${card.code}`, { width: 120, margin: 1 });
      doc.addImage(qrData, 'PNG', x + cardW - 60, y + 46, 50, 50);
    } catch {
      // ignore fallback
    }

    // Bottom footer strip
    doc.setFillColor(248, 250, 252);
    doc.rect(x + 1, y + cardH - 28, cardW - 2, 27, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Scan QR:${card.code} at Campus Gate`, x + 10, y + cardH - 11);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.phone || '', x + cardW - 10, y + cardH - 11, { align: 'right' });
  }

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

