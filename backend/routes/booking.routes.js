const { Router } = require("express")
const {
  createBooking,
  getBookings,
  updateBooking,
  deleteBooking,
  generateBookingDocument,
  getBookingLedger,
} = require("../controllers/booking.controller")

const router = Router()

router.post("/", createBooking)
router.get("/", getBookings)
router.post("/:id/documents", generateBookingDocument)
router.get("/:id/ledger", getBookingLedger)
router.get("/:id", getBookings)
router.patch("/:id", updateBooking)
router.delete("/:id", deleteBooking)

module.exports = router
