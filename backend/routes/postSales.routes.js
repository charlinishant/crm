const { Router } = require("express");
const {
  getDashboardStats,
  getBookings,
  getBookingDetails,
  generateDocument,
  logDocumentAction,
  getBookingAuditLogs,
  // New endpoints
  getPaymentPlans,
  getDemands,
  getCollections,
  getCustomerLedger,
  getReports,
} = require("../controllers/postSales.controller");
const { requireRoles } = require("../middleware/auth.middleware");

const router = Router();
const postSalesAuth = requireRoles(["ADMIN", "SUPER_ADMIN", "MANAGER", "POST_SALES"]);

router.get("/dashboard-stats", postSalesAuth, getDashboardStats);
router.get("/bookings", postSalesAuth, getBookings);
router.get("/bookings/:id", postSalesAuth, getBookingDetails);
router.post("/bookings/:id/documents", postSalesAuth, generateDocument);
router.post("/documents/audit-log", postSalesAuth, logDocumentAction);
router.get("/bookings/:id/audit-logs", postSalesAuth, getBookingAuditLogs);

// New functional routes
router.get("/payment-plans", postSalesAuth, getPaymentPlans);
router.get("/demands", postSalesAuth, getDemands);
router.get("/collections", postSalesAuth, getCollections);
router.get("/ledger", postSalesAuth, getCustomerLedger);
router.get("/reports", postSalesAuth, getReports);

module.exports = router;
