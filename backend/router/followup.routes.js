const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const {
  cancelSalesFollowUp,
  createSalesFollowUp,
  getSalesFollowUps,
  getSalesLeadFollowUpContext,
  markSalesFollowUpDone,
  rescheduleSalesFollowUp,
  updateSalesLeadStatus,
} = require("../controller/followup.controller")

const router = Router()

router.get("/followups", authenticate, getSalesFollowUps)
router.post("/followups", authenticate, createSalesFollowUp)
router.patch("/followups/:id/done", authenticate, markSalesFollowUpDone)
router.patch("/followups/:id/reschedule", authenticate, rescheduleSalesFollowUp)
router.patch("/followups/:id/cancel", authenticate, cancelSalesFollowUp)
router.get("/leads/:leadId/followups", authenticate, getSalesLeadFollowUpContext)
router.patch("/leads/:leadId/status", authenticate, updateSalesLeadStatus)

module.exports = router
