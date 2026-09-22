const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { buildBookingCostSheetData } = require('./costSheetData.service');
const { generateCostSheetExcel } = require('./excelCostSheetGenerator');
const { renderCostSheetHtml } = require('./costSheetPdf.service');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads', 'booking-invoices');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Generate and store Booking Invoices (XLSX and PDF/HTML)
 * @param {number} bookingId
 * @param {Object} options
 */
async function generateAndStoreBookingDocuments(bookingId, options = {}) {
  const numericId = Number(bookingId);
  const performedBy = options.performedBy || 'System';
  const action = options.isRegeneration ? 'REGENERATE' : 'GENERATE';

  const bookingDir = path.join(UPLOADS_ROOT, String(numericId));
  ensureDirectoryExists(bookingDir);

  // 1. Build authoritative Cost Sheet Data
  const data = await buildBookingCostSheetData(numericId, options);

  // 2. Count existing documents to determine version
  const existingDocs = await prisma.generatedDocument.findMany({
    where: {
      bookingId: numericId,
      type: { in: ['BOOKING_COST_SHEET_XLSX', 'BOOKING_COST_SHEET_PDF'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  const nextVersion = Math.floor(existingDocs.length / 2) + 1;
  const versionTag = `v${nextVersion}`;

  // 3. Generate XLSX
  const xlsxFilename = `cost-sheet-${versionTag}.xlsx`;
  const xlsxFilePath = path.join(bookingDir, xlsxFilename);
  const workbook = await generateCostSheetExcel(data);
  await workbook.xlsx.writeFile(xlsxFilePath);

  // 4. Generate HTML/PDF representation
  const htmlFilename = `cost-sheet-${versionTag}.html`;
  const htmlFilePath = path.join(bookingDir, htmlFilename);
  const htmlContent = await renderCostSheetHtml(data);
  fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');

  // Relative public URLs
  const xlsxUrl = `/api/bookings/${numericId}/cost-sheet?version=${versionTag}`;
  const pdfUrl = `/api/bookings/${numericId}/cost-sheet/pdf?version=${versionTag}`;

  // 5. Store GeneratedDocument records
  const xlsxDoc = await prisma.generatedDocument.create({
    data: {
      bookingId: numericId,
      type: 'BOOKING_COST_SHEET_XLSX',
      title: `Cost Sheet Excel (${versionTag}) - ${data.customer.name}`,
      htmlContent: xlsxFilePath, // Store local absolute/relative file path
      pdfUrl: xlsxUrl
    }
  });

  const pdfDoc = await prisma.generatedDocument.create({
    data: {
      bookingId: numericId,
      type: 'BOOKING_COST_SHEET_PDF',
      title: `Cost Sheet Customer Copy (${versionTag}) - ${data.customer.name}`,
      htmlContent,
      pdfUrl
    }
  });

  // 6. Record in DocumentAuditLog
  await prisma.documentAuditLog.create({
    data: {
      bookingId: numericId,
      type: 'BOOKING_COST_SHEET',
      action,
      details: `Generated Cost Sheet documents ${versionTag} (XLSX & PDF/HTML) for unit ${data.unit.unitNo}. Agreement Value: ₹${data.pricing.agreementValue.toLocaleString('en-IN')}`,
      performedBy
    }
  });

  return {
    version: versionTag,
    xlsxDoc,
    pdfDoc,
    data
  };
}

/**
 * Log Document Action in Audit Trail
 */
async function logBookingDocumentAction(bookingId, type, action, details, performedBy = 'User') {
  return prisma.documentAuditLog.create({
    data: {
      bookingId: Number(bookingId),
      type,
      action,
      details: details || `${action} on ${type}`,
      performedBy
    }
  });
}

module.exports = {
  generateAndStoreBookingDocuments,
  logBookingDocumentAction,
  UPLOADS_ROOT
};
