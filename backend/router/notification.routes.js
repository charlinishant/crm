const {Router} = require("express")
const notification = require("../controller/notification.controller")

const router = Router()

router.get("/get", notification.getNotifications)
router.patch("/read/", notification.readNotification)
router.patch("/read/:id", notification.readNotification)
router.post("/activity", notification.sendActivityNotification)
router.post("/lead-assign", notification.sendLeadAssignNotification)

module.exports = router