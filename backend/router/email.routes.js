const {Router}  = require("express")
const {getEmailSenders, sendLeadEmail, sendWelcomeEmail} = require("../controller/email.controller")

const router = Router()


router.get("/senders", getEmailSenders)
router.post("/send", sendLeadEmail)
router.post("/welcome-email", sendWelcomeEmail)

module.exports = router
