const prisma = require("../lib/prisma")
const { startProviderCall } = require("../services/callProvider.service")
const {
  buildBridgeTwiml,
  getRecordingStream,
  verifyWebhookToken,
} = require("../services/twilioVoice.service")

const allowedDispositions = new Set([
  "Qualified",
  "Callback Later",
  "Site Visit Scheduled",
  "Not Interested",
  "Wrong Number",
  "Junk",
  "No Answer",
  "Busy",
  "Follow-up Required",
])

const terminalCallStatuses = new Set(["completed", "failed", "no-answer", "busy", "canceled"])

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

const toDateOrNull = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const cleanPhone = (value) => String(value || "").replace(/\D/g, "")

const isSamePhone = (first, second) => {
  const firstDigits = cleanPhone(first)
  const secondDigits = cleanPhone(second)
  if (!firstDigits || !secondDigits) return false
  if (firstDigits === secondDigits) return true
  return firstDigits.length >= 10 &&
    secondDigits.length >= 10 &&
    firstDigits.slice(-10) === secondDigits.slice(-10)
}

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "")

const isAdminUser = (req) =>
  ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(String(req.authUser?.role || "").toUpperCase())

const normalizeCallStatus = (value) => {
  const status = String(value || "initiated").toLowerCase().replace(/[_\s]+/g, "-")
  const aliases = {
    queued:"initiated",
    ringing:"calling",
    "in-progress":"connected",
    answered:"connected",
    busy:"busy",
    "no-answer":"no-answer",
    noanswer:"no-answer",
    missed:"no-answer",
    completed:"completed",
    failed:"failed",
    canceled:"canceled",
    cancelled:"canceled",
  }
  return aliases[status] || status
}

const callInclude = {
  lead: {
    select: {
      id:true,
      firstName:true,
      lastName:true,
      companyName:true,
      phones:true,
      status:true,
      interestedProjects:true,
      propertyType:true,
      budget:true,
      budgetMin:true,
      budgetMax:true,
    },
  },
  agent: {
    select: {
      id:true,
      username:true,
      firstName:true,
      lastName:true,
      email:true,
      phone:true,
    },
  },
}

const buildWhereFromQuery = (query) => {
  const where = {}
  const leadId = toNumberOrNull(query.leadId)
  const agentId = toNumberOrNull(query.agentId)
  if (leadId) where.leadId = leadId
  if (agentId) where.agentId = agentId
  if (query.status) where.status = normalizeCallStatus(query.status)
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
      take:limit,
      include:callInclude,
      orderBy:{ createdAt:"desc" },
    }),
  ])
  res.status(200).json({ page, limit, totalItems, data })
}

