const express = require('express');
const router = express.Router();
const { buildBookingDocumentContext, mergeTemplate } = require('./postSales.utils');

const documentTemplates = {
  WELCOME_LETTER: '<!doctype html><html><body><h1>Welcome Letter</h1><p>Dear {{customerName}},</p><p>Thank you for booking your unit at {{projectName}}. Your booking ID is {{bookingId}}.</p><p>Unit: {{unitSummary}}</p><p>Booking date: {{bookingDate}}</p></body></html>',
  ALLOTMENT_LETTER: '<!doctype html><html><body><h1>Allotment Letter</h1><p>Dear {{customerName}},</p><p>This is to confirm allotment for {{unitSummary}} in {{projectName}}.</p><p>Booking reference: {{bookingId}}</p></body></html>',
  PARKING_CONSENT: '<!doctype html><html><body><h1>Parking Consent</h1><p>Dear {{customerName}},</p><p>Your parking consent for {{projectName}} has been generated successfully.</p></body></html>',
  POSSESSION_LETTER: '<!doctype html><html><body><h1>Possession Letter</h1><p>Dear {{customerName}},</p><p>Possession for {{unitSummary}} in {{projectName}} is being processed.</p></body></html>',
  RERA_EXTENSION: '<!doctype html><html><body><h1>RERA Extension</h1><p>Dear {{customerName}},</p><p>This notice confirms the RERA extension for your booking in {{projectName}}.</p></body></html>',
};

/**
 * @route   POST /api/bookings/:bookingId/documents
 * @desc    Generate a document for a specific booking (e.g., Welcome Letter)
 * @access  Private (Post-Sales Exec)
 */
router.post('/:bookingId/documents', async (req, res) => {
  const { bookingId } = req.params;
  const { type } = req.body;

  try {
    const booking = await req.prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { lead: true, unit: true },
    });

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found.' });
    }

    const template = documentTemplates[type] || documentTemplates.WELCOME_LETTER;
    const context = buildBookingDocumentContext(booking, type);
    const html = mergeTemplate(template, context);

    const generatedDocument = await req.prisma.generatedDocument.create({
      data: {
        bookingId: booking.id,
        type: type || 'WELCOME_LETTER',
        title: `${context.documentType} for ${booking.customerName || 'Customer'}`,
        htmlContent: html,
        pdfUrl: `/documents/${booking.id}/${(type || 'welcome').toLowerCase()}.pdf`,
      },
    });

    res.json({
      msg: 'Document generated successfully.',
      document: generatedDocument,
      pdfUrl: generatedDocument.pdfUrl,
    });
  } catch (error) {
    console.error('Document generation failed:', error);
    res.status(500).json({ msg: 'Server error while generating document.' });
  }
});

/**
 * @route   GET /api/bookings/:bookingId/ledger
 * @desc    Get the customer ledger (Statement of Account)
 * @access  Private
 */
router.get('/:bookingId/ledger', async (req, res) => {
  const ledgerEntries = await req.prisma.ledgerEntry.findMany({
    where: { bookingId: Number(req.params.bookingId) },
    orderBy: { date: 'asc' },
  });

  res.json(ledgerEntries);
});

module.exports = router;