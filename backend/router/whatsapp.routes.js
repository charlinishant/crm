const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const {
  sendWhatsAppMessage,
  listLeadMessages,
  updateMessageStatus,
} = require("../controller/whatsapp.controller")

const router = Router()

router.post("/send", authenticate, sendWhatsAppMessage)
router.get("/lead/:leadId", authenticate, listLeadMessages)
router.post("/status", updateMessageStatus)

module.exports = router
