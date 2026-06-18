const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const controller = require("../controller/adminReport.controller")

const router = Router()

router.get("/summary", authenticate, controller.getSummary)
router.get("/lead-status", authenticate, controller.getLeadStatus)
router.get("/monthly-leads", authenticate, controller.getMonthlyLeads)
router.get("/sales-performance", authenticate, controller.getSalesPerformance)
router.get("/followups", authenticate, controller.getFollowups)
router.get("/lead-sources", authenticate, controller.getLeadSources)
router.get("/site-visits", authenticate, controller.getSiteVisits)
router.get("/bookings", authenticate, controller.getBookings)
router.get("/recent-activities", authenticate, controller.getRecentActivities)

module.exports = router
