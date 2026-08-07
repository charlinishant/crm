const {Router} = require("express")
const notification = require("../controllers/notification.controller")

const router = Router()
const authenticate = require("../middleware/auth.middleware")

router.get("/me", authenticate, notification.getMyNotifications)
router.patch("/read-all", authenticate, notification.readAllMyNotifications)
router.patch("/:id/read", authenticate, notification.readMyNotification)
router.get("/get", notification.getNotifications)
router.patch("/read/", notification.readNotification)
router.patch("/read/:id", notification.readNotification)
router.post("/activity", notification.sendActivityNotification)
router.post("/lead-assign", notification.sendLeadAssignNotification)

module.exports = router
