const { Router } = require("express")
const { getScheduleVisits, upsertScheduleVisit, deleteScheduleVisit } = require("../controller/scheduleVisit.controller")

const router = Router()

router.get("/", getScheduleVisits)
router.post("/", upsertScheduleVisit)
router.patch("/", upsertScheduleVisit)
router.delete("/:id", deleteScheduleVisit)

module.exports = router