exports.startCall = async (req, res) => {
  let pendingCallLog = null
  try {
    const leadId = toNumberOrNull(req.body.leadId)
    const authUserId = toNumberOrNull(req.authUser?.id)
    const requestedAgentId = toNumberOrNull(req.body.agentId)
    const agentId = isAdminUser(req) ? requestedAgentId || authUserId : authUserId
    const leadPhone = cleanPhone(req.body.leadPhone || req.body.phone)
    const requestedAgentPhone = cleanPhone(req.body.agentPhone)

    if (!leadId) return res.status(400).json({ message:"leadId is required" })
    if (!agentId) return res.status(400).json({ message:"agentId is required" })
    if (!leadPhone || leadPhone.length < 10) {
      return res.status(400).json({ message:"Valid leadPhone is required" })
    }

    const [lead, agent] = await Promise.all([
      prisma.lead.findUnique({ where:{ id:leadId } }),
      prisma.user.findUnique({ where:{ id:agentId } }),
    ])
    if (!lead) return res.status(404).json({ message:"Lead not found" })
    if (!agent) return res.status(404).json({ message:"Agent not found" })
    if (!isAdminUser(req) && lead.teamId && lead.teamId !== agentId) {
      return res.status(403).json({ message:"You can call only your assigned leads" })
    }

    const agentPhone = requestedAgentPhone || cleanPhone(agent.phone || agent.secondaryPhone)
    if (!agentPhone || agentPhone.length < 10) {
      return res.status(400).json({ message:"Agent phone is required before starting call" })
    }
    if (isSamePhone(agentPhone, leadPhone)) {
      return res.status(400).json({
        message:"Agent and lead phone numbers must be different. Enter your own phone as the agent number.",
      })
    }

    pendingCallLog = await prisma.callLog.create({
      data:{
        leadId,
        agentId,
        phone:leadPhone,
        leadPhone,
        agentPhone,
        provider:"twilio",
        status:"initiated",
        startedAt:new Date(),
      },
    })

    const providerResult = await startProviderCall({
      lead,
      agent,
      phone:leadPhone,
      agentPhone,
      callLogId:pendingCallLog.id,
    })
    await prisma.callLog.update({
      where:{ id:pendingCallLog.id },
      data:{
        callId:providerResult.providerCallId,
        providerCallId:providerResult.providerCallId,
        provider:providerResult.provider,
      },
    })
    // Do not overwrite a newer status if Twilio's callback arrived before its
    // connect API response was persisted.
    await prisma.callLog.updateMany({
      where:{ id:pendingCallLog.id, status:"initiated" },
      data:{ status:normalizeCallStatus(providerResult.status || "initiated") },
    })
    const callLog = await prisma.callLog.findUnique({
      where:{ id:pendingCallLog.id },
      include:callInclude,
    })

    res.status(201).json({
      message:"Call initiated. Twilio will call the agent first.",
      callLog,
      provider:providerResult.provider,
      providerCallId:providerResult.providerCallId,
    })
  } catch (error) {
    console.error("Start call error:", error.message)
    if (pendingCallLog?.id) {
      await prisma.callLog.update({
        where:{ id:pendingCallLog.id },
        data:{ status:"failed", notes:error.message, endedAt:new Date() },
      }).catch(() => null)
    }
    res.status(error.statusCode || 500).json({
      message:error.message || "Unable to start call",
      callLogId:pendingCallLog?.id || null,
    })
  }
}

const getDispositionLeadStatus = (disposition) => {
  if (disposition === "Qualified") return "Qualified"
  if (["Not Interested", "Wrong Number", "Junk"].includes(disposition)) return "Unqualified"
  if (["Callback Later", "Follow-up Required", "Site Visit Scheduled"].includes(disposition)) return "Qualified"
  return "New"
}

const buildFollowUpTime = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

