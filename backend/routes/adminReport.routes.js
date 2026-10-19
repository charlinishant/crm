const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const controller = require("../controllers/adminReport.controller")

const router = Router()

// Lead & Funnel Reports
router.get("/summary", authenticate, controller.getSummary)
router.get("/lead-status", authenticate, controller.getLeadStatus)
router.get("/monthly-leads", authenticate, controller.getMonthlyLeads)
router.get("/sales-performance", authenticate, controller.getSalesPerformance)
router.get("/sales-users", authenticate, controller.getSalesUsers)
router.get("/followups", authenticate, controller.getFollowups)
router.get("/lead-sources", authenticate, controller.getLeadSources)
router.get("/site-visits", authenticate, controller.getSiteVisits)
router.get("/bookings", authenticate, controller.getBookings)
router.get("/recent-activities", authenticate, controller.getRecentActivities)
router.get("/drilldown-leads", authenticate, controller.getDrilldownLeads)

// Mcube Call / Telephony Reports
router.get("/telephony-summary", authenticate, controller.getTelephonySummary)
router.get("/call-status", authenticate, controller.getCallStatus)
router.get("/call-hourly", authenticate, controller.getCallHourly)
router.get("/call-daily", authenticate, controller.getCallDaily)
router.get("/did-breakup", authenticate, controller.getDidBreakup)
router.get("/agent-call-performance", authenticate, controller.getAgentCallPerformance)
router.get("/call-logs", authenticate, controller.getCallLogs)
router.get("/drilldown-calls", authenticate, controller.getDrilldownCalls)
router.post("/sync-mcube-cdr", authenticate, controller.syncMcubeCdr)

module.exports = router
