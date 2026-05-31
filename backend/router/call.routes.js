const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const {
  startCall,
  updateDisposition,
  getLeadCalls,
  getAgentCalls,
  getAdminCalls,
  webhook,
  recordingWebhook,
  getAnalytics,
} = require("../controller/call.controller")

const router = Router()

router.post("/start", authenticate, startCall)
router.put("/disposition/:id", authenticate, updateDisposition)
router.get("/lead/:leadId", authenticate, getLeadCalls)
router.get("/agent/:agentId", authenticate, getAgentCalls)
router.get("/admin/all", authenticate, getAdminCalls)
router.get("/admin/analytics", authenticate, getAnalytics)
router.post("/webhook", webhook)
router.post("/recording-webhook", recordingWebhook)

module.exports = router
