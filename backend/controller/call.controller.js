const prisma = require("../lib/prisma")
const { startProviderCall } = require("../services/callProvider.service")
const { handleCallbackFollowUpSaved } = require("../services/callbackReminder.service")
const {
  buildBridgeTwiml,
  getRecordingStream,
  verifyWebhookToken,
} = require("../services/twilioVoice.service")
const mcubeVoice = require("../services/mcubeVoice.service")

const allowedDispositions = new Set([
  "Qualified",
  "Callback Later",
  "Interested Project",
  "Site Visit Scheduled",
  "Not Interested",
  "Wrong Number",
  "Junk",
  "No Answer",
  "Busy",
  "Follow-up Required",
])

const terminalCallStatuses = new Set(["completed", "failed", "no-answer", "busy", "canceled"])
const activeCallStatuses = ["initiated", "queued", "calling", "ringing", "connected", "in-progress"]

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

const toDurationSeconds = (value) => {
  if (value === undefined || value === null || value === "") return null
  const text = String(value).trim()
  if (/^\d+$/.test(text)) return Number(text)
  const parts = text.split(":").map((item) => Number(item))
  if (parts.some((item) => Number.isNaN(item))) return null
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2]
  if (parts.length === 2) return (parts[0] * 60) + parts[1]
  return null
}

const last10 = (value) => cleanPhone(value).slice(-10)

const getLeadPhone = (lead) => {
  const phones = lead?.phones
  if (!phones) return ""
  if (Array.isArray(phones)) {
    const first = phones.find(Boolean)
    return cleanPhone(typeof first === "object" ? first.value || first.phone || first.number : first)
  }
  if (typeof phones === "object") return cleanPhone(phones.value || phones.phone || phones.number)
  return cleanPhone(phones)
}

const isSamePhone = (first, second) => {
  const firstDigits = cleanPhone(first)
  const secondDigits = cleanPhone(second)
  if (!firstDigits || !secondDigits) return false
  if (firstDigits === secondDigits) return true
  return firstDigits.length >= 10 &&
    secondDigits.length >= 10 &&
    firstDigits.slice(-10) === secondDigits.slice(-10)
}

const matchesPhone = (first, second) => {
  const firstDigits = last10(first)
  const secondDigits = last10(second)
  return Boolean(firstDigits && secondDigits && firstDigits === secondDigits)
}

const getAllLeadPhones = (lead) => {
  const phones = lead?.phones
  const values = []
  if (Array.isArray(phones)) {
    phones.forEach((phone) => values.push(typeof phone === "object" ? phone.value || phone.phone || phone.number : phone))
  } else if (phones && typeof phones === "object") {
    values.push(phones.value || phones.phone || phones.number)
  } else if (phones) {
    values.push(phones)
  }
  return values.map(cleanPhone).filter(Boolean)
}

const findLeadByPhone = async (phone) => {
  const target = last10(phone)
  if (!target) return null
  const leads = await prisma.lead.findMany({
    where:{ is_delete:false },
    select:{ id:true, phones:true, teamId:true },
    orderBy:{ updatedAt:"desc" },
  })
  return leads.find((lead) => getAllLeadPhones(lead).some((item) => matchesPhone(item, target))) || null
}