exports.disposeCall = async (req, res) => {
  try {
    const callLogId = toNumberOrNull(req.body.callLogId || req.body.id)
    const disposition = String(req.body.disposition || "").trim()
    const notes = String(req.body.notes || "").trim() || null
    const nextFollowUpAt = toDateOrNull(req.body.nextFollowUpAt || req.body.nextFollowUpDateTime)
    const visitDateTime = toDateOrNull(req.body.visitDateTime)
    const interestedProject = String(req.body.interestedProject || "").trim() || null
    const budget = String(req.body.budget || "").trim() || null
    const callStatus = normalizeCallStatus(req.body.callStatus || req.body.status || "completed")

    if (!callLogId) return res.status(400).json({ message:"callLogId is required" })
    if (!allowedDispositions.has(disposition)) {
      return res.status(400).json({ message:"Invalid disposition" })
    }
    if (["Callback Later", "Follow-up Required"].includes(disposition) && !nextFollowUpAt) {
      return res.status(400).json({ message:"Next follow-up date and time are required" })
    }
    if (disposition === "Site Visit Scheduled" && !visitDateTime) {
      return res.status(400).json({ message:"Visit date and time are required" })
    }

    const existingCall = await prisma.callLog.findUnique({
      where:{ id:callLogId },
      include:{ lead:true, agent:true },
    })
    if (!existingCall) return res.status(404).json({ message:"Call log not found" })
    if (!isAdminUser(req) && existingCall.agentId !== toNumberOrNull(req.authUser?.id)) {
      return res.status(403).json({ message:"You can dispose only your own calls" })
    }

    const result = await prisma.$transaction(async (tx) => {
      const nextLeadStatus = getDispositionLeadStatus(disposition)
      const callLog = await tx.callLog.update({
        where:{ id:callLogId },
        data:{
          status:callStatus,
          disposition,
          notes,
          nextFollowUpAt,
          interestedProject,
          budget,
          visitDateTime,
          endedAt:terminalCallStatuses.has(callStatus) ? existingCall.endedAt || new Date() : existingCall.endedAt,
        },
        include:callInclude,
      })

      const leadUpdate = {
        status:nextLeadStatus,
        interestedProjects:interestedProject || existingCall.lead.interestedProjects,
        budget:budget || existingCall.lead.budget,
      }
      if (nextLeadStatus === "Unqualified") {
        leadUpdate.unqualifiedReason = disposition
        leadUpdate.unqualifiedNote = notes
      }
      if (disposition === "Site Visit Scheduled") {
        leadUpdate.conductSiteVisit = interestedProject || existingCall.lead.interestedProjects
        leadUpdate.conductSiteDate = visitDateTime
        leadUpdate.siteVisitProject = interestedProject || existingCall.lead.interestedProjects
        leadUpdate.siteVisitStatus = "Scheduled"
        leadUpdate.visitStatus = "Scheduled"
        leadUpdate.conductSiteStatus = "Scheduled"
        leadUpdate.siteVisitDate = visitDateTime
        leadUpdate.siteVisitNote = notes
      }
      await tx.lead.update({ where:{ id:existingCall.leadId }, data:leadUpdate })

      if (["Callback Later", "Follow-up Required"].includes(disposition)) {
        await tx.followUp.create({
          data:{
            leadId:existingCall.leadId,
            salesUserId:Number(existingCall.agentId || req.authUser.id),
            type:"Call",
            followUpDate:nextFollowUpAt,
            followUpTime:buildFollowUpTime(nextFollowUpAt),
            priority:"Medium",
            notes,
            status:"Pending",
          },
        })
      }

      if (disposition === "Site Visit Scheduled") {
        await tx.scheduleVisit.upsert({
          where:{ leadId:existingCall.leadId },
          create:{
            leadId:existingCall.leadId,
            project:interestedProject || existingCall.lead.interestedProjects,
            status:"Scheduled",
            salesExecutive:getUserName(existingCall.agent),
            note:notes,
            initiatedBy:getUserName(existingCall.agent),
            scheduledOn:visitDateTime,
          },
          update:{
            project:interestedProject || existingCall.lead.interestedProjects,
            status:"Scheduled",
            salesExecutive:getUserName(existingCall.agent),
            note:notes,
            initiatedBy:getUserName(existingCall.agent),
            scheduledOn:visitDateTime,
          },
        })
      }

      await tx.leadActivity.create({
        data:{
          leadId:existingCall.leadId,
          userId:existingCall.agentId,
          type:"CALL_DISPOSITION",
          message:`Call disposed as ${disposition}${notes ? `: ${notes}` : ""}`,
          oldStatus:String(existingCall.lead.status || "New"),
          newStatus:nextLeadStatus,
        },
      })
      return callLog
    })

    res.status(200).json({ message:"Call disposition saved", callLog:result })
  } catch (error) {
    console.error("Dispose call error:", error)
    res.status(500).json({ message:error.message || "Unable to save call disposition" })
  }
}

exports.updateDisposition = async (req, res) => {
  req.body.callLogId = req.params.id
  return exports.disposeCall(req, res)
}

exports.getCallStatus = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    const callLog = await prisma.callLog.findUnique({ where:{ id }, include:callInclude })
    if (!callLog) return res.status(404).json({ message:"Call log not found" })
    if (!isAdminUser(req) && callLog.agentId !== toNumberOrNull(req.authUser?.id)) {
      return res.status(403).json({ message:"Access denied" })
    }
    res.status(200).json({ callLog })
  } catch (error) {
    res.status(500).json({ message:"Unable to load call status" })
  }
}

exports.getLeadCalls = async (req, res) => {
  try {
    const leadId = toNumberOrNull(req.params.leadId)
    if (!leadId) return res.status(400).json({ message:"leadId is required" })
    const where = { leadId }
    if (!isAdminUser(req)) where.agentId = toNumberOrNull(req.authUser?.id)
    await listCalls(req, res, where)
  } catch (error) {
    res.status(500).json({ message:"Unable to load lead calls" })
  }
}

