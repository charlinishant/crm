const {Router} = require("express")
const notifiaction = require("../controller/notification.controller")

const router = Router()

router.get("/get", notifiaction.getNotifications)
router.patch("/read/:id", notifiaction.readNotification)
router.post("/activity", notifiaction.sendActivityNotification)
router.post("/lead-assign", notifiaction.sendLeadAssignNotification)

module.exports = router