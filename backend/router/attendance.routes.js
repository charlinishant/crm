const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const {
  endAttendance,
  endBreak,
  getAttendanceLogs,
  getMyAttendance,
  startAttendance,
  startBreak,
} = require("../controller/attendance.controller")

const router = Router()

router.get("/", authenticate, getAttendanceLogs)
router.get("/me", authenticate, getMyAttendance)
router.post("/login", authenticate, startAttendance)
router.post("/logout", authenticate, endAttendance)
router.post("/break/start", authenticate, startBreak)
router.post("/break/end", authenticate, endBreak)

module.exports = router
