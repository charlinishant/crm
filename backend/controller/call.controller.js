const prisma = require("../lib/prisma")
const { startProviderCall } = require("../services/callProvider.service")

const allowedDispositions = new Set([
  "Qualified",
  "Callback Later",
  "Not Interested",
  "Wrong Number",
  "Junk",
])

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const cleanPhone = (value) => String(value || "").replace(/\D/g, "")

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "")

const isAdminUser = (req) => ["ADMIN", "MANAGER"].includes(String(req.authUser?.role || "").toUpperCase())

const callInclude = {
  lead: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      phones: true,
      interestedProjects: true,
      propertyType: true,
    },
  },
  agent: {
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
}

const buildWhereFromQuery = (query) => {
  const where = {}
  const leadId = toNumberOrNull(query.leadId)
  const agentId = toNumberOrNull(query.agentId)

  if (leadId) where.leadId = leadId
  if (agentId) where.agentId = agentId
  if (query.status) where.status = String(query.status)
  if (query.disposition) where.disposition = String(query.disposition)
  if (query.from || query.to) {
    where.createdAt = {}
    if (query.from) where.createdAt.gte = new Date(query.from)
    if (query.to) where.createdAt.lte = new Date(query.to)
  }

  return where
}

const listCalls = async (req, res, where) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
  const skip = (page - 1) * limit

  const [totalItems, data] = await Promise.all([
    prisma.callLog.count({ where }),
    prisma.callLog.findMany({
      where,
      skip,
      take: limit,
      include: callInclude,
      orderBy: { createdAt: "desc" },
    }),
  ])

  res.status(200).json({ page, limit, totalItems, data })
}

exports.startCall = async (req, res) => {
  try {
    const leadId = toNumberOrNull(req.body.leadId)
    const authUserId = toNumberOrNull(req.authUser?.id)
    const requestedAgentId = toNumberOrNull(req.body.agentId)
    const agentId = isAdminUser(req) ? requestedAgentId || authUserId : authUserId
    const phone = cleanPhone(req.body.phone)
    const agentPhone = cleanPhone(req.body.agentPhone)

    if (!leadId) return res.status(400).json({ message: "leadId is required" })
    if (!agentId) return res.status(400).json({ message: "agentId is required" })
    if (!phone || phone.length < 10) return res.status(400).json({ message: "Valid lead phone is required" })

    const [lead, agent] = await Promise.all([
      prisma.lead.findUnique({ where: { id: leadId } }),
      prisma.user.findUnique({ where: { id: agentId } }),
    ])

    if (!lead) return res.status(404).json({ message: "Lead not found" })
    if (!agent) return res.status(404).json({ message: "Agent not found" })
    if (!isAdminUser(req) && lead.teamId && lead.teamId !== agentId) {
      return res.status(403).json({ message: "You can call only your assigned leads" })
    }

    const finalAgentPhone = agentPhone || cleanPhone(agent.phone || agent.secondaryPhone)
    if (!finalAgentPhone || finalAgentPhone.length < 10) {
      return res.status(400).json({ message: "Agent phone is required before starting call" })
    }

    const providerResult = await startProviderCall({ lead, agent, phone, agentPhone: finalAgentPhone })
    const callLog = await prisma.callLog.create({
      data: {
        leadId,
        agentId,
        phone,
        agentPhone: finalAgentPhone,
        provider: providerResult.provider,
        callId: providerResult.callId,
        status: providerResult.status || "initiated",
        startedAt: new Date(),
      },
      include: callInclude,
    })

    res.status(201).json({
      message: "Call started",
      callLog,
      provider: providerResult.provider,
      callId: providerResult.callId,
    })
  } catch (error) {
    console.error("Start call error:", error)
    res.status(500).json({ message: error.message || "Unable to start call" })
  }
}

exports.updateDisposition = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    const disposition = String(req.body.disposition || "").trim()

    if (!id) return res.status(400).json({ message: "Call log id is required" })
    if (!allowedDispositions.has(disposition)) {
      return res.status(400).json({ message: "Invalid disposition" })
    }

    const existingCall = await prisma.callLog.findUnique({ where: { id } })
    if (!existingCall) return res.status(404).json({ message: "Call log not found" })
    if (!isAdminUser(req) && existingCall.agentId !== toNumberOrNull(req.authUser?.id)) {
      return res.status(403).json({ message: "You can update only your call disposition" })
    }

    const callLog = await prisma.callLog.update({
      where: { id },
      data: { disposition },
      include: callInclude,
    })

    res.status(200).json(callLog)
  } catch (error) {
    console.error("Update disposition error:", error)
    res.status(500).json({ message: "Unable to update disposition" })
  }
}

