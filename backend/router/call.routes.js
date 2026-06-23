const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const {
  startCall,
  disposeCall,
  updateDisposition,
  getCallStatus,
  getLeadCalls,
  getAgentCalls,
  getMyCalls,
  getAdminCalls,
  webhook,
  recordingWebhook,
  getAnalytics,
  twilioVoice,
  getRecording,
} = require("../controller/call.controller")

const router = Router()

router.post("/start", authenticate, startCall)
router.post("/dispose", authenticate, disposeCall)
router.put("/disposition/:id", authenticate, updateDisposition)
router.get("/status/:id", authenticate, getCallStatus)
router.get("/lead/:leadId", authenticate, getLeadCalls)
router.get("/agent/:agentId", authenticate, getAgentCalls)
router.get("/my", authenticate, getMyCalls)
router.get("/admin/all", authenticate, getAdminCalls)
router.get("/admin/analytics", authenticate, getAnalytics)
router.get("/recording/:id", authenticate, getRecording)
router.post("/twilio/voice", twilioVoice)
router.post("/twilio/status", webhook)
router.post("/twilio/recording", recordingWebhook)

module.exports = router
