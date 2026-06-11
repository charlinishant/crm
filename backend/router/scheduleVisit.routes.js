const { Router } = require("express")
const { getScheduleVisits, upsertScheduleVisit } = require("../controller/scheduleVisit.controller")

const router = Router()

router.get("/", getScheduleVisits)
router.post("/", upsertScheduleVisit)
router.patch("/", upsertScheduleVisit)

module.exports = router
