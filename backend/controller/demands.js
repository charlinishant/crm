const express = require('express');
const router = express.Router();
const { buildBookingDocumentContext, mergeTemplate, calculateDemandBreakdown } = require('./postSales.utils');

const toNumberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const ensureDemandModels = async (prisma) => {
  const hasDemandModel = await prisma.$queryRaw`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Demand'`;
  if (hasDemandModel?.length) return true;
  return false;
};

/**
 * @route   POST /api/demands/bulk-generate
 * @desc    Bulk generate demand letters based on a milestone
 * @access  Private (Admin)
 */
router.post('/bulk-generate', async (req, res) => {
  const { milestoneId, dueDate, description } = req.body;
  const prisma = req.prisma;

  if (!milestoneId || !dueDate) {
    return res.status(400).json({ msg: 'Please provide milestoneId and dueDate.' });
  }

  try {
    const bookingModel = prisma.booking;
    const demandModel = prisma.demand;
    if (!demandModel) {
      return res.status(501).json({ msg: 'Demand model is not available in this database schema.' });
    }

    const [bookingCount, milestone] = await Promise.all([
      bookingModel.count(),
      prisma.$queryRaw`SELECT id, name, percentage, sequence FROM PaymentSchedule WHERE id = ${Number(milestoneId)}`.catch(() => null),
    ]);

    if (!milestone || !milestone[0]) {
      return res.status(404).json({ msg: `Milestone with ID ${milestoneId} not found.` });
    }

    const milestoneRecord = milestone[0];
    if (!milestoneRecord.percentage) {
      return res.status(400).json({ msg: `Milestone with ID ${milestoneId} does not have a percentage value.` });
    }

    const eligibleBookings = await bookingModel.findMany({
      where: {
        stage: {
          in: ['ALLOTTED', 'AGREEMENT_DONE']
        },
      },
      include: {
        costSheet: true,
        paymentSchedule: true,
        unit: true,
        lead: true,
      },
    });

    if (eligibleBookings.length === 0) {
      return res.status(200).json({ msg: 'No eligible bookings found for this milestone.' });
    }

    const demandsToCreate = eligibleBookings
      .map((booking) => {
        const costSheet = Array.isArray(booking.costSheet) && booking.costSheet[0] ? booking.costSheet[0] : null;
        if (!costSheet) return null;

        const breakdown = calculateDemandBreakdown({
          agreementValue: costSheet.newValue ?? costSheet.orignalValue ?? booking.basePrice ?? 0,
          percentage: milestoneRecord.percentage,
          gstRate: 0,
        });

        return {
          demandNo: `DEM-${booking.id}-${milestoneRecord.sequence || 'MS'}`,
          amount: breakdown.totalAmount,
          principal: breakdown.principal,
          gst: breakdown.gst,
          status: 'DRAFT',
          dueDate: new Date(dueDate),
          description: description || `Demand for ${milestoneRecord.name || 'milestone'}`,
          bookingId: booking.id,
        };
      })
      .filter(Boolean);

    if (demandsToCreate.length === 0) {
      return res.status(200).json({ msg: 'All eligible bookings were skipped due to missing data.' });
    }

    const created = await prisma.$transaction(async (tx) => {
      return tx.demand.createMany({
        data: demandsToCreate,
      });
    });

    res.json({
      msg: `Successfully created ${created.count} demands in 'Draft' state.`,
      count: created.count,
      bookingsScanned: bookingCount,
    });
  } catch (error) {
    console.error('Bulk demand generation failed:', error);
    res.status(500).json({ msg: 'Server error during bulk demand generation.' });
  }
});

/**
 * @route   POST /api/demands/:demandId/issue
 * @desc    Issue a demand (moves from Draft to Issued) and generate the PDF
 * @access  Private (Post-Sales Exec)
 */
router.post('/:demandId/issue', async (req, res) => {
  const prisma = req.prisma;
  const demandId = Number(req.params.demandId);

  try {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) {
      return res.status(404).json({ msg: 'Demand not found.' });
    }

    const updatedDemand = await prisma.demand.update({
      where: { id: demandId },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        bookingId: demand.bookingId,
        type: 'DEBIT',
        amount: demand.amount,
        description: `Demand issue ${demand.demandNo}`,
        date: new Date(),
      },
    });

    res.json({
      msg: 'Demand issued successfully.',
      demand: updatedDemand,
    });
  } catch (error) {
    console.error('Demand issue failed:', error);
    res.status(500).json({ msg: 'Server error while issuing demand.' });
  }
});

/**
 * @route   POST /api/demands/:demandId/receipts
 * @desc    Record a payment receipt against a demand
 * @access  Private (Accounts/Post-Sales Exec)
 */
router.post('/:demandId/receipts', async (req, res) => {
  const prisma = req.prisma;
  const demandId = Number(req.params.demandId);
  const { amount, receivedDate, mode = 'CASH', referenceNumber } = req.body;

  try {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) {
      return res.status(404).json({ msg: 'Demand not found.' });
    }

    const paymentAmount = toNumberOrNull(amount) ?? Number(demand.amount || 0);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ msg: 'Please provide a valid payment amount.' });
    }

    const receipt = await prisma.$transaction(async (tx) => {
      const createdReceipt = await tx.receipt.create({
        data: {
          demandId,
          bookingId: demand.bookingId,
          receiptNo: referenceNumber || `RCPT-${demandId}-${Date.now()}`,
          amount: paymentAmount,
          mode,
          receivedAt: receivedDate ? new Date(receivedDate) : new Date(),
          status: 'POSTED',
        },
      });

      await tx.ledgerEntry.create({
        data: {
          bookingId: demand.bookingId,
          type: 'CREDIT',
          amount: paymentAmount,
          description: `Receipt ${createdReceipt.receiptNo}`,
          date: new Date(),
        },
      });

      const outstanding = Number(demand.amount || 0) - Number(paymentAmount);
      const nextStatus = outstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      await tx.demand.update({
        where: { id: demandId },
        data: {
          status: nextStatus,
          paidAmount: (Number(demand.paidAmount || 0) + paymentAmount).toFixed(2),
          outstandingAmount: Math.max(outstanding, 0).toFixed(2),
        },
      });

      return createdReceipt;
    });

    res.json({ msg: 'Receipt recorded successfully.', receipt });
  } catch (error) {
    console.error('Receipt recording failed:', error);
    res.status(500).json({ msg: 'Server error while recording receipt.' });
  }
});

module.exports = router;