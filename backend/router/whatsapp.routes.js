const { Router } = require("express")
const { sendWhatsAppMessage } = require("../controller/whatsapp.controller")

const router = Router()

router.post("/send", sendWhatsAppMessage)

module.exports = router
