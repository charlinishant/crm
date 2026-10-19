const { Router } = require("express")
const {
  createBooking,
  getBookings,
  updateBooking,
  deleteBooking,
  cancelBooking,
  getBookingCancellationSummary,
  generateBookingDocument,
  getBookingLedger,
  generateCostSheet,
  getCostSheetPdf,
  getBookingDocuments,
  generateCostSheetDocuments,
  regenerateCostSheetDocuments,
  getAdminBookingInvoices,
} = require("../controllers/booking.controller")

const router = Router()

// Attach authUser if Bearer token present
router.use((req, res, next) => {
  const authHeader = req.headers.authorization || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (token) {
    try {
      const jwt = require("jsonwebtoken")
      const secret = String(process.env.JWT_SECRET || process.env.JWT_TOKEN_SECRET || "swami-crm-change-this-jwt-secret").trim()
      req.authUser = jwt.verify(token, secret)
    } catch (e) {
      // ignore
    }
  }
  next()
})

router.post("/", createBooking)
router.get("/admin/invoices", getAdminBookingInvoices)
router.get("/", getBookings)
router.get("/:id/cancellation-summary", getBookingCancellationSummary)
router.post("/:id/cancel", cancelBooking)
router.get("/:id/cost-sheet", generateCostSheet)
router.get("/:id/cost-sheet/pdf", getCostSheetPdf)
router.get("/:id/documents", getBookingDocuments)
router.post("/:id/cost-sheet/generate", generateCostSheetDocuments)
router.post("/:id/cost-sheet/regenerate", regenerateCostSheetDocuments)
router.post("/:id/documents", generateBookingDocument)
router.get("/:id/ledger", getBookingLedger)
router.get("/:id", getBookings)
router.patch("/:id", updateBooking)
router.delete("/:id", deleteBooking)

module.exports = router
