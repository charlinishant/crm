const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/payment-plans
 * @desc    Create a new payment plan with milestones
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  // --- LOGIC FOR CREATING A PAYMENT PLAN ---
  // Corresponds to section 6.1 of the specification.
  // A plan is an ordered list of milestones.
  const { planType, milestones } = req.body; // milestones is an array of milestone objects

  const newPaymentPlan = await req.prisma.paymentPlan.create({
    data: {
      planType,
      milestones: {
        create: milestones, // Prisma can create related records in one go
      },
    },
    include: { milestones: true },
  });

  res.json(newPaymentPlan);
});

/**
 * @route   GET /api/payment-plans
 * @desc    Get all payment plans
 * @access  Private
 */
router.get('/', async (req, res) => {
  const paymentPlans = await req.prisma.paymentPlan.findMany({ include: { milestones: true } });
  res.json(paymentPlans);
});

module.exports = router;