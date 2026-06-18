const {
  cancelFollowUp,
  createFollowUp,
  getFollowUps,
  getLeadFollowUpContext,
  markFollowUpDone,
  rescheduleFollowUp,
  updateLeadStatus,
} = require("../services/followup.service")
const { emitReportsUpdate } = require("../socket/socket")

const sendError = (res, error) => {
  console.error(error)
  res.status(error.statusCode || 500).json({
    message: error.message || "Unable to process follow-up request",
  })
}

exports.getSalesFollowUps = async (req, res) => {
  try {
    const data = await getFollowUps(req.authUser, req.query.filter)
    res.status(200).json({ data })
  } catch (error) {
    sendError(res, error)
  }
}

exports.createSalesFollowUp = async (req, res) => {
  try {
    const data = await createFollowUp(req.authUser, req.body)
    emitReportsUpdate("followup:created")
    res.status(201).json({ data, message: "Follow-up created" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.markSalesFollowUpDone = async (req, res) => {
  try {
    const data = await markFollowUpDone(req.authUser, req.params.id, req.body)
    emitReportsUpdate("followup:updated")
    res.status(200).json({ data, message: "Follow-up marked Done" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.rescheduleSalesFollowUp = async (req, res) => {
  try {
    const data = await rescheduleFollowUp(req.authUser, req.params.id, req.body)
    emitReportsUpdate("followup:updated")
    res.status(200).json({ data, message: "Follow-up rescheduled" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.cancelSalesFollowUp = async (req, res) => {
  try {
    const data = await cancelFollowUp(req.authUser, req.params.id, req.body)
    emitReportsUpdate("followup:updated")
    res.status(200).json({ data, message: "Follow-up cancelled" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.updateSalesLeadStatus = async (req, res) => {
  try {
    const data = await updateLeadStatus(req.authUser, req.params.leadId, req.body)
    emitReportsUpdate("lead:status-updated")
    res.status(200).json({ data, message: "Lead status updated" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.getSalesLeadFollowUpContext = async (req, res) => {
  try {
    const data = await getLeadFollowUpContext(req.authUser, req.params.leadId)
    res.status(200).json({ data })
  } catch (error) {
    sendError(res, error)
  }
}
