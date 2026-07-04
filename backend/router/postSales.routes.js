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
} = require("../controller/postSales.controller");
const authenticate = require("../middleware/auth.middleware");

const router = Router();

router.get("/dashboard-stats", authenticate, getDashboardStats);
router.get("/bookings", authenticate, getBookings);
router.get("/bookings/:id", authenticate, getBookingDetails);
router.post("/bookings/:id/documents", authenticate, generateDocument);
router.post("/documents/audit-log", authenticate, logDocumentAction);
router.get("/bookings/:id/audit-logs", authenticate, getBookingAuditLogs);

// New functional routes
router.get("/payment-plans", authenticate, getPaymentPlans);
router.get("/demands", authenticate, getDemands);
router.get("/collections", authenticate, getCollections);
router.get("/ledger", authenticate, getCustomerLedger);
router.get("/reports", authenticate, getReports);

module.exports = router;
