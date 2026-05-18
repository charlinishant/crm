const { Router } = require("express")
const { createBooking, getBookings, updateBooking, deleteBooking } = require("../controller/booking.controller")
const authenticate = require("../middleware/auth.middleware")

const router = Router()

router.use(authenticate)

router.post("/", createBooking)
router.get("/", getBookings)
router.get("/:id", getBookings)
router.patch("/:id", updateBooking)
router.delete("/:id", deleteBooking)

module.exports = router
