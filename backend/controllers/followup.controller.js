const {
  cancelFollowUp,
  createFollowUp,
  getFollowUps,
  getLeadFollowUpContext,
  markFollowUpDone,
  rescheduleFollowUp,
  snoozeFollowUp,
  updateFollowUp,
  updateLeadStatus,
} = require("../services/followup.service")
const { emitReportsUpdate } = require("../socket/socket")
const { isAdminUser, maskFollowUpData, maskLeadData } = require("../utils/phoneMask")

const sendError = (res, error) => {
  console.error(error)
  res.status(error.statusCode || 500).json({
    message: error.message || "Unable to process follow-up request",
  })
}

exports.getSalesFollowUps = async (req, res) => {
  try {
    const paginated = req.query.page !== undefined || req.query.limit !== undefined
    const result = await getFollowUps(req.authUser, req.query.filter, {
      paginated,
      page: req.query.page,
      limit: req.query.limit,
    })
    const isAdmin = isAdminUser(req)
    const safeData = isAdmin ? result.data : result.data.map((f) => maskFollowUpData(f, false))
    res.status(200).json({
      ...result,
      data: safeData,
    })
  } catch (error) {
    sendError(res, error)
  }
}

exports.createSalesFollowUp = async (req, res) => {
  try {
    const data = await createFollowUp(req.authUser, req.body)
    emitReportsUpdate("followup:created")
    const isAdmin = isAdminUser(req)
    res.status(201).json({ data: isAdmin ? data : maskFollowUpData(data, false), message: "Follow-up created" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.markSalesFollowUpDone = async (req, res) => {
  try {
    const data = await markFollowUpDone(req.authUser, req.params.id, req.body)
    emitReportsUpdate("followup:updated")
    const isAdmin = isAdminUser(req)
    res.status(200).json({ data: isAdmin ? data : maskFollowUpData(data, false), message: "Follow-up completed" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.rescheduleSalesFollowUp = async (req, res) => {
  try {
    const data = await rescheduleFollowUp(req.authUser, req.params.id, req.body)
    emitReportsUpdate("followup:updated")
    const isAdmin = isAdminUser(req)
    res.status(200).json({ data: isAdmin ? data : maskFollowUpData(data, false), message: "Follow-up rescheduled" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.snoozeSalesFollowUp = async (req, res) => {
  try {
    const data = await snoozeFollowUp(req.authUser, req.params.id, req.body?.minutes || 10)
    emitReportsUpdate("followup:updated")
    const isAdmin = isAdminUser(req)
    res.status(200).json({ data: isAdmin ? data : maskFollowUpData(data, false), message: `Follow-up snoozed for ${req.body?.minutes || 10} minutes` })
  } catch (error) {
    sendError(res, error)
  }
}

exports.updateSalesFollowUp = async (req, res) => {
  try {
    const data = await updateFollowUp(req.authUser, req.params.id, req.body)
    emitReportsUpdate("followup:updated")
    const isAdmin = isAdminUser(req)
    res.status(200).json({ data: isAdmin ? data : maskFollowUpData(data, false), message: "Follow-up updated" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.cancelSalesFollowUp = async (req, res) => {
  try {
    const data = await cancelFollowUp(req.authUser, req.params.id, req.body)
    emitReportsUpdate("followup:updated")
    const isAdmin = isAdminUser(req)
    res.status(200).json({ data: isAdmin ? data : maskFollowUpData(data, false), message: "Follow-up cancelled" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.updateSalesLeadStatus = async (req, res) => {
  try {
    const data = await updateLeadStatus(req.authUser, req.params.leadId, req.body)
    emitReportsUpdate("lead:status-updated")
    const isAdmin = isAdminUser(req)
    res.status(200).json({ data: isAdmin ? data : maskLeadData(data, false), message: "Lead status updated" })
  } catch (error) {
    sendError(res, error)
  }
}

exports.getSalesLeadFollowUpContext = async (req, res) => {
  try {
    const data = await getLeadFollowUpContext(req.authUser, req.params.leadId)
    const isAdmin = isAdminUser(req)
    const safeData = {
      ...data,
      lead: isAdmin ? data.lead : maskLeadData(data.lead, false),
      followUps: isAdmin ? data.followUps : (data.followUps || []).map((f) => maskFollowUpData(f, false)),
    }
    res.status(200).json({ data: safeData })
  } catch (error) {
    sendError(res, error)
  }
}
