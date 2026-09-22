const { Router } = require("express")
const {
  createBooking,
  getBookings,
  updateBooking,
  deleteBooking,
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

router.post("/", createBooking)
router.get("/admin/invoices", getAdminBookingInvoices)
router.get("/", getBookings)
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
