const { Router } = require("express")
const { optionalAuthenticate } = require("../middleware/auth.middleware")
const { getScheduleVisits, upsertScheduleVisit, deleteScheduleVisit } = require("../controllers/scheduleVisit.controller")

const router = Router()

router.get("/", optionalAuthenticate, getScheduleVisits)
router.post("/", optionalAuthenticate, upsertScheduleVisit)
router.patch("/", optionalAuthenticate, upsertScheduleVisit)
router.delete("/:id", optionalAuthenticate, deleteScheduleVisit)

module.exports = router
