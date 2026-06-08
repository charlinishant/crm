const {Router}  = require("express")
const {sendWelcomeEmail} = require("../controller/email.controller")

const router = Router()


router.post("/welcome-email", sendWelcomeEmail)

module.exports = router