exports.getAgentCalls = async (req, res) => {
  try {
    const requestedAgentId = toNumberOrNull(req.params.agentId)
    const agentId = isAdminUser(req) ? requestedAgentId : toNumberOrNull(req.authUser?.id)
    if (!agentId) return res.status(400).json({ message:"agentId is required" })
    await listCalls(req, res, { ...buildWhereFromQuery(req.query), agentId })
  } catch (error) {
    res.status(500).json({ message:"Unable to load agent calls" })
  }
}

exports.getMyCalls = async (req, res) => {
  try {
    await listCalls(req, res, {
      ...buildWhereFromQuery(req.query),
      agentId:toNumberOrNull(req.authUser?.id),
    })
  } catch (error) {
    res.status(500).json({ message:"Unable to load your call logs" })
  }
}

exports.getAdminCalls = async (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ message:"Admin access required" })
    await listCalls(req, res, buildWhereFromQuery(req.query))
  } catch (error) {
    res.status(500).json({ message:"Unable to load call logs" })
  }
}

const firstWebhookValue = (body, keys) => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") return body[key]
  }
  return null
}

const getVerifiedTwilioCallLogId = (req) => {
  const callLogId = toNumberOrNull(req.query.callLogId)
  return verifyWebhookToken(callLogId, req.query.token) ? callLogId : null
}

exports.twilioVoice = async (req, res) => {
  try {
    const callLogId = getVerifiedTwilioCallLogId(req)
    if (!callLogId) return res.status(403).type("text/plain").send("Invalid callback signature")
    const callLog = await prisma.callLog.findUnique({ where:{ id:callLogId } })
    if (!callLog || callLog.provider !== "twilio") {
      return res.status(404).type("text/plain").send("Call log not found")
    }
    res.type("text/xml").send(buildBridgeTwiml({ callLogId, leadPhone:callLog.leadPhone || callLog.phone }))
  } catch (error) {
    console.error("Twilio voice webhook error:", error.message)
    res.status(500).type("text/xml").send("<Response><Hangup/></Response>")
  }
}