exports.getLeadCalls = async (req, res) => {
  try {
    const leadId = toNumberOrNull(req.params.leadId)
    if (!leadId) return res.status(400).json({ message: "leadId is required" })

    const where = { leadId }
    if (!isAdminUser(req)) where.agentId = toNumberOrNull(req.authUser?.id)
    await listCalls(req, res, where)
  } catch (error) {
    console.error("Get lead calls error:", error)
    res.status(500).json({ message: "Unable to load lead calls" })
  }
}

exports.getAgentCalls = async (req, res) => {
  try {
    const requestedAgentId = toNumberOrNull(req.params.agentId)
    const agentId = isAdminUser(req) ? requestedAgentId : toNumberOrNull(req.authUser?.id)
    if (!agentId) return res.status(400).json({ message: "agentId is required" })
    await listCalls(req, res, { ...buildWhereFromQuery(req.query), agentId })
  } catch (error) {
    console.error("Get agent calls error:", error)
    res.status(500).json({ message: "Unable to load agent calls" })
  }
}

exports.getAdminCalls = async (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ message: "Admin access required" })
    await listCalls(req, res, buildWhereFromQuery(req.query))
  } catch (error) {
    console.error("Get admin calls error:", error)
    res.status(500).json({ message: "Unable to load call logs" })
  }
}

exports.webhook = async (req, res) => {
  try {
    const callId = req.body.callId || req.body.call_id || req.body.sid
    if (!callId) return res.status(400).json({ message: "callId is required" })

    const status = req.body.status || req.body.CallStatus || "completed"
    const duration = toNumberOrNull(req.body.duration || req.body.CallDuration)
    const recordingUrl = req.body.recordingUrl || req.body.recording_url || req.body.RecordingUrl || null

    const callLog = await prisma.callLog.update({
      where: { callId: String(callId) },
      data: {
        status,
        duration,
        recordingUrl,
        endedAt: ["completed", "failed", "busy", "no-answer", "missed"].includes(String(status).toLowerCase())
          ? new Date()
          : undefined,
      },
    })

    res.status(200).json({ message: "Webhook processed", callLogId: callLog.id })
  } catch (error) {
    console.error("Call webhook error:", error)
    res.status(500).json({ message: "Unable to process webhook" })
  }
}

exports.recordingWebhook = async (req, res) => {
  try {
    const callId = req.body.callId || req.body.call_id || req.body.sid
    const recordingUrl = req.body.recordingUrl || req.body.recording_url || req.body.RecordingUrl
    const duration = toNumberOrNull(req.body.duration || req.body.recordingDuration)

    if (!callId) return res.status(400).json({ message: "callId is required" })
    if (!recordingUrl) return res.status(400).json({ message: "recordingUrl is required" })

    const callLog = await prisma.callLog.update({
      where: { callId: String(callId) },
      data: {
        recordingUrl,
        ...(duration ? { duration } : {}),
      },
    })

    res.status(200).json({ message: "Recording saved", callLogId: callLog.id })
  } catch (error) {
    console.error("Recording webhook error:", error)
    res.status(500).json({ message: "Unable to process recording webhook" })
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ message: "Admin access required" })
    const where = buildWhereFromQuery(req.query)
    const calls = await prisma.callLog.findMany({ where })
    const totalCalls = calls.length
    const answeredCalls = calls.filter(call => ["completed", "answered", "connected"].includes(String(call.status).toLowerCase())).length
    const missedCalls = calls.filter(call => ["missed", "no-answer", "failed", "busy"].includes(String(call.status).toLowerCase())).length
    const durationTotal = calls.reduce((sum, call) => sum + (call.duration || 0), 0)
    const qualifiedLeads = calls.filter(call => call.disposition === "Qualified").length

    res.status(200).json({
      totalCalls,
      answeredCalls,
      missedCalls,
      averageDuration: totalCalls ? Math.round(durationTotal / totalCalls) : 0,
      qualifiedLeads,
    })
  } catch (error) {
    console.error("Call analytics error:", error)
    res.status(500).json({ message: "Unable to load analytics" })
  }
}