const findUserByPhone = async (phone) => {
  const target = last10(phone)
  if (!target) return null
  const users = await prisma.user.findMany({
    select:{ id:true, phone:true, secondaryPhone:true },
  })
  return users.find((user) => matchesPhone(user.phone, target) || matchesPhone(user.secondaryPhone, target)) || null
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
    answer:"connected",
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

    const agentPhone = requestedAgentPhone || cleanPhone(agent.phone || agent.secondaryPhone || process.env.MCUBE_DEFAULT_AGENT_NUMBER)
    if (!agentPhone || agentPhone.length < 10) {
      return res.status(400).json({ message:"Sales user phone is required before starting call" })
    }
    if (isSamePhone(agentPhone, leadPhone)) {
      return res.status(400).json({
        message:"Agent and lead phone numbers must be different. Enter your own phone as the agent number.",
      })
    }

    const activeCall = await prisma.callLog.findFirst({
      where:{
        leadId,
        agentId,
        provider:String(process.env.CALL_PROVIDER || "twilio").trim().toLowerCase(),
        status:{ in:activeCallStatuses },
        createdAt:{ gte:new Date(Date.now() - 10 * 60 * 1000) },
      },
      include:callInclude,
      orderBy:{ createdAt:"desc" },
    })

    if (activeCall) {
      return res.status(409).json({
        message:"A call is already active for this lead. Please wait for it to disconnect, then dispose the call.",
        callLog:activeCall,
      })
    }

    pendingCallLog = await prisma.callLog.create({
      data:{
        leadId,
        agentId,
        phone:leadPhone,
        leadPhone,
        agentPhone,
        provider:String(process.env.CALL_PROVIDER || "twilio").trim().toLowerCase(),
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
      message:providerResult.message || "Call initiated. The provider will call the agent first.",
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
  if (["Callback Later", "Follow-up Required", "Site Visit Scheduled", "Interested Project"].includes(disposition)) return "Qualified"
  return "New"
}

const buildFollowUpTime = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

exports.disposeCall = async (req, res) => {
  try {
    let callLogId = toNumberOrNull(req.body.callLogId || req.body.id)
    const leadId = toNumberOrNull(req.body.leadId)
    const disposition = String(req.body.disposition || "").trim()
    const notes = String(req.body.notes || "").trim() || null
    const nextFollowUpAt = toDateOrNull(req.body.nextFollowUpAt || req.body.nextFollowUpDateTime)
    const visitDateTime = toDateOrNull(req.body.visitDateTime)
    const interestedProjectId = toNumberOrNull(req.body.interestedProjectId || req.body.projectId)
    let interestedProject = String(req.body.interestedProject || "").trim() || null
    const budget = String(req.body.budget || "").trim() || null
    const callStatus = normalizeCallStatus(req.body.callStatus || req.body.status || "completed")

    if (!allowedDispositions.has(disposition)) {
      return res.status(400).json({ message:"Invalid disposition" })
    }
    if (["Callback Later", "Follow-up Required"].includes(disposition) && !nextFollowUpAt) {
      return res.status(400).json({ message:"Next follow-up date and time are required" })
    }
    if (disposition === "Site Visit Scheduled" && !visitDateTime) {
      return res.status(400).json({ message:"Visit date and time are required" })
    }

    if (interestedProjectId) {
      const project = await prisma.project.findUnique({
        where:{ id:interestedProjectId },
        select:{ id:true, name:true },
      })
      if (!project) return res.status(400).json({ message:"Selected interested project is invalid" })
      interestedProject = project.name
    }

    let existingCall = null
    if (callLogId) {
      existingCall = await prisma.callLog.findUnique({
        where:{ id:callLogId },
        include:{ lead:true, agent:true },
      })
    } else {
      if (!leadId) return res.status(400).json({ message:"leadId or callLogId is required" })
      const authUserId = toNumberOrNull(req.authUser?.id)
      const requestedAgentId = toNumberOrNull(req.body.agentId)
      const agentId = isAdminUser(req) ? requestedAgentId || authUserId : authUserId
      if (!agentId) return res.status(400).json({ message:"agentId is required" })

      const [lead, agent] = await Promise.all([
        prisma.lead.findUnique({ where:{ id:leadId } }),
        prisma.user.findUnique({ where:{ id:agentId } }),
      ])
      if (!lead) return res.status(404).json({ message:"Lead not found" })
      if (!agent) return res.status(404).json({ message:"Agent not found" })
      if (!isAdminUser(req) && lead.teamId && lead.teamId !== agentId) {
        return res.status(403).json({ message:"You can dispose only your assigned leads" })
      }

      existingCall = await prisma.callLog.create({
        data:{
          leadId,
          agentId,
          phone:cleanPhone(req.body.leadPhone || req.body.phone) || getLeadPhone(lead) || "-",
          leadPhone:cleanPhone(req.body.leadPhone || req.body.phone) || getLeadPhone(lead) || null,
          agentPhone:cleanPhone(req.body.agentPhone || agent.phone || agent.secondaryPhone) || null,
          provider:"manual",
          status:callStatus,
          startedAt:new Date(),
          endedAt:terminalCallStatuses.has(callStatus) ? new Date() : null,
        },
        include:{ lead:true, agent:true },
      })
      callLogId = existingCall.id
    }
    if (!existingCall) return res.status(404).json({ message:"Call log not found" })
    if (!isAdminUser(req) && existingCall.agentId !== toNumberOrNull(req.authUser?.id)) {
      return res.status(403).json({ message:"You can dispose only your own calls" })
    }

    let callbackFollowUp = null
    const result = await prisma.$transaction(async (tx) => {
      const nextLeadStatus = getDispositionLeadStatus(disposition)
      const callLog = await tx.callLog.update({
        where:{ id:callLogId },
        data:{
          status:callStatus,
          disposition,
          notes,
          nextFollowUpAt,
          interestedProjectId,
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
        callbackFollowUp = await tx.followUp.create({
          data:{
            leadId:existingCall.leadId,
            salesUserId:Number(existingCall.agentId || req.authUser.id),
            type:disposition === "Callback Later" ? "Callback" : "Call",
            followUpDate:nextFollowUpAt,
            followUpTime:buildFollowUpTime(nextFollowUpAt),
            priority:"Medium",
            notes:notes || (disposition === "Callback Later" ? "Callback later scheduled from call disposition." : null),
            status:"Pending",
          },
          include:{ lead:true },
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
    if (callbackFollowUp) handleCallbackFollowUpSaved(callbackFollowUp)

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

const verifyMcubeWebhook = (req) => {
  const expected = String(process.env.MCUBE_WEBHOOK_TOKEN || "").trim()
  if (!expected) return true
  const supplied =
    req.headers["x-mcube-token"] ||
    req.headers["x-webhook-token"] ||
    req.query.token ||
    req.body.token ||
    req.body.secretkey
  return String(supplied || "").trim() === expected
}

const getMcubePayloadValue = (req, keys) => firstWebhookValue({ ...req.query, ...req.body }, keys)

const getMcubeCallLookup = (req) => {
  const providerCallId = getMcubePayloadValue(req, [
    "callid",
    "callId",
    "call_id",
    "called",
    "uuid",
    "calluuid",
    "sid",
  ])
  const callLogId = toNumberOrNull(getMcubePayloadValue(req, ["callLogId", "call_log_id", "id"]))
  return { providerCallId:providerCallId ? String(providerCallId) : "", callLogId }
}

const getMcubeWebhookData = async (req, fallbackDirection = "outbound") => {
  const customerPhone = cleanPhone(getMcubePayloadValue(req, [
    "customernumber",
    "customerNumber",
    "custnumber",
    "cust_number",
    "caller",
    "callerid",
    "from",
    "CallFrom",
    "callto",
    "callTo",
    "leadPhone",
    "phone",
  ]))
  const agentPhone = cleanPhone(getMcubePayloadValue(req, [
    "emp_phone",
    "agentPhone",
    "agent_phone",
    "exenumber",
    "executive",
    "to",
    "CallTo",
  ]))
  const virtualNumber = cleanPhone(getMcubePayloadValue(req, [
    "did",
    "didnumber",
    "Didnumber",
    "virtualNumber",
    "virtual_number",
    "businessNumber",
    "callednumber",
    "clicktocalldid",
  ])) || cleanPhone(
    fallbackDirection === "inbound" ? process.env.MCUBE_INBOUND_NUMBER : process.env.MCUBE_OUTBOUND_NUMBER
  )
  const rawStatus = getMcubePayloadValue(req, [
    "status",
    "callstatus",
    "callStatus",
    "CallStatus",
    "dialstatus",
    "DialCallStatus",
    "msg",
  ])
  const durationValue = getMcubePayloadValue(req, [
    "duration",
    "CallDuration",
    "callduration",
    "talktime",
    "billsec",
    "answeredtime",
  ])
  const duration = toDurationSeconds(durationValue)
  const recordingUrl = getMcubePayloadValue(req, [
    "recording",
    "recordingUrl",
    "recording_url",
    "RecordingUrl",
    "filename",
    "audio",
  ])
  const startedAt = toDateOrNull(getMcubePayloadValue(req, ["starttime", "startTime", "StartTime", "callstarttime"]))
  const endedAtFromProvider = toDateOrNull(getMcubePayloadValue(req, ["endtime", "endTime", "EndTime", "callendtime"]))
  const status = endedAtFromProvider
    ? normalizeCallStatus(rawStatus || "completed") === "connected" ? "completed" : normalizeCallStatus(rawStatus || "completed")
    : rawStatus ? normalizeCallStatus(rawStatus) : (fallbackDirection === "inbound" ? "calling" : "initiated")
  const { providerCallId, callLogId } = getMcubeCallLookup(req)
  const direction = String(getMcubePayloadValue(req, ["direction", "calltype", "type"]) || fallbackDirection).toLowerCase()

  return {
    agentPhone,
    callLogId,
    customerPhone,
    direction,
    duration,
    endedAtFromProvider,
    providerCallId,
    recordingUrl,
    startedAt,
    status,
    virtualNumber,
  }
}

const findMcubeCallLog = async ({ providerCallId, callLogId }) => {
  if (!providerCallId && !callLogId) return null
  return prisma.callLog.findFirst({
    where:{
      provider:"mcube",
      OR:[
        ...(providerCallId ? [{ providerCallId }, { callId:providerCallId }] : []),
        ...(callLogId ? [{ id:callLogId }] : []),
      ],
    },
  })
}

const saveMcubeWebhookCall = async (req, fallbackDirection) => {
  if (!verifyMcubeWebhook(req)) {
    const error = new Error("Invalid MCube webhook token")
    error.statusCode = 403
    throw error
  }

  const data = await getMcubeWebhookData(req, fallbackDirection)
  const existingCall = await findMcubeCallLog(data)
  const lead = existingCall ? null : await findLeadByPhone(data.customerPhone)
  const agent = existingCall ? null : await findUserByPhone(data.agentPhone)
  const endedAt = terminalCallStatuses.has(data.status) ? data.endedAtFromProvider || new Date() : undefined
  const connectedAt = data.status === "connected" ? new Date() : undefined
  const notesPrefix = data.direction === "inbound" ? "MCube inbound" : "MCube outbound"
  const notes = `${notesPrefix}${data.virtualNumber ? ` via ${data.virtualNumber}` : ""}`

  if (!existingCall && !lead) {
    return {
      callLog:null,
      matched:false,
      message:"MCube webhook accepted, but caller number did not match an existing lead.",
    }
  }

  if (existingCall) {
    const callLog = await prisma.callLog.update({
      where:{ id:existingCall.id },
      data:{
        ...(data.providerCallId && !existingCall.providerCallId ? {
          providerCallId:data.providerCallId,
          callId:data.providerCallId,
        } : {}),
        ...(data.status ? { status:data.status } : {}),
        ...(data.duration !== null ? { duration:data.duration } : {}),
        ...(data.recordingUrl ? { recordingUrl:String(data.recordingUrl) } : {}),
        ...(data.startedAt ? { startedAt:data.startedAt } : {}),
        ...(connectedAt && !existingCall.connectedAt ? { connectedAt } : {}),
        ...(endedAt ? { endedAt } : {}),
        notes:existingCall.notes || notes,
      },
      include:callInclude,
    })
    return { callLog, matched:true, message:"MCube call log updated" }
  }

  const callLog = await prisma.callLog.create({
    data:{
      leadId:lead.id,
      agentId:agent?.id || lead.teamId || null,
      phone:data.customerPhone,
      leadPhone:data.customerPhone,
      agentPhone:data.agentPhone || null,
      provider:"mcube",
      callId:data.providerCallId || null,
      providerCallId:data.providerCallId || null,
      status:data.status,
      duration:data.duration,
      recordingUrl:data.recordingUrl ? String(data.recordingUrl) : null,
      notes,
      startedAt:data.startedAt || new Date(),
      connectedAt:data.status === "connected" ? new Date() : null,
      endedAt:endedAt || null,
    },
    include:callInclude,
  })
  return { callLog, matched:true, message:"MCube call log created" }
}

exports.mcubeInbound = async (req, res) => {
  try {
    const result = await saveMcubeWebhookCall(req, "inbound")
    res.status(200).json(result)
  } catch (error) {
    console.error("MCube inbound webhook error:", error)
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to process MCube inbound call" })
  }
}

exports.mcubeWebhook = async (req, res) => {
  try {
    const result = await saveMcubeWebhookCall(req, "outbound")
    res.status(200).json(result)
  } catch (error) {
    console.error("MCube status webhook error:", error)
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to process MCube call status" })
  }
}

exports.mcubeRecordingWebhook = exports.mcubeWebhook

exports.getRecording = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    const callLog = await prisma.callLog.findUnique({ where:{ id } })
    if (!callLog) return res.status(404).json({ message:"Call log not found" })
    if (!isAdminUser(req) && callLog.agentId !== toNumberOrNull(req.authUser?.id)) {
      return res.status(403).json({ message:"Access denied" })
    }
    if (!callLog.recordingUrl) return res.status(404).json({ message:"Recording is not available" })

    const recording = callLog.provider === "mcube"
      ? await mcubeVoice.getRecordingStream(callLog.recordingUrl)
      : await getRecordingStream(callLog.recordingUrl)
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