exports.webhook = async (req, res) => {
  try {
    const verifiedCallLogId = getVerifiedTwilioCallLogId(req)
    if (!verifiedCallLogId) return res.status(403).json({ message:"Invalid callback signature" })
    const providerCallId = firstWebhookValue(req.body, ["CallSid", "DialCallSid", "callId", "call_id", "sid", "Sid"])
    const callbackCallLogId = verifiedCallLogId
    if (!providerCallId && !callbackCallLogId) {
      return res.status(400).json({ message:"CallSid or callLogId is required" })
    }

    const rawStatus = firstWebhookValue(req.body, ["DialCallStatus", "CallStatus", "Status", "status"])
    const status = rawStatus ? normalizeCallStatus(rawStatus) : null
    const duration = toNumberOrNull(firstWebhookValue(req.body, ["RecordingDuration", "DialCallDuration", "CallDuration", "Duration", "duration"]))
    const recordingUrl = firstWebhookValue(req.body, ["RecordingUrl", "RecordingURL", "recordingUrl", "recording_url"])
    const startedAt = toDateOrNull(firstWebhookValue(req.body, ["StartTime", "startTime", "start_time"]))
    const endedAtFromProvider = toDateOrNull(firstWebhookValue(req.body, ["EndTime", "endTime", "end_time"]))
    const existingCall = await prisma.callLog.findFirst({
      where:{
        OR:[
          ...(providerCallId ? [
            { providerCallId:String(providerCallId) },
            { callId:String(providerCallId) },
          ] : []),
          ...(callbackCallLogId ? [{ id:callbackCallLogId }] : []),
        ],
      },
    })
    if (!existingCall) {
      return res.status(200).json({ message:"Webhook accepted; call log not found yet" })
    }

    const normalizedRawStatus = String(rawStatus || "").toLowerCase().replace(/[_\s]+/g, "-")
    const isLeadLeg = Boolean(
      providerCallId &&
      existingCall.providerCallId &&
      String(providerCallId) !== String(existingCall.providerCallId)
    )
    let effectiveStatus = status
    // The first Twilio leg calls the agent. The conversation is only connected
    // after the second (lead) leg answers.
    if (!isLeadLeg && ["answered", "in-progress"].includes(normalizedRawStatus)) {
      effectiveStatus = "calling"
    }
    // Keep the lead-leg outcome when the parent agent leg reports completed
    // afterwards (for example, do not turn no-answer into completed).
    if (
      effectiveStatus === "completed" &&
      ["failed", "no-answer", "busy", "canceled"].includes(existingCall.status)
    ) {
      effectiveStatus = existingCall.status
    }
    if (
      (existingCall.status === "connected" && ["initiated", "calling"].includes(effectiveStatus)) ||
      (terminalCallStatuses.has(existingCall.status) && !terminalCallStatuses.has(effectiveStatus))
    ) {
      effectiveStatus = existingCall.status
    }
    const connectedAt = effectiveStatus === "connected" ? new Date() : undefined
    const endedAt = effectiveStatus && terminalCallStatuses.has(effectiveStatus)
      ? endedAtFromProvider || new Date()
      : undefined

    const callLog = await prisma.callLog.update({
      where:{ id:existingCall.id },
      data:{
        ...(providerCallId && !existingCall.providerCallId ? {
          providerCallId:String(providerCallId),
          callId:String(providerCallId),
        } : {}),
        ...(effectiveStatus ? { status:effectiveStatus } : {}),
        ...(duration !== null ? { duration } : {}),
        ...(recordingUrl ? { recordingUrl:String(recordingUrl) } : {}),
        ...(startedAt ? { startedAt } : {}),
        ...(connectedAt && !existingCall.connectedAt ? { connectedAt } : {}),
        ...(endedAt ? { endedAt } : {}),
      },
    })

    res.status(200).json({ message:"Webhook processed", callLogId:callLog.id })
  } catch (error) {
    console.error("Call webhook error:", error)
    res.status(500).json({ message:"Unable to process webhook" })
  }
}

exports.recordingWebhook = exports.webhook

exports.getRecording = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    const callLog = await prisma.callLog.findUnique({ where:{ id } })
    if (!callLog) return res.status(404).json({ message:"Call log not found" })
    if (!isAdminUser(req) && callLog.agentId !== toNumberOrNull(req.authUser?.id)) {
      return res.status(403).json({ message:"Access denied" })
    }
    if (!callLog.recordingUrl) return res.status(404).json({ message:"Recording is not available" })

    const recording = await getRecordingStream(callLog.recordingUrl)
    res.setHeader("Content-Type", recording.headers["content-type"] || "audio/mpeg")
    if (recording.headers["content-length"]) {
      res.setHeader("Content-Length", recording.headers["content-length"])
    }
    recording.data.on("error", (error) => {
      console.error("Twilio recording stream error:", error.message)
      if (!res.headersSent) res.status(502).end()
      else res.destroy(error)
    })
    recording.data.pipe(res)
  } catch (error) {
    console.error("Load recording error:", error.message)
    if (!res.headersSent) res.status(error.response?.status || 502).json({ message:"Unable to load recording" })
  }
}

exports.getAnalytics = async (req, res) => {
  try {
    if (!isAdminUser(req)) return res.status(403).json({ message:"Admin access required" })
    const calls = await prisma.callLog.findMany({ where:buildWhereFromQuery(req.query) })
    const totalCalls = calls.length
    const answeredCalls = calls.filter((call) => ["completed", "connected"].includes(call.status)).length
    const missedCalls = calls.filter((call) => ["no-answer", "failed", "busy"].includes(call.status)).length
    const durationTotal = calls.reduce((sum, call) => sum + (call.duration || 0), 0)
    res.status(200).json({
      totalCalls,
      answeredCalls,
      missedCalls,
      averageDuration:totalCalls ? Math.round(durationTotal / totalCalls) : 0,
      qualifiedLeads:calls.filter((call) => call.disposition === "Qualified").length,
    })
  } catch (error) {
    res.status(500).json({ message:"Unable to load analytics" })
  }
}
