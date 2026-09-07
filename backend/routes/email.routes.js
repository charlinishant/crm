const {Router}  = require("express")
const { optionalAuthenticate } = require("../middleware/auth.middleware")
const {getEmailLogs, getEmailSenders, sendLeadEmail, sendWelcomeEmail, deleteEmailLog} = require("../controllers/email.controller")

const router = Router()


router.get("/senders", getEmailSenders)
router.get("/logs", getEmailLogs)
router.post("/send", optionalAuthenticate, sendLeadEmail)
router.post("/welcome-email", sendWelcomeEmail)
router.delete("/:id", deleteEmailLog)

module.exports = router
