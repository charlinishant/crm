const { Router } = require("express");
const {
  getDashboardStats,
  getBookings,
  getBookingDetails,
  updateCustomerKYC,
  generateDocument,
  previewDocument,
  logDocumentAction,
  getBookingAuditLogs,
  // New endpoints
  getPaymentPlans,
  getDemands,
  previewNextDemand,
  generateSingleDemand,
  previewBatchDemands,
  generateBatchDemands,
  recordReceipt,
  getDemandLetter,
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
router.put("/bookings/:id/kyc", postSalesAuth, updateCustomerKYC);
router.post("/bookings/:id/documents", postSalesAuth, generateDocument);
router.post("/bookings/:id/documents/preview", postSalesAuth, previewDocument);
router.post("/documents/audit-log", postSalesAuth, logDocumentAction);
router.get("/bookings/:id/audit-logs", postSalesAuth, getBookingAuditLogs);

// Demand Engine Routes (Section 6)
router.get("/bookings/:id/demand-preview", postSalesAuth, previewNextDemand);
router.post("/bookings/:id/demands", postSalesAuth, generateSingleDemand);
router.post("/bookings/:id/receipts", postSalesAuth, recordReceipt);
router.post("/demands/batch-preview", postSalesAuth, previewBatchDemands);
router.post("/demands/batch-generate", postSalesAuth, generateBatchDemands);
router.get("/demands/:id/letter", postSalesAuth, getDemandLetter);

// New functional routes
router.get("/payment-plans", postSalesAuth, getPaymentPlans);
router.get("/demands", postSalesAuth, getDemands);
router.get("/collections", postSalesAuth, getCollections);
router.get("/ledger", postSalesAuth, getCustomerLedger);
router.get("/reports", postSalesAuth, getReports);

module.exports = router;
