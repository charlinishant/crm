const { Router } = require("express")
const authenticate = require("../middleware/auth.middleware")
const {
  startCall,
  startBrowserPhone,
  clickToCallLead,
  getBrowserPhoneWidget,
  disposeCall,
  updateDisposition,
  getCallStatus,
  getInboundCalls,
  getActiveInboundCall,
  getCallDetail,
  linkCallLead,
  getLeadCalls,
  getAgentCalls,
  getMyCalls,
  getAdminCalls,
  getAnalytics,
  deleteBulkCallLogs,
  deleteCallLog,
  mcubeInbound,
  mcubeRecordingWebhook,
  mcubeWebhook,
  getRecording,
} = require("../controllers/call.controller")



const router = Router()



router.post("/start", authenticate, startCall)
router.post("/browser-phone/start", authenticate, startBrowserPhone)
router.post("/mcube/click-to-call", authenticate, clickToCallLead)
router.get("/browser-phone/widget", authenticate, getBrowserPhoneWidget)
router.post("/dispose", authenticate, disposeCall)
router.put("/disposition/:id", authenticate, updateDisposition)
router.get("/inbound", authenticate, getInboundCalls)
router.get("/active-inbound", authenticate, getActiveInboundCall)
router.get("/status/:id", authenticate, getCallStatus)
router.get("/detail/:id", authenticate, getCallDetail)
router.patch("/:id/link-lead", authenticate, linkCallLead)
router.get("/lead/:leadId", authenticate, getLeadCalls)
router.get("/agent/:agentId", authenticate, getAgentCalls)
router.get("/my", authenticate, getMyCalls)
router.get("/admin/all", authenticate, getAdminCalls)
router.get("/admin/analytics", authenticate, getAnalytics)
router.get("/recording/:id", authenticate, getRecording)
router.delete("/bulk", authenticate, deleteBulkCallLogs)
router.delete("/:id", authenticate, deleteCallLog)
router.post("/mcube/inbound", mcubeInbound)
router.post("/mcube/status", mcubeWebhook)
router.post("/mcube/recording", mcubeRecordingWebhook)
router.get("/mcube/inbound", mcubeInbound)
router.get("/mcube/status", mcubeWebhook)
router.get("/mcube/recording", mcubeRecordingWebhook)
router.get("/:id/recording", authenticate, getRecording)
router.get("/:id", authenticate, getCallDetail)

module.exports = router
