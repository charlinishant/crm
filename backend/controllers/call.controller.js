const fs = require("fs")
const path = require("path")
const prisma = require("../lib/prisma")
const { startProviderCall } = require("../services/callProvider.service")
const { handleCallbackFollowUpSaved } = require("../services/callbackReminder.service")
const mcubeVoice = require("../services/mcubeVoice.service")
const { connectedUser, getIO } = require("../socket")
const { normalizePhoneNumber } = require("../utils/phone")

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

const terminalCallStatuses = new Set(["completed", "failed", "no-answer", "missed", "busy", "canceled", "rejected"])
const activeCallStatuses = ["initiating", "initiated", "queued", "calling", "ringing", "connected", "in-progress"]
const liveCallStatuses = new Set(["connected", "in-progress"])
const MCUBE_STALE_ACTIVE_CALL_MS = Number(process.env.MCUBE_STALE_ACTIVE_CALL_MS) || 2 * 60 * 1000

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

const cleanPhone = (value) => normalizePhoneNumber(value)

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
    orderBy:{ id:"desc" },
  })
  return leads.find((lead) => getAllLeadPhones(lead).some((item) => matchesPhone(item, target))) || null
}

const findLeadMatchesByPhone = async (phone, agentId = null) => {
  const target = last10(phone)
  if (!target) return []
  const leads = await prisma.lead.findMany({
    where:{
      is_delete:false,
      ...(agentId ? { teamId:agentId } : {}),
    },
    select:{
      id:true,
      firstName:true,
      lastName:true,
      companyName:true,
      teamId:true,
      phones:true,
      status:true,
      channelPartner:true,
      tags:true,
      interestedProjects:true,
      propertyType:true,
      budget:true,
      budgetMin:true,
      budgetMax:true,
    },
    orderBy:{ id:"desc" },
  })
  return leads.filter((lead) => getAllLeadPhones(lead).some((item) => matchesPhone(item, target)))
}

const findBestLeadMatchesByPhone = async (phone, agentId = null) => {
  const assignedMatches = agentId ? await findLeadMatchesByPhone(phone, agentId) : []
  if (assignedMatches.length > 0) return assignedMatches
  return findLeadMatchesByPhone(phone)
}

const findUserByPhone = async (phone) => {
  const target = last10(phone)
  if (!target) return null
  const users = await prisma.user.findMany({
    select:{ id:true, phone:true, secondaryPhone:true },
  })
  return users.find((user) => matchesPhone(user.phone, target) || matchesPhone(user.secondaryPhone, target)) || null
}

const findUserByEmail = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase()
  if (!normalizedEmail) return null
  return prisma.user.findFirst({
    where:{ email:normalizedEmail, isActive:true },
    select:{ id:true, email:true, phone:true, secondaryPhone:true, firstName:true, lastName:true, username:true },
  })
}

const findUserByMcubeAgentId = async (agentProviderId) => {
  const providerId = String(agentProviderId || "").trim()
  if (!providerId) return null
  const mappedUserId = toNumberOrNull(getMappedConfigValue(process.env.MCUBE_AGENT_ID_MAP, [providerId]))
  if (!mappedUserId) return null
  return prisma.user.findUnique({
    where:{ id:mappedUserId },
    select:{ id:true, email:true, phone:true, secondaryPhone:true, firstName:true, lastName:true, username:true },
  })
}

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  (user?.id ? `User #${user.id}` : "")

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "")

const defaultMcubeAgentEmailsByPhone = {
  "9356532881":"huzaifp2003@gmail.com",
  "7249766173":"morenishant118@gmail.com",
}

const defaultMcubeAgentExtensionsByPhone = {
  "9356532881":"315",
  "7249766173":"260",
}

const defaultMcubeAgentModesByPhone = {
  "9356532881":"softphone",
  "7249766173":"hardphone",
}

const defaultMcubeAgentModesByEmail = {
  "huzaifp2003@gmail.com":"softphone",
  "morenishant118@gmail.com":"hardphone",
}

const getMcubeAgentEmailMap = () => {
  const raw = String(process.env.MCUBE_AGENT_EMAIL_MAP || "").trim()
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed
  } catch (error) {
    return raw.split(",").reduce((map, pair) => {
      const [phone, email] = pair.split(":").map((item) => String(item || "").trim())
      if (phone && email) map[cleanPhone(phone)] = email
      return map
    }, {})
  }

  return {}
}

const getMappedConfigValue = (raw, keys) => {
  const text = String(raw || "").trim()
  if (!text) return ""

  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return keys.map((key) => parsed[key]).find(Boolean) || ""
    }
  } catch (error) {
    const map = text.split(",").reduce((items, pair) => {
      const [key, value] = pair.split(":").map((item) => String(item || "").trim())
      if (key && value) items[key.toLowerCase()] = value
      return items
    }, {})
    return keys.map((key) => map[String(key || "").toLowerCase()]).find(Boolean) || ""
  }

  return ""
}

const parseMappedConfig = (raw) => {
  const text = String(raw || "").trim()
  if (!text) return {}

  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed
  } catch (error) {
    return text.split(",").reduce((items, pair) => {
      const [key, value] = pair.split(":").map((item) => String(item || "").trim())
      if (key && value) items[key] = value
      return items
    }, {})
  }

  return {}
}

const getMcubeAgentEmail = (agent, authUser) => {
  const useCrmEmailOnly = String(process.env.MCUBE_USE_CRM_USER_EMAIL || "").trim().toLowerCase() === "true"
  if (useCrmEmailOnly) return String(agent?.email || authUser?.email || "").trim().toLowerCase()

  const emailMap = {
    ...defaultMcubeAgentEmailsByPhone,
    ...getMcubeAgentEmailMap(),
  }
  const phones = [
    agent?.phone,
    agent?.secondaryPhone,
    authUser?.phone,
    authUser?.secondaryPhone,
  ].map(cleanPhone).filter(Boolean)

  const mappedEmail = phones.map((phone) => emailMap[phone]).find(Boolean)
  return String(mappedEmail || agent?.email || authUser?.email || "").trim().toLowerCase()
}

const getMcubeAgentExtension = (agent, authUser) => {
  const phones = [
    agent?.phone,
    agent?.secondaryPhone,
    authUser?.phone,
    authUser?.secondaryPhone,
  ].map(cleanPhone).filter(Boolean)
  const emails = [
    agent?.email,
    authUser?.email,
  ].map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)

  const mappedExtension = phones.map((phone) => defaultMcubeAgentExtensionsByPhone[phone]).find(Boolean)
  return String(
    getMappedConfigValue(process.env.MCUBE_AGENT_EXT_MAP, [...phones, ...emails]) ||
    mappedExtension ||
    ""
  ).trim()
}

const getMcubeAgentNumber = (agent, authUser) => {
  const phones = [
    agent?.phone,
    agent?.secondaryPhone,
    authUser?.phone,
    authUser?.secondaryPhone,
  ].map(cleanPhone).filter(Boolean)
  const emails = [
    agent?.email,
    authUser?.email,
  ].map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)

  return cleanPhone(
    getMappedConfigValue(process.env.MCUBE_AGENT_NUMBER_MAP || process.env.MCUBE_AGENT_PHONE_MAP, [...phones, ...emails]) ||
    agent?.phone ||
    agent?.secondaryPhone ||
    authUser?.phone ||
    authUser?.secondaryPhone ||
    process.env.MCUBE_DEFAULT_AGENT_NUMBER
  )
}

const getMcubeAgentMode = (agent, authUser) => {
  const phones = [
    agent?.phone,
    agent?.secondaryPhone,
    authUser?.phone,
    authUser?.secondaryPhone,
  ].map(cleanPhone).filter(Boolean)
  const emails = [
    agent?.email,
    authUser?.email,
  ].map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
  const mode = String(
    getMappedConfigValue(process.env.MCUBE_AGENT_MODE_MAP, [...phones, ...emails]) ||
    phones.map((phone) => defaultMcubeAgentModesByPhone[phone]).find(Boolean) ||
    emails.map((email) => defaultMcubeAgentModesByEmail[email]).find(Boolean) ||
    ""
  ).trim().toLowerCase()
  return mode === "softphone" ? "softphone" : "hardphone"
}

const getMcubeClickToCallAgentNumber = ({ agentMode, agentPhone, agentExtension }) =>
  agentMode === "softphone" && agentExtension ? agentExtension : agentPhone

const findUserByMcubeExtension = async (extension, agentLogin = "") => {
  const normalizedExtension = String(extension || "").replace(/\D/g, "")
  const login = String(agentLogin || "").trim().toLowerCase()
  if (!normalizedExtension && !login) return null

  const users = await prisma.user.findMany({
    select:{ id:true, email:true, phone:true, secondaryPhone:true },
  })
  const extensionMap = {
    ...defaultMcubeAgentExtensionsByPhone,
    ...parseMappedConfig(process.env.MCUBE_AGENT_EXT_MAP),
  }

  return users.find((user) => {
    const phones = [user.phone, user.secondaryPhone].map(cleanPhone).filter(Boolean)
    const emails = [user.email].map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)
    const configuredExtension = [...phones, ...emails]
      .map((key) => String(extensionMap[key] || extensionMap[key.toLowerCase?.()] || "").replace(/\D/g, ""))
      .find(Boolean)

    return (normalizedExtension && configuredExtension === normalizedExtension) ||
      (login && emails.includes(login))
  }) || null
}

const findAvailableInboundAgent = async () => {
  const configuredAgentId = toNumberOrNull(process.env.MCUBE_INBOUND_AGENT_ID || process.env.MCUBE_DEFAULT_AGENT_ID)
  const configuredEmail = String(process.env.MCUBE_INBOUND_AGENT_EMAIL || "").trim().toLowerCase()
  const configuredPhone = cleanPhone(process.env.MCUBE_INBOUND_AGENT_PHONE || process.env.MCUBE_DEFAULT_AGENT_NUMBER)
  const configuredAgent =
    (configuredAgentId ? await prisma.user.findUnique({ where:{ id:configuredAgentId } }) : null) ||
    await findUserByEmail(configuredEmail) ||
    await findUserByPhone(configuredPhone)
  if (configuredAgent) return configuredAgent

  const attendance = await prisma.userAttendance.findFirst({
    where:{
      logoutAt:null,
      status:{ in:["Available", "On Call"] },
      user:{
        isActive:true,
        role:{ in:["SALES", "PRE_SALES", "MANAGER"] },
      },
    },
    include:{
      user:{
        select:{ id:true, email:true, phone:true, secondaryPhone:true, firstName:true, lastName:true, username:true },
      },
    },
    orderBy:{ updatedAt:"desc" },
  })
  return attendance?.user || null
}

const isAdminUser = (req) =>
  ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(String(req.authUser?.role || "").toUpperCase())

const getSalesCallAccessWhere = (userId) => ({
  OR:[
    { agentId:userId },
    { lead:{ teamId:userId } },
    {
      direction:"inbound",
      agentId:null,
      leadId:null,
      provider:{ in:["mcube", "mcube-webphone"] },
    },
  ],
})

const isUnassignedMcubeInboundCall = (callLog) =>
  String(callLog?.direction || "").toLowerCase() === "inbound" &&
  !callLog?.agentId &&
  !callLog?.leadId &&
  ["mcube", "mcube-webphone"].includes(String(callLog?.provider || "").toLowerCase())

const canAccessCallLog = (req, callLog) =>
  isAdminUser(req) ||
  callLog.agentId === toNumberOrNull(req.authUser?.id) ||
  callLog.lead?.teamId === toNumberOrNull(req.authUser?.id) ||
  isUnassignedMcubeInboundCall(callLog)

const normalizeCallStatus = (value) => {
  const status = String(value || "initiated").toLowerCase().replace(/[_\s]+/g, "-")
  const aliases = {
    answer:"connected",
    answered:"connected",
    connected:"connected",
    calling:"initiating",
    queued:"initiated",
    ringing:"ringing",
    "in-progress":"connected",
    disconnected:"completed",
    disconnect:"completed",
    hangup:"completed",
    "hang-up":"completed",
    complete:"completed",
    completed:"completed",
    busy:"busy",
    "no-answer":"no-answer",
    "no-answered":"no-answer",
    no_answer:"no-answer",
    noanswer:"no-answer",
    missed:"missed",
    reject:"rejected",
    rejected:"failed",
    failed:"failed",
    cancel:"canceled",
    canceled:"canceled",
    cancelled:"canceled",
  }
  return aliases[status] || status
}

const normalizeCallDirection = (value, fallbackDirection = "outbound") => {
  if ((value === undefined || value === null || value === "") && fallbackDirection === "") return ""
  const direction = String(value || fallbackDirection || "outbound").trim().toLowerCase().replace(/[_\s]+/g, "-")
  const aliases = {
    in:"inbound",
    incoming:"inbound",
    inbound:"inbound",
    received:"inbound",
    receive:"inbound",
    out:"outbound",
    outgoing:"outbound",
    outbound:"outbound",
    dialout:"outbound",
    "click-to-call":"outbound",
  }
  return aliases[direction] || fallbackDirection
}

const isConfiguredInboundNumber = (value) => {
  const number = cleanPhone(value)
  if (!number) return false
  const configuredNumbers = [
    process.env.MCUBE_INBOUND_NUMBER,
    process.env.MCUBE_INBOUND_NUMBERS,
  ]
    .flatMap((item) => String(item || "").split(","))
    .map(cleanPhone)
    .filter(Boolean)

  return configuredNumbers.some((configuredNumber) => matchesPhone(configuredNumber, number))
}

const recordingPayloadKeys = [
  "recording",
  "record",
  "recordingUrl",
  "recordingurl",
  "recording_url",
  "Recording",
  "RecordingUrl",
  "RecordingURL",
  "callrecording",
  "callRecording",
  "call_recording",
  "callrecordingurl",
  "callRecordingUrl",
  "call_recording_url",
  "recordurl",
  "recordUrl",
  "recordURL",
  "record_url",
  "recordinglink",
  "recordingLink",
  "recording_link",
  "downloadurl",
  "downloadUrl",
  "downloadURL",
  "download_url",
  "playurl",
  "playUrl",
  "playURL",
  "play_url",
  "recordingdownloadurl",
  "recordingDownloadUrl",
  "recording_download_url",
  "url",
  "URL",
  "mp3",
  "wav",
  "wave",
  "filename",
  "fileName",
  "file",
  "fileurl",
  "fileUrl",
  "file_url",
  "audio",
  "audioUrl",
  "audio_url",
  "recordingfile",
  "recordingFile",
  "recording_file",
  "voicefile",
  "voiceFile",
  "voice_file",
  "recfile",
  "recFile",
  "rec_file",
  "recurl",
  "recUrl",
  "rec_url",
  "recordedfile",
  "recordedFile",
  "recorded_file",
  "recordingpath",
  "recordingPath",
  "recording_path",
  "callRecordingPath",
  "call_recording_path",
]

const getRecordingValue = (req) => getMcubePayloadValue(req, recordingPayloadKeys)

const callStatusPriority = {
  initiating:1,
  initiated:1,
  queued:1,
  calling:2,
  ringing:2,
  connected:3,
  "in-progress":3,
  completed:4,
  "no-answer":4,
  missed:4,
  busy:4,
  rejected:4,
  failed:4,
  canceled:4,
}

const isFinalCallStatus = (status) => terminalCallStatuses.has(normalizeCallStatus(status))

const callInclude = {
  lead: {
    select: {
      id:true,
      firstName:true,
      lastName:true,
      companyName:true,
      teamId:true,
      phones:true,
      status:true,
      channelPartner:true,
      tags:true,
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
  if (query.direction) {
    const direction = String(query.direction).trim().toLowerCase()
    if (direction === "inbound" || direction === "outbound") where.direction = direction
  }
  if (query.callerNumber) {
    const phoneQuery = cleanPhone(query.callerNumber).slice(-10) || String(query.callerNumber)
    where.OR = [
      ...(where.OR || []),
      { leadPhone:{ contains:phoneQuery } },
      { phone:{ contains:phoneQuery } },
    ]
  }
  if (query.agentExtension) where.agentExtension = { contains:String(query.agentExtension).replace(/\D/g, "") }
  if (query.campaign) where.OR = [...(where.OR || []), { campaignName:{ contains:String(query.campaign) } }, { queueName:{ contains:String(query.campaign) } }]
  if (query.recordingAvailable === "true") where.recordingUrl = { not:null }
  if (query.recordingAvailable === "false") where.recordingUrl = null
  if (query.from || query.to) {
    where.createdAt = {}
    if (query.from) where.createdAt.gte = new Date(query.from)
    if (query.to) where.createdAt.lte = new Date(query.to)
  }
  return where
}

const getRecordingUrlFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") return ""
  const flattened = flattenWebhookPayload(payload)
  return normalizeRecordingUrl(firstWebhookValue(flattened, recordingPayloadKeys))
}

const getPayloadValue = (payload, keys) => {
  if (!payload || typeof payload !== "object") return null
  return firstWebhookValue(flattenWebhookPayload(payload), keys)
}

const getPayloadPhone = (payload, keys) => cleanPhone(getPayloadValue(payload, keys))

const getCallLogDisplayNumber = (callLog) =>
  callLog.callerNumber ||
  callLog.customerNumber ||
  callLog.leadPhone ||
  callLog.phone ||
  getPayloadPhone(callLog.rawPayload, [
    "callto",
    "callTo",
    "CallTo",
    "customernumber",
    "customerNumber",
    "caller",
    "callerid",
    "callerNumber",
    "mobile",
    "from",
    "phone",
  ])

const getCallLogPayloadAgentPhone = (callLog) => getPayloadPhone(callLog.rawPayload, [
  "emp_phone",
  "empphone",
  "agentPhone",
  "agent_phone",
  "exenumber",
  "executive",
])

const hydrateCallLogFromPayload = (callLog) => {
  const payload = callLog.rawPayload
  if (!payload || typeof payload !== "object") return callLog

  const displayNumber = getCallLogDisplayNumber(callLog)
  const agentPhone = callLog.agentPhone || getCallLogPayloadAgentPhone(callLog)
  const virtualNumber = callLog.virtualNumber || getPayloadPhone(payload, [
    "clicktocalldid",
    "clickToCallDid",
    "did",
    "didnumber",
    "virtualNumber",
    "businessNumber",
    "callednumber",
  ])
  const providerStatus = callLog.providerStatus || String(getPayloadValue(payload, [
    "dialstatus",
    "DialCallStatus",
    "callstatus",
    "callStatus",
    "status",
    "msg",
  ]) || "").trim()
  const normalizedProviderStatus = providerStatus ? normalizeCallStatus(providerStatus) : ""
  const currentStatus = String(callLog.status || "").toLowerCase()
  const status = normalizedProviderStatus && (!currentStatus || activeCallStatuses.includes(currentStatus))
    ? normalizedProviderStatus
    : callLog.status || normalizedProviderStatus
  const duration = callLog.duration ?? toDurationSeconds(getPayloadValue(payload, [
    "duration",
    "CallDuration",
    "callduration",
    "talktime",
    "billsec",
    "answeredtime",
  ]))

  return {
    ...callLog,
    phone:callLog.phone || displayNumber || "-",
    leadPhone:callLog.leadPhone || displayNumber || null,
    callerNumber:callLog.callerNumber || (String(callLog.direction || "").toLowerCase() === "inbound" ? displayNumber || null : callLog.callerNumber),
    customerNumber:callLog.customerNumber || displayNumber || null,
    agentPhone:agentPhone || null,
    agentNumber:callLog.agentNumber || agentPhone || null,
    virtualNumber:virtualNumber || null,
    campaignName:callLog.campaignName || String(getPayloadValue(payload, ["groupname", "groupName", "campaignName", "campaign"]) || "").trim() || null,
    queueName:callLog.queueName || String(getPayloadValue(payload, ["queue", "queueName", "queue_id", "skill"]) || "").trim() || null,
    providerAgentName:callLog.providerAgentName || String(getPayloadValue(payload, ["agentname", "agentName", "executiveName", "emp_name"]) || "").trim() || null,
    providerStatus:providerStatus || null,
    status:status || callLog.status,
    duration,
    disconnectedBy:callLog.disconnectedBy || String(getPayloadValue(payload, ["disconnectedby", "disconnectedBy", "hangupBy", "hangup_by"]) || "").trim() || null,
    startedAt:callLog.startedAt || toDateOrNull(getPayloadValue(payload, ["starttime", "startTime", "StartTime", "callstarttime"])),
    endedAt:callLog.endedAt || toDateOrNull(getPayloadValue(payload, ["endtime", "endTime", "EndTime", "callendtime"])),
  }
}

const hydrateCallLogRecording = (callLog) => {
  const recoveredRecordingUrl = callLog.recordingUrl || getRecordingUrlFromPayload(callLog.rawPayload)
  return recoveredRecordingUrl && recoveredRecordingUrl !== callLog.recordingUrl
    ? { ...callLog, recordingUrl:recoveredRecordingUrl }
    : callLog
}

const backfillRecoveredRecordings = async (callLogs) => {
  const updates = callLogs
    .map((callLog) => ({
      id:callLog.id,
      recordingUrl:!callLog.recordingUrl ? getRecordingUrlFromPayload(callLog.rawPayload) : "",
    }))
    .filter((item) => item.recordingUrl)

  if (!updates.length) return

  await Promise.all(updates.map((item) =>
    prisma.callLog.updateMany({
      where:{ id:item.id, recordingUrl:null },
      data:{ recordingUrl:item.recordingUrl },
    })
  ))
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
  await backfillRecoveredRecordings(data)
  res.status(200).json({
    page,
    limit,
    totalItems,
    data:data.map((callLog) => hydrateCallLogFromPayload(hydrateCallLogRecording(callLog))),
  })
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
        provider:"mcube",
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
        provider:"mcube",
        status:"initiated",
        notes:"MCube outbound",
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
    // Do not overwrite a newer status if the provider callback arrived before
    // its connect API response was persisted.
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

exports.startBrowserPhone = async (req, res) => {
  try {
    const leadId = toNumberOrNull(req.body.leadId)
    const authUserId = toNumberOrNull(req.authUser?.id)
    const requestedAgentId = toNumberOrNull(req.body.agentId)
    const agentId = isAdminUser(req) ? requestedAgentId || authUserId : authUserId
    const leadPhone = cleanPhone(req.body.leadPhone || req.body.phone)

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

    const agentPhone = cleanPhone(req.body.agentPhone || agent.phone || agent.secondaryPhone || process.env.MCUBE_DEFAULT_AGENT_NUMBER)
    const crmAgentEmail = String(agent.email || req.authUser?.email || "").trim().toLowerCase()
    const agentEmail = getMcubeAgentEmail(agent, req.authUser)
    const agentExtension = String(req.body.agentExtension || getMcubeAgentExtension(agent, req.authUser)).trim()
    const agentMode = getMcubeAgentMode(agent, req.authUser)
    const clickToCallAgentNumber = getMcubeClickToCallAgentNumber({ agentMode, agentPhone, agentExtension })
    if (!agentEmail) {
      return res.status(400).json({ message:"Sales user email is required for MCube browser phone login" })
    }
    if (!clickToCallAgentNumber) {
      return res.status(400).json({ message:"MCube agent number or extension is required before starting call" })
    }

    await prisma.callLog.updateMany({
      where:{
        leadId,
        agentId,
        provider:"mcube-webphone",
        status:{ in:activeCallStatuses },
        createdAt:{ gte:new Date(Date.now() - 10 * 60 * 1000) },
      },
      data:{
        status:"canceled",
        endedAt:new Date(),
        notes:"MCube outbound - canceled automatically before a new browser call was started.",
      },
    })

    let callLog = await prisma.callLog.create({
      data:{
        leadId,
        agentId,
        phone:leadPhone,
        leadPhone,
        agentPhone:agentPhone || null,
        provider:"mcube-webphone",
        status:"initiated",
        notes:"MCube outbound",
        startedAt:new Date(),
      },
      include:callInclude,
    })

    const widgetUrls = mcubeVoice.buildBrowserPhoneUrl({
      agentEmail,
      agentExtension,
      agentPhone,
      leadPhone,
      callLogId:callLog.id,
      leadId,
      agentId,
      agentName:getUserName(agent),
      leadName:getLeadName(lead),
    })

    let providerResult = null
    let providerWarning = ""

    try {
      providerResult = await mcubeVoice.connectTwoNumbers({
        agentExtension,
        agentPhone:clickToCallAgentNumber,
        leadPhone,
        callLogId:callLog.id,
        leadId,
      })
      await prisma.callLog.update({
        where:{ id:callLog.id },
        data:{
          callId:providerResult.providerCallId,
          providerCallId:providerResult.providerCallId,
          provider:providerResult.provider,
        },
      })
      await prisma.callLog.updateMany({
        where:{ id:callLog.id, status:"initiated" },
        data:{ status:normalizeCallStatus(providerResult.status || "initiated") },
      })
    } catch (providerError) {
      providerWarning = providerError.message || "MCube click2call request was not accepted."
      await prisma.callLog.update({
        where:{ id:callLog.id },
        data:{
          callId:`mcube-widget-${callLog.id}`,
          providerCallId:`mcube-widget-${callLog.id}`,
          notes:`MCube outbound - widget opened. Click2call API warning: ${providerWarning}`,
        },
      })
    }

    callLog = await prisma.callLog.findUnique({
      where:{ id:callLog.id },
      include:callInclude,
    })

    res.status(201).json({
      message:providerWarning
        ? "MCube widget opened for this lead. Use the browser softphone to place the outbound call."
        : providerResult.message || "Browser phone ready. MCube outbound call sent to the selected lead.",
      callLog,
      launchUrl:widgetUrls.authUrl,
      widgetUrl:widgetUrls.phoneUrl,
      providerWarning,
      crmUsername:crmAgentEmail,
      mcubeUsername:agentEmail,
      agentExtension,
      agentCallingMode:agentMode,
      agentPhone,
      clickToCallAgentNumber,
      leadPhone,
      provider:"mcube-webphone",
    })
  } catch (error) {
    console.error("Start browser phone error:", error.message)
    res.status(error.statusCode || 500).json({
      message:error.message || "Unable to start browser phone",
    })
  }
}

exports.clickToCallLead = async (req, res) => {
  let callLog = null
  const startedAtMs = Date.now()
  try {
    const leadId = toNumberOrNull(req.body.leadId)
    const agentId = toNumberOrNull(req.authUser?.id)
    const requestId = String(req.body.requestId || `${Date.now()}-${Math.random()}`).trim()

    if (!leadId) return res.status(400).json({ message:"leadId is required" })
    if (!agentId) return res.status(401).json({ message:"Authentication is required" })
    if (!requestId) return res.status(400).json({ message:"requestId is required" })

    const [lead, agent] = await Promise.all([
      prisma.lead.findUnique({ where:{ id:leadId } }),
      prisma.user.findUnique({ where:{ id:agentId } }),
    ])
    if (!lead) return res.status(404).json({ message:"Lead not found" })
    if (!agent) return res.status(404).json({ message:"Agent not found" })
    if (!isAdminUser(req) && lead.teamId && lead.teamId !== agentId) {
      return res.status(403).json({ message:"You can call only your assigned leads" })
    }

    const leadPhone = getLeadPhone(lead)
    if (!leadPhone || leadPhone.length < 10) {
      return res.status(400).json({ message:"Customer phone number is unavailable." })
    }

    const agentPhone = getMcubeAgentNumber(agent, req.authUser)
    const agentExtension = getMcubeAgentExtension(agent, req.authUser)
    const agentMode = getMcubeAgentMode(agent, req.authUser)
    if (!agentPhone) {
      return res.status(400).json({ message:"MCUBE calling number is not configured for this user." })
    }

    const activeCall = await prisma.callLog.findFirst({
      where:{
        agentId,
        provider:{ in:["mcube", "mcube-webphone"] },
        status:{ in:activeCallStatuses },
      },
      include:callInclude,
      orderBy:{ createdAt:"desc" },
    })

    if (activeCall) {
      const activeStatus = normalizeCallStatus(activeCall.status)
      const activeAt = activeCall.startedAt || activeCall.createdAt
      const activeAgeMs = activeAt ? Date.now() - new Date(activeAt).getTime() : 0

      if (liveCallStatuses.has(activeStatus) && activeAgeMs < 30 * 60 * 1000) {
        return res.status(409).json({
          success:false,
          message:"Another call is currently active. Please complete it before starting a new call.",
          callLog:activeCall,
        })
      }

      if (!liveCallStatuses.has(activeStatus) && activeAgeMs > MCUBE_STALE_ACTIVE_CALL_MS) {
        await prisma.callLog.update({
          where:{ id:activeCall.id },
          data:{
            status:"canceled",
            endedAt:new Date(),
            notes:activeCall.notes || "MCube outbound call was canceled after becoming stale.",
          },
        }).catch(() => null)
      } else {
        return res.status(409).json({
          success:false,
          message:"Another call is currently active. Please wait before starting a new call.",
          callLog:activeCall,
        })
      }
    }

    callLog = await prisma.callLog.create({
      data:{
        leadId,
        agentId,
        phone:leadPhone,
        leadPhone,
        agentPhone:agentPhone || null,
        provider:"mcube",
        status:"initiating",
        notes:`MCube outbound click2call request ${requestId}`,
        startedAt:new Date(),
      },
      include:callInclude,
    })

    const providerResult = await mcubeVoice.connectTwoNumbers({
      agentExtension,
      agentPhone,
      leadPhone,
      callLogId:callLog.id,
      leadId,
      requestId,
    })

    callLog = await prisma.callLog.update({
      where:{ id:callLog.id },
      data:{
        callId:providerResult.providerCallId,
        providerCallId:providerResult.providerCallId,
        status:normalizeCallStatus(providerResult.status || "initiated"),
      },
      include:callInclude,
    })

    console.info("MCube click2call initiated", {
      userId:agentId,
      leadId,
      callLogId:callLog.id,
      providerCallId:providerResult.providerCallId,
      providerStatus:providerResult.status,
      agentMode,
      durationMs:Date.now() - startedAtMs,
    })

    res.status(201).json({
      success:true,
      message:"Call initiated successfully",
      data:{
        callLogId:callLog.id,
        providerCallId:callLog.providerCallId || callLog.callId || "",
        leadId,
        status:String(callLog.status || "initiated").toUpperCase(),
        requestId,
      },
      callLog,
    })
  } catch (error) {
    console.error("MCube click2call error:", {
      callLogId:callLog?.id || null,
      message:error.message,
      statusCode:error.statusCode || 500,
      durationMs:Date.now() - startedAtMs,
    })
    if (callLog?.id) {
      await prisma.callLog.update({
        where:{ id:callLog.id },
        data:{
          status:"failed",
          endedAt:new Date(),
          notes:`MCube outbound click2call failed: ${error.message || "Provider error"}`,
        },
      }).catch(() => null)
    }
    res.status(error.statusCode || 500).json({
      success:false,
      message:error.statusCode && error.statusCode < 500
        ? error.message
        : "MCUBE could not initiate the call. Please try again.",
      data:{
        callLogId:callLog?.id || null,
        status:"FAILED",
      },
    })
  }
}

exports.getBrowserPhoneWidget = async (req, res) => {
  try {
    const authUserId = toNumberOrNull(req.authUser?.id)
    const agent = authUserId ? await prisma.user.findUnique({ where:{ id:authUserId } }) : null
    if (!agent) return res.status(404).json({ message:"Agent not found" })

    const agentPhone = cleanPhone(agent.phone || agent.secondaryPhone || process.env.MCUBE_DEFAULT_AGENT_NUMBER)
    const agentEmail = getMcubeAgentEmail(agent, req.authUser)
    const agentExtension = getMcubeAgentExtension(agent, req.authUser)
    const agentMode = getMcubeAgentMode(agent, req.authUser)
    const widgetUrls = mcubeVoice.buildBrowserPhoneUrl({
      agentEmail,
      agentExtension,
      agentPhone,
      agentId:agent.id,
      agentName:getUserName(agent),
    })

    res.status(200).json({
      widgetUrl:widgetUrls.authUrl,
      mcubeUsername:agentEmail,
      agentExtension,
      agentPhone,
      agentCallingMode:agentMode,
    })
  } catch (error) {
    console.error("MCube widget login error:", error.message)
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to load MCube widget" })
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
      const authUserId = toNumberOrNull(req.authUser?.id)
      const requestedAgentId = toNumberOrNull(req.body.agentId)
      const agentId = isAdminUser(req) ? requestedAgentId || authUserId : authUserId
      if (!agentId) return res.status(400).json({ message:"agentId is required" })

      const [lead, agent] = await Promise.all([
        leadId ? prisma.lead.findUnique({ where:{ id:leadId } }) : Promise.resolve(null),
        prisma.user.findUnique({ where:{ id:agentId } }),
      ])
      if (leadId && !lead) return res.status(404).json({ message:"Lead not found" })
      if (!agent) return res.status(404).json({ message:"Agent not found" })
      if (!isAdminUser(req) && lead?.teamId && lead.teamId !== agentId) {
        return res.status(403).json({ message:"You can dispose only your assigned leads" })
      }

      const isInboundCall = String(req.body.direction || "").toLowerCase() === "inbound"
      const callPhone = cleanPhone(req.body.leadPhone || req.body.phone || req.body.callerNumber || req.body.customerNumber) || (lead ? getLeadPhone(lead) : "") || "-"
      let callLead = lead
      let callLeadId = leadId || null

      if (!callLeadId && isInboundCall) {
        const matchedLead = callPhone === "-" ? null : await findLeadByPhone(callPhone)
        callLead = matchedLead || await prisma.lead.create({
          data:{
            firstName:"Unknown",
            lastName:"Caller",
            phones:callPhone === "-" ? [] : [{ type:"Mobile", value:callPhone, primary:true }],
            status:"New",
            teamId:agentId,
            seats:0,
            tenure:0,
            industry:"",
            is_delete:false,
            is_active:true,
          },
        })
        callLeadId = callLead.id
      }

      existingCall = await prisma.callLog.create({
        data:{
          leadId:callLeadId,
          agentId,
          phone:callPhone,
          leadPhone:callPhone === "-" ? null : callPhone,
          agentPhone:cleanPhone(req.body.agentPhone || agent.phone || agent.secondaryPhone) || null,
          status:callStatus,
          notes:isInboundCall ? "Manual inbound disposition" : null,
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

    if (String(existingCall.direction || req.body.direction || "").toLowerCase() === "inbound" && !existingCall.leadId) {
      const inboundPhone = cleanPhone(
        existingCall.callerNumber ||
        existingCall.customerNumber ||
        existingCall.leadPhone ||
        existingCall.phone ||
        req.body.callerNumber ||
        req.body.customerNumber ||
        req.body.phone ||
        req.body.leadPhone
      )
      const matchedLead = inboundPhone ? await findLeadByPhone(inboundPhone) : null
      const canLinkMatchedLead = matchedLead && (
        isAdminUser(req) ||
        !matchedLead.teamId ||
        matchedLead.teamId === toNumberOrNull(req.authUser?.id)
      )
      if (canLinkMatchedLead) {
        existingCall = await prisma.callLog.update({
          where:{ id:existingCall.id },
          data:{
            leadId:matchedLead.id,
            leadPhone:inboundPhone || existingCall.leadPhone,
            phone:inboundPhone || existingCall.phone,
            direction:"inbound",
          },
          include:{ lead:true, agent:true },
        })
      }
    }

    const isInboundDisposition = String(existingCall.direction || req.body.direction || "").toLowerCase() === "inbound"
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

      if (existingCall.leadId && existingCall.lead) {
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
      }

      if (existingCall.leadId && ["Callback Later", "Follow-up Required"].includes(disposition)) {
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

      if (existingCall.leadId && existingCall.lead && disposition === "Site Visit Scheduled") {
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

      if (existingCall.leadId && existingCall.lead) {
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
      }
      return callLog
    })
    if (callbackFollowUp) handleCallbackFollowUpSaved(callbackFollowUp)

    let mcubeDisposition = null
    if (isInboundDisposition) {
      const mcubeCallId = result.providerCallId || result.callId || existingCall.providerCallId || existingCall.callId || req.body.callid || req.body.callId || ""
      if (mcubeCallId) {
        try {
          mcubeDisposition = await mcubeVoice.submitInboundDisposition({
            callId:mcubeCallId,
            disposition,
            notes,
            phone:result.callerNumber || result.leadPhone || result.phone || req.body.callerNumber || req.body.phone || "",
            leadName:result.lead ? getLeadName(result.lead) : "",
            callLogId:result.id,
          })
        } catch (mcubeError) {
          console.error("MCube inbound disposition sync error:", {
            callLogId:result.id,
            message:mcubeError.message,
            statusCode:mcubeError.statusCode || 500,
          })
          mcubeDisposition = {
            success:false,
            message:mcubeError.message || "MCube inbound disposition sync failed",
          }
        }
      } else {
        mcubeDisposition = {
          success:false,
          message:"MCube callid is unavailable for this inbound call.",
        }
      }
    }

    res.status(200).json({
      message:mcubeDisposition?.success === false
        ? "Call disposition saved in CRM. MCube disposition sync failed."
        : "Call disposition saved",
      callLog:result,
      ...(isInboundDisposition ? { mcubeDisposition } : {}),
    })
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
    if (!canAccessCallLog(req, callLog)) {
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
    if (!isAdminUser(req)) {
      where.AND = [getSalesCallAccessWhere(toNumberOrNull(req.authUser?.id))]
    }
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
    const userId = toNumberOrNull(req.authUser?.id)
    if (!userId) return res.status(400).json({ message:"User is required" })
    const queryWhere = buildWhereFromQuery(req.query)
    await listCalls(req, res, {
      AND:[
        queryWhere,
        getSalesCallAccessWhere(userId),
      ],
    })
  } catch (error) {
    res.status(500).json({ message:"Unable to load your call logs" })
  }
}

exports.getInboundCalls = async (req, res) => {
  try {
    const userId = toNumberOrNull(req.authUser?.id)
    if (!userId) return res.status(400).json({ message:"User is required" })
    const queryWhere = buildWhereFromQuery({ ...req.query, direction:"inbound" })
    await listCalls(req, res, {
      AND:[
        queryWhere,
        isAdminUser(req) ? {} : getSalesCallAccessWhere(userId),
      ],
    })
  } catch (error) {
    res.status(500).json({ message:"Unable to load inbound calls" })
  }
}

exports.getActiveInboundCall = async (req, res) => {
  try {
    const userId = toNumberOrNull(req.authUser?.id)
    if (!userId) return res.status(400).json({ message:"User is required" })
    const callLog = await prisma.callLog.findFirst({
      where:{
        direction:"inbound",
        status:{ in:activeCallStatuses },
        ...(isAdminUser(req) ? {} : getSalesCallAccessWhere(userId)),
      },
      include:callInclude,
      orderBy:{ startedAt:"desc" },
    })
    res.status(200).json({ callLog })
  } catch (error) {
    res.status(500).json({ message:"Unable to load active inbound call" })
  }
}

exports.getCallDetail = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    if (!id) return res.status(400).json({ message:"Call id is required" })
    const callLog = await prisma.callLog.findUnique({ where:{ id }, include:callInclude })
    if (!callLog) return res.status(404).json({ message:"Call log not found" })
    if (!canAccessCallLog(req, callLog)) return res.status(403).json({ message:"Access denied" })
    const safeCallLog = isAdminUser(req) ? callLog : { ...callLog, rawPayload:undefined }
    res.status(200).json({ callLog:safeCallLog })
  } catch (error) {
    res.status(500).json({ message:"Unable to load call detail" })
  }
}

exports.deleteCallLog = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    if (!id) return res.status(400).json({ message:"Call id is required" })

    const callLog = await prisma.callLog.findUnique({
      where:{ id },
      include:{ lead:{ select:{ teamId:true } } },
    })
    if (!callLog) return res.status(404).json({ message:"Call log not found" })
    if (!canAccessCallLog(req, callLog)) return res.status(403).json({ message:"Access denied" })

    await prisma.callLog.delete({ where:{ id } })
    res.status(200).json({ message:"Call log deleted", id, leadId:callLog.leadId || null })
  } catch (error) {
    res.status(500).json({ message:error.message || "Unable to delete call log" })
  }
}

const normalizeBulkCallLogIds = (value) => {
  if (!Array.isArray(value)) {
    const error = new Error("ids must be an array")
    error.statusCode = 400
    throw error
  }

  if (value.length === 0) {
    const error = new Error("At least one call id is required")
    error.statusCode = 400
    throw error
  }

  if (value.length > 100) {
    const error = new Error("You can delete up to 100 call logs at once")
    error.statusCode = 400
    throw error
  }

  const ids = []
  const invalidIds = []
  value.forEach((item) => {
    const id = toNumberOrNull(item)
    if (!Number.isInteger(id) || id <= 0) {
      invalidIds.push(item)
      return
    }
    if (!ids.includes(id)) ids.push(id)
  })

  if (invalidIds.length > 0 || ids.length === 0) {
    const error = new Error("ids must contain valid numeric call ids")
    error.statusCode = 400
    error.invalidIds = invalidIds
    throw error
  }

  return ids
}

exports.deleteBulkCallLogs = async (req, res) => {
  try {
    const ids = normalizeBulkCallLogIds(req.body?.ids)
    const callLogs = await prisma.callLog.findMany({
      where:{ id:{ in:ids } },
      include:{ lead:{ select:{ teamId:true } } },
    })
    const callLogById = new Map(callLogs.map((callLog) => [callLog.id, callLog]))
    const deletedIds = []
    const failures = []

    ids.forEach((id) => {
      const callLog = callLogById.get(id)
      if (!callLog) {
        failures.push({ id, reason:"Call log not found" })
        return
      }
      if (!canAccessCallLog(req, callLog)) {
        failures.push({ id, reason:"Access denied" })
        return
      }
      deletedIds.push(id)
    })

    if (deletedIds.length > 0) {
      await prisma.callLog.deleteMany({ where:{ id:{ in:deletedIds } } })
    }

    const payload = {
      message:failures.length > 0 ? "Bulk delete completed with skipped records" : "Call logs deleted",
      requested:ids.length,
      deleted:deletedIds.length,
      failed:failures.length,
      deletedIds,
      failures,
    }
    const status = failures.length > 0 && deletedIds.length > 0 ? 207 : deletedIds.length > 0 ? 200 : 404
    res.status(status).json(payload)
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message:error.message || "Unable to delete selected call logs",
      invalidIds:error.invalidIds || undefined,
    })
  }
}

exports.linkCallLead = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    const leadId = toNumberOrNull(req.body.leadId)
    if (!id || !leadId) return res.status(400).json({ message:"Call id and leadId are required" })

    const [callLog, lead] = await Promise.all([
      prisma.callLog.findUnique({ where:{ id }, include:callInclude }),
      prisma.lead.findUnique({
        where:{ id:leadId },
        select:{
          id:true,
          firstName:true,
          lastName:true,
          companyName:true,
          teamId:true,
          phones:true,
          status:true,
          channelPartner:true,
          tags:true,
          interestedProjects:true,
          propertyType:true,
        },
      }),
    ])
    if (!callLog) return res.status(404).json({ message:"Call log not found" })
    if (!lead) return res.status(404).json({ message:"Lead not found" })
    if (!canAccessCallLog(req, callLog) && !isAdminUser(req)) return res.status(403).json({ message:"Access denied" })
    if (!isAdminUser(req) && lead.teamId !== toNumberOrNull(req.authUser?.id)) {
      return res.status(403).json({ message:"You can link calls only to your assigned leads" })
    }

    const updated = await prisma.callLog.update({
      where:{ id },
      data:{
        leadId,
        agentId:callLog.agentId || lead.teamId || null,
        notes:callLog.notes || "MCube inbound - linked to lead",
      },
      include:callInclude,
    })
    if (updated.direction === "inbound") {
      emitInboundCallEvent(updated, {
        customerPhone:updated.callerNumber || updated.customerNumber || updated.leadPhone,
        providerCallId:updated.providerCallId,
        status:updated.status,
      }, true)
    }
    res.status(200).json({ message:"Call linked to lead", callLog:updated })
  } catch (error) {
    res.status(500).json({ message:error.message || "Unable to link call to lead" })
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

const parseWebhookObject = (value) => {
  if (!value || typeof value !== "string") return null
  const text = value.trim()
  if (!text || !["{", "["].includes(text[0])) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}

const flattenWebhookPayload = (value, target = {}, seen = new Set()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return target
  seen.add(value)

  Object.entries(value).forEach(([key, rawValue]) => {
    if (rawValue !== undefined && rawValue !== null && rawValue !== "" && target[key] === undefined) {
      target[key] = rawValue
    }

    const parsed = parseWebhookObject(rawValue)
    if (parsed) flattenWebhookPayload(parsed, target, seen)
    else if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
      flattenWebhookPayload(rawValue, target, seen)
    }
  })

  return target
}

const getWebhookPayload = (req) => {
  if (!req._mcubeWebhookPayload) {
    req._mcubeWebhookPayload = flattenWebhookPayload({ ...req.query, ...req.body })
  }
  return req._mcubeWebhookPayload
}

const firstWebhookValue = (body, keys) => {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") return body[key]
  }
  return null
}

const verifyMcubeWebhook = (req) => {
  const expected = String(process.env.MCUBE_WEBHOOK_SECRET || process.env.MCUBE_WEBHOOK_TOKEN || "").trim()
  if (!expected) return true
  const supplied =
    String(req.headers.authorization || "").replace(/^Bearer\s+/i, "") ||
    req.headers["x-mcube-token"] ||
    req.headers["x-webhook-token"] ||
    req.headers["x-mcube-secret"] ||
    req.query.token ||
    req.query.secret ||
    req.body.token ||
    req.body.secret ||
    req.body.secretkey
  return String(supplied || "").trim() === expected
}

const getMcubePayloadValue = (req, keys) => firstWebhookValue(getWebhookPayload(req), keys)

const getMcubeCallLookup = (req) => {
  const providerCallId = getMcubePayloadValue(req, [
    "callid",
    "callId",
    "callID",
    "call_id",
    "called",
    "uuid",
    "calluuid",
    "callUuid",
    "callUUID",
    "call_uid",
    "callUniqueId",
    "call_unique_id",
    "mcubeCallId",
    "mcube_call_id",
    "uniqueid",
    "uniqueId",
    "unique_id",
    "callUniqueID",
    "callSid",
    "call_sid",
    "sessionid",
    "sessionId",
    "session_id",
    "mcubeid",
    "mcubeId",
    "mcube_id",
    "providerCallId",
    "provider_call_id",
    "sid",
  ])
  const callLogId = toNumberOrNull(getMcubePayloadValue(req, ["callLogId", "callLogID", "call_log_id", "crmCallLogId", "crmCallLogID", "crm_call_log_id"]))
    || toNumberOrNull(getMcubePayloadValue(req, ["refid", "refId", "ref_id", "reference", "referenceId", "reference_id"]))
    || toNumberOrNull(getMcubePayloadValue(req, ["refurl", "refUrl"]))
  return { providerCallId:providerCallId ? String(providerCallId) : "", callLogId }
}

const normalizeRecordingUrl = (value) => {
  let recordingUrl = String(value || "").trim()
    .replace(/\\\//g, "/")
    .replace(/^"+|"+$/g, "")
  if (!recordingUrl || ["na", "null", "undefined", "none", "-"].includes(recordingUrl.toLowerCase())) return ""
  recordingUrl = recordingUrl.replace(
    /^https?:\/\/\[([^\]]+)\]\((https?:\/\/[^)]+)\)(\/.*)?$/i,
    (match, labelHost, linkedUrl, suffix = "") => {
      try {
        const parsed = new URL(linkedUrl)
        return `${parsed.protocol}//${parsed.host}${suffix}`
      } catch (error) {
        return `https://${labelHost}${suffix}`
      }
    }
  )
  const embeddedUrl = recordingUrl.match(/https?:\/\/[^\s"'<>]+/i)?.[0]
  if (embeddedUrl) recordingUrl = embeddedUrl
  recordingUrl = recordingUrl.replace(/\\\//g, "/").replace(/[)\].,]+$/g, "")
  if (/^\/uploads\/call-recordings\/[^/\\]+$/i.test(recordingUrl)) return recordingUrl
  const recordingBaseUrl = String(process.env.MCUBE_RECORDING_BASE_URL || "").trim()
  try {
    const parsed = new URL(recordingUrl)
    if (!["https:", "http:"].includes(parsed.protocol)) return ""
    return parsed.toString()
  } catch (error) {
    if (!recordingBaseUrl) return ""
    try {
      return new URL(recordingUrl.replace(/^\/+/, ""), `${recordingBaseUrl.replace(/\/+$/, "")}/`).toString()
    } catch (baseUrlError) {
      return ""
    }
  }
}

const getLocalRecordingPath = (recordingUrl) => {
  const url = String(recordingUrl || "").trim()
  if (!/^\/uploads\/call-recordings\/[^/\\]+$/i.test(url)) return null
  const fileName = path.basename(url)
  const uploadRoot = path.resolve(__dirname, "..", "uploads", "call-recordings")
  const filePath = path.resolve(uploadRoot, fileName)
  return filePath.startsWith(uploadRoot + path.sep) ? filePath : null
}

const getSafeWebhookPayload = (req) => {
  const payload = getWebhookPayload(req)
  ;["token", "secret", "secretkey", "apikey", "apiKey", "authorization", "password"].forEach((key) => {
    if (payload[key] !== undefined) payload[key] = "[redacted]"
  })
  return payload
}

const hasMcubeWebhookSignal = (data) => Boolean(
  data.providerCallId ||
  data.callLogId ||
  data.customerPhone ||
  data.agentPhone ||
  data.agentExtension ||
  data.agentProviderId ||
  data.agentLogin ||
  data.providerStatus ||
  data.recordingUrl ||
  data.startedAt ||
  data.endedAtFromProvider ||
  data.campaignId ||
  data.queueId
)

const getAnsweredAt = (startedAt, answerDelay, rawAnsweredAt) => {
  const parsedAnsweredAt = toDateOrNull(rawAnsweredAt)
  if (parsedAnsweredAt) return parsedAnsweredAt
  if (startedAt && answerDelay !== null && answerDelay !== undefined) {
    return new Date(startedAt.getTime() + (Number(answerDelay) || 0) * 1000)
  }
  return null
}

const getMcubeCallToNumber = (req) => cleanPhone(getMcubePayloadValue(req, ["to", "callto", "callTo", "CallTo"]))

const getMcubeWebhookData = async (req, fallbackDirection = "outbound") => {
  const virtualNumber = cleanPhone(getMcubePayloadValue(req, [
    "did",
    "didnumber",
    "Didnumber",
    "virtualNumber",
    "virtual_number",
    "businessNumber",
    "business_number",
    "callednumber",
    "calledNumber",
    "called_number",
    "clicktocalldid",
    "clickToCallDid",
  ])) || cleanPhone(
    fallbackDirection === "inbound" ? process.env.MCUBE_INBOUND_NUMBER : process.env.MCUBE_OUTBOUND_NUMBER
  )
  const inboundNumbers = [
    process.env.MCUBE_INBOUND_NUMBER,
    process.env.MCUBE_INBOUND_NUMBERS,
  ]
    .flatMap((item) => String(item || "").split(","))
    .map(cleanPhone)
    .filter(Boolean)
  const isInboundVirtualNumber = Boolean(
    virtualNumber &&
    inboundNumbers.some((configuredNumber) => matchesPhone(configuredNumber, virtualNumber))
  )
  const rawDirection = getMcubePayloadValue(req, ["direction", "calltype", "callType", "call_type", "type", "CallType"])
  const direction = normalizeCallDirection(rawDirection, isInboundVirtualNumber ? "inbound" : fallbackDirection)
  const callToNumber = getMcubeCallToNumber(req)
  const directCustomerPhone = cleanPhone(getMcubePayloadValue(req, [
    "customernumber",
    "customerNumber",
    "customer_number",
    "custnumber",
    "cust_number",
    "caller",
    "callerid",
    "callerId",
    "callerID",
    "callerNumber",
    "caller_number",
    "customer",
    "customerPhone",
    "customer_phone",
    "mobileno",
    "mobileNo",
    "mobile",
    "from",
    "callfrom",
    "callFrom",
    "CallFrom",
    "leadPhone",
    "phone",
  ]))
  const customerPhone = directCustomerPhone ||
    (direction === "outbound" || (callToNumber && !matchesPhone(callToNumber, virtualNumber)) ? callToNumber : "")
  const agentPhone = cleanPhone(getMcubePayloadValue(req, [
    "emp_phone",
    "empphone",
    "agentPhone",
    "agent_phone",
    "exenumber",
    "exeNumber",
    "exe_number",
    "executivenumber",
    "executiveNumber",
    "executive_number",
    "executive",
  ]))
  const agentExtension = String(getMcubePayloadValue(req, [
    "extension",
    "ext",
    "agentExtension",
    "agent_extension",
    "executiveExtension",
    "exe_extension",
    "emp_extension",
  ]) || "").replace(/\D/g, "") || (agentPhone.length <= 6 ? agentPhone : "")
  const agentProviderId = String(getMcubePayloadValue(req, [
    "agentId",
    "agent_id",
    "mcubeAgentId",
    "executiveId",
    "exeid",
    "empid",
  ]) || "").trim()
  const agentLogin = String(getMcubePayloadValue(req, [
    "agentEmail",
    "agent_email",
    "agentLogin",
    "agent_login",
    "username",
    "user",
    "email",
  ]) || "").trim().toLowerCase()
  const campaignId = String(getMcubePayloadValue(req, [
    "campaign",
    "campaignId",
    "campaign_id",
    "campaignname",
    "campaignName",
    "groupname",
    "groupName",
  ]) || "").trim()
  const queueId = String(getMcubePayloadValue(req, [
    "queue",
    "queueId",
    "queue_id",
    "skill",
    "skillId",
  ]) || "").trim()
  const providerAgentName = String(getMcubePayloadValue(req, [
    "agentname",
    "agentName",
    "providerAgentName",
    "executiveName",
    "emp_name",
  ]) || "").trim()
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
  const answerDelayValue = getMcubePayloadValue(req, [
    "answeredtime",
    "answerDelay",
    "answer_delay",
    "ringtime",
  ])
  const answerDelay = toDurationSeconds(answerDelayValue)
  const recordingUrl = getRecordingValue(req)
  const startedAt = toDateOrNull(getMcubePayloadValue(req, ["starttime", "startTime", "StartTime", "callstarttime"]))
  const endedAtFromProvider = toDateOrNull(getMcubePayloadValue(req, ["endtime", "endTime", "EndTime", "callendtime"]))
  const answeredAt = getAnsweredAt(startedAt, answerDelay, getMcubePayloadValue(req, ["answeredAt", "answered_at", "answertime", "answerTime"]))
  const status = endedAtFromProvider
    ? normalizeCallStatus(rawStatus || "completed") === "connected" ? "completed" : normalizeCallStatus(rawStatus || "completed")
    : rawStatus ? normalizeCallStatus(rawStatus) : (fallbackDirection === "inbound" ? "calling" : "initiated")
  const { providerCallId, callLogId } = getMcubeCallLookup(req)
  const disconnectedBy = String(getMcubePayloadValue(req, ["disconnectedby", "disconnectedBy", "hangupBy", "hangup_by"]) || "").trim()
  const failureReason = String(getMcubePayloadValue(req, ["failureReason", "failurereason", "reason", "error"]) || "").trim()
  const calculatedDuration = duration || (startedAt && endedAtFromProvider
    ? Math.max(0, Math.floor((endedAtFromProvider.getTime() - startedAt.getTime()) / 1000))
    : null)

  return {
    agentExtension,
    agentLogin,
    agentProviderId,
    agentPhone,
    answerDelay,
    answeredAt,
    callLogId,
    campaignId,
    disconnectedBy,
    customerPhone,
    direction,
    duration:calculatedDuration,
    endedAtFromProvider,
    failureReason,
    providerCallId,
    providerAgentName,
    providerStatus:String(rawStatus || "").trim(),
    recordingUrl:normalizeRecordingUrl(recordingUrl),
    queueId,
    rawPayload:getSafeWebhookPayload(req),
    startedAt,
    status,
    virtualNumber,
  }
}

const findMcubeCallLog = async ({ providerCallId, callLogId }) => {
  if (!providerCallId && !callLogId) return null
  return prisma.callLog.findFirst({
    where:{
      provider:{ in:["mcube", "mcube-webphone"] },
      OR:[
        ...(providerCallId ? [{ providerCallId }, { callId:providerCallId }] : []),
        ...(callLogId ? [{ id:callLogId }] : []),
      ],
    },
  })
}

const findRecentBrowserPhoneCallLog = async ({ customerPhone, agentPhone, direction }) => {
  if (direction && direction !== "outbound") return null
  const candidates = await prisma.callLog.findMany({
    where:{
      provider:"mcube-webphone",
      direction:"outbound",
      status:{ in:activeCallStatuses },
      createdAt:{ gte:new Date(Date.now() - 30 * 60 * 1000) },
    },
    orderBy:{ createdAt:"desc" },
    take:25,
  })

  return candidates.find((call) =>
    matchesPhone(call.leadPhone || call.phone, customerPhone) &&
    (!agentPhone || !call.agentPhone || matchesPhone(call.agentPhone, agentPhone))
  ) || null
}

const findRecentMcubeCallLogByPhones = async ({ customerPhone, agentPhone, direction }) => {
  if (!customerPhone) return null
  const candidates = await prisma.callLog.findMany({
    where:{
      provider:{ in:["mcube", "mcube-webphone"] },
      ...(direction ? { direction } : {}),
      createdAt:{ gte:new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy:{ createdAt:"desc" },
    take:100,
  })

  return candidates.find((call) =>
    matchesPhone(call.leadPhone || call.phone || call.callerNumber || call.customerNumber, customerPhone) &&
    (!agentPhone || !call.agentPhone || matchesPhone(call.agentPhone, agentPhone))
  ) || null
}

const findRecentMcubeRecordingTarget = async (data) => {
  if (!data.recordingUrl) return null
  const matchWindowDays = Math.max(1, Number(process.env.MCUBE_RECORDING_MATCH_WINDOW_DAYS) || 30)
  const candidates = await prisma.callLog.findMany({
    where:{
      provider:{ in:["mcube", "mcube-webphone"] },
      recordingUrl:null,
      ...(data.direction ? { direction:data.direction } : {}),
      createdAt:{ gte:new Date(Date.now() - matchWindowDays * 24 * 60 * 60 * 1000) },
    },
    orderBy:{ createdAt:"desc" },
    take:200,
  })

  return candidates.find((call) => {
    const phoneMatches = data.customerPhone
      ? matchesPhone(call.leadPhone || call.phone || call.callerNumber || call.customerNumber, data.customerPhone)
      : true
    const agentMatches = data.agentPhone
      ? matchesPhone(call.agentPhone || call.agentNumber, data.agentPhone)
      : true
    const virtualMatches = data.virtualNumber
      ? !call.virtualNumber || matchesPhone(call.virtualNumber, data.virtualNumber)
      : true
    return phoneMatches && agentMatches && virtualMatches
  }) || null
}

const resolveMcubeAgent = async (data) => {
  const explicitAgent =
    await findUserByMcubeAgentId(data.agentProviderId) ||
    await findUserByMcubeExtension(data.agentExtension, data.agentLogin) ||
    await findUserByPhone(data.agentPhone)

  if (explicitAgent) return explicitAgent
  if (data.direction !== "inbound") return null
  if (!data.agentProviderId && !data.agentExtension && !data.agentLogin && !data.agentPhone && isFinalCallStatus(data.status)) return null
  return findAvailableInboundAgent()
}

const shouldUpdateProviderCallId = (existingCall, providerCallId) => {
  if (!providerCallId) return false
  const current = String(existingCall?.providerCallId || existingCall?.callId || "").trim()
  return !current || current === `mcube-${existingCall.id}`
}

const getWebhookStatusUpdate = (existingCall, nextStatus) => {
  const currentStatus = String(existingCall?.status || "").toLowerCase()
  const normalizedNext = normalizeCallStatus(nextStatus)
  if (!normalizedNext) return {}
  if (terminalCallStatuses.has(currentStatus) && !terminalCallStatuses.has(normalizedNext)) return {}
  if ((callStatusPriority[currentStatus] || 0) > (callStatusPriority[normalizedNext] || 0)) return {}
  return { status:normalizedNext }
}

const getWebhookCommonUpdate = (existingCall, data, notes, agent = null, lead = null) => {
  const endedAt = isFinalCallStatus(data.status) ? data.endedAtFromProvider || new Date() : undefined
  const answeredAt = data.answeredAt || (data.status === "connected" ? new Date() : undefined)
  const nextDirection = existingCall?.direction || data.direction
  const nextAgentId = agent?.id || lead?.teamId || null
  return {
    ...(lead?.id && !existingCall?.leadId ? { leadId:lead.id } : {}),
    ...(nextAgentId && !existingCall?.agentId ? { agentId:nextAgentId } : {}),
    ...(shouldUpdateProviderCallId(existingCall, data.providerCallId) ? {
      providerCallId:data.providerCallId,
      callId:data.providerCallId,
    } : {}),
    ...getWebhookStatusUpdate(existingCall, data.status),
    direction:nextDirection,
    providerStatus:data.providerStatus || null,
    ...(data.customerPhone ? {
      phone:data.customerPhone || "-",
      leadPhone:data.customerPhone || null,
      callerNumber:nextDirection === "inbound" ? data.customerPhone : existingCall?.callerNumber || null,
    } : {}),
    ...(data.agentPhone ? {
      agentPhone:data.agentPhone,
      agentNumber:data.agentPhone,
    } : {}),
    ...(data.agentExtension ? { agentExtension:data.agentExtension } : {}),
    ...(data.virtualNumber ? { virtualNumber:data.virtualNumber } : {}),
    ...(data.campaignId ? { campaignName:data.campaignId } : {}),
    ...(data.queueId ? { queueName:data.queueId } : {}),
    ...(data.providerAgentName ? { providerAgentName:data.providerAgentName } : {}),
    ...(data.duration !== null ? { duration:data.duration } : {}),
    ...(data.recordingUrl ? { recordingUrl:String(data.recordingUrl) } : {}),
    ...(data.startedAt ? { startedAt:data.startedAt } : {}),
    ...(answeredAt && !existingCall?.answeredAt ? { answeredAt, connectedAt:answeredAt } : {}),
    ...(data.answerDelay !== null && data.answerDelay !== undefined ? { answerDelay:data.answerDelay } : {}),
    ...(endedAt ? { endedAt } : {}),
    ...(data.disconnectedBy ? { disconnectedBy:data.disconnectedBy } : {}),
    ...(data.failureReason ? { failureReason:data.failureReason } : {}),
    rawPayload:data.rawPayload,
    notes:existingCall?.notes || notes,
  }
}

const getInboundSocketEvent = (status) => {
  const normalized = normalizeCallStatus(status)
  if (normalized === "connected") return "mcube:inbound:connected"
  if (["completed", "canceled"].includes(normalized)) return "mcube:inbound:completed"
  if (["no-answer", "missed"].includes(normalized)) return "mcube:inbound:missed"
  if (["failed", "busy"].includes(normalized)) return "mcube:inbound:failed"
  return "mcube:inbound:ringing"
}

const emitInboundCallEvent = (callLog, data, matched = true) => {
  const userId = callLog?.agentId || callLog?.lead?.teamId
  if (!userId) return
  const hasRecording = Boolean(callLog?.recordingUrl || data.recordingUrl)

  const payload = {
    id:callLog?.id || null,
    callLogId:callLog?.id || null,
    provider:"mcube",
    providerCallId:callLog?.providerCallId || callLog?.callId || data.providerCallId || "",
    direction:"inbound",
    status:callLog?.status || data.status,
    providerStatus:callLog?.providerStatus || data.providerStatus || "",
    callerNumber:callLog?.callerNumber || data.customerPhone || callLog?.leadPhone || callLog?.phone || "",
    customerNumber:callLog?.customerNumber || data.customerPhone || callLog?.leadPhone || callLog?.phone || "",
    virtualNumber:callLog?.virtualNumber || data.virtualNumber || "",
    agentNumber:callLog?.agentNumber || data.agentPhone || callLog?.agentPhone || "",
    agentExtension:callLog?.agentExtension || data.agentExtension || "",
    agentName:getUserName(callLog?.agent) || data.providerAgentName || "",
    campaignId:callLog?.campaignName || data.campaignId || "",
    queueId:callLog?.queueName || data.queueId || "",
    startedAt:callLog?.startedAt || data.startedAt || new Date(),
    answeredAt:callLog?.answeredAt || data.answeredAt || null,
    connectedAt:callLog?.connectedAt || callLog?.answeredAt || data.answeredAt || null,
    endedAt:callLog?.endedAt || null,
    duration:callLog?.duration || data.duration || 0,
    recordingUrl:hasRecording ? "available" : "",
    recordingStatus:hasRecording ? "available" : isFinalCallStatus(callLog?.status || data.status) ? "pending" : "pending",
    disconnectedBy:callLog?.disconnectedBy || data.disconnectedBy || "",
    disposition:callLog?.disposition || "",
    matched,
    lead:callLog?.lead ? {
      id:callLog.lead.id,
      firstName:callLog.lead.firstName,
      lastName:callLog.lead.lastName,
      companyName:callLog.lead.companyName,
      status:callLog.lead.status,
      source:callLog.lead.channelPartner || callLog.lead.tags || "",
      project:callLog.lead.interestedProjects || callLog.lead.propertyType || "",
    } : null,
  }

  try {
    const socketId = connectedUser.get(String(userId)) || connectedUser.get(Number(userId))
    const eventName = hasRecording ? "mcube:inbound:recording-ready" : getInboundSocketEvent(payload.status)
    if (socketId) getIO().to(socketId).emit(eventName, payload)
    getIO().to(`user:${userId}`).emit(eventName, payload)
  } catch (error) {
    console.error("Unable to emit MCube inbound event:", error.message)
  }
}

const saveMcubeWebhookCall = async (req, fallbackDirection, options = {}) => {
  if (!verifyMcubeWebhook(req)) {
    const error = new Error("Invalid MCube webhook token")
    error.statusCode = 403
    throw error
  }

  const data = await getMcubeWebhookData(req, fallbackDirection)
  if (!hasMcubeWebhookSignal(data)) {
    const error = new Error("No MCube call data received")
    error.statusCode = 400
    throw error
  }
  if (options.requireRecording && !data.recordingUrl) {
    const error = new Error("MCube recording URL is required for recording webhook")
    error.statusCode = 400
    throw error
  }
  const exactCall = await findMcubeCallLog(data)
  const lookupData = options.matchAnyDirection ? { ...data, direction:null } : data
  const shouldCreateNewCall = Boolean(options.createNewCall && !exactCall)
  const recordingTarget = !exactCall && !shouldCreateNewCall && data.recordingUrl
    ? await findRecentMcubeRecordingTarget(lookupData)
    : null
  const existingCall =
    exactCall ||
    (shouldCreateNewCall ? null : (
      recordingTarget ||
      await findRecentBrowserPhoneCallLog(data) ||
      await findRecentMcubeCallLogByPhones(lookupData)
    ))
  if (options.requireRecording && !existingCall && !data.customerPhone && !data.providerCallId && !data.callLogId) {
    const error = new Error("Matching call details are required for MCube recording webhook")
    error.statusCode = 400
    throw error
  }
  const agent = existingCall?.agentId ? null : await resolveMcubeAgent(data)
  const matchAgentId = existingCall?.agentId || agent?.id || null
  const leadMatches = existingCall?.leadId ? [] : await findBestLeadMatchesByPhone(data.customerPhone, matchAgentId)
  const lead = leadMatches.length === 1 || data.direction === "inbound" ? leadMatches[0] || null : null
  const endedAt = isFinalCallStatus(data.status) ? data.endedAtFromProvider || new Date() : undefined
  const notesPrefix = data.direction === "inbound" ? "MCube inbound" : "MCube outbound"
  const notes = `${notesPrefix}${data.virtualNumber ? ` via ${data.virtualNumber}` : ""}${leadMatches.length > 1 ? " - multiple lead matches" : ""}${!agent ? " - unmapped agent" : ""}`

  if (existingCall) {
    const callLog = await prisma.callLog.update({
      where:{ id:existingCall.id },
      data:getWebhookCommonUpdate(existingCall, data, notes, agent, lead),
      include:callInclude,
    })
    if (data.direction === "inbound") emitInboundCallEvent(callLog, data, Boolean(callLog.leadId))
    return { callLog, matched:Boolean(callLog.leadId), message:"MCube call log updated" }
  }

  const callLog = await prisma.callLog.create({
    data:{
      leadId:lead?.id || null,
      agentId:agent?.id || lead?.teamId || null,
      phone:data.customerPhone || "-",
      leadPhone:data.customerPhone || null,
      agentPhone:data.agentPhone || null,
      direction:data.direction,
      callerNumber:data.direction === "inbound" ? data.customerPhone || null : null,
      agentNumber:data.agentPhone || null,
      agentExtension:data.agentExtension || null,
      virtualNumber:data.virtualNumber || null,
      campaignName:data.campaignId || null,
      queueName:data.queueId || null,
      providerAgentName:data.providerAgentName || null,
      provider:"mcube",
      callId:data.providerCallId || null,
      providerCallId:data.providerCallId || null,
      providerStatus:data.providerStatus || null,
      status:data.status,
      duration:data.duration,
      recordingUrl:data.recordingUrl ? String(data.recordingUrl) : null,
      answeredAt:data.answeredAt || null,
      answerDelay:data.answerDelay,
      connectedAt:data.answeredAt || (data.status === "connected" ? new Date() : null),
      disconnectedBy:data.disconnectedBy || null,
      failureReason:data.failureReason || null,
      rawPayload:data.rawPayload,
      notes,
      startedAt:data.startedAt || new Date(),
      endedAt:endedAt || null,
    },
    include:callInclude,
  })
  if (data.direction === "inbound") emitInboundCallEvent(callLog, data, Boolean(lead))
  return {
    callLog,
    matched:Boolean(lead),
    multipleMatches:leadMatches.length > 1,
    message:lead
      ? "MCube call log created"
      : leadMatches.length > 1
        ? "MCube webhook accepted, multiple matching leads found."
        : "MCube webhook accepted, unknown caller saved.",
  }
}

const mcubeSignalPayloadKeys = [
  "starttime",
  "startTime",
  "StartTime",
  "callstarttime",
  "endtime",
  "endTime",
  "EndTime",
  "callendtime",
  "callid",
  "callId",
  "callID",
  "call_id",
  "uuid",
  "calluuid",
  "emp_phone",
  "empphone",
  "clicktocalldid",
  "clickToCallDid",
  "did",
  "didnumber",
  "virtualNumber",
  "businessNumber",
  "callto",
  "callTo",
  "CallTo",
  "caller",
  "callerid",
  "callerNumber",
  "customerPhone",
  "customernumber",
  "dialstatus",
  "DialCallStatus",
  "callstatus",
  "callStatus",
  "status",
  "direction",
  "calltype",
  "type",
  "disconnectedby",
  "disconnectedBy",
  "answeredtime",
  "groupname",
  "groupName",
  "campaignName",
  "agentname",
  "agentName",
  "refid",
  "refId",
  "crmCallLogId",
  ...recordingPayloadKeys,
]

const hasIncomingMcubePayload = (req) =>
  Boolean(firstWebhookValue(getWebhookPayload(req), mcubeSignalPayloadKeys))

exports.mcubeInbound = async (req, res) => {
  try {
    if (!hasIncomingMcubePayload(req)) {
      return res.status(200).json({
        message:"MCube inbound callback is ready",
        requiredFields:["callid", "callto", "clicktocalldid", "dialstatus", "recordingUrl"],
      })
    }
    const result = await saveMcubeWebhookCall(req, "inbound", { createNewCall:true, matchAnyDirection:true })
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

exports.mcubeRecordingWebhook = async (req, res) => {
  try {
    const rawDirection = getMcubePayloadValue(req, ["direction", "calltype", "callType", "call_type", "type", "CallType"])
    const explicitDirection = normalizeCallDirection(rawDirection, "")
    const fallbackDirection = explicitDirection === "outbound" ? "outbound" : "inbound"
    const result = await saveMcubeWebhookCall(req, fallbackDirection, {
      matchAnyDirection:!["inbound", "outbound"].includes(explicitDirection),
      requireRecording:true,
    })
    res.status(200).json(result)
  } catch (error) {
    console.error("MCube recording webhook error:", error)
    res.status(error.statusCode || 500).json({ message:error.message || "Unable to process MCube recording" })
  }
}

exports.getRecording = async (req, res) => {
  try {
    const id = toNumberOrNull(req.params.id)
    const callLog = await prisma.callLog.findUnique({
      where:{ id },
      include:{ lead:{ select:{ teamId:true } } },
    })
    if (!callLog) return res.status(404).json({ message:"Call log not found" })
    if (!canAccessCallLog(req, callLog)) {
      return res.status(403).json({ message:"Access denied" })
    }
    const rawRecordingUrl = callLog.recordingUrl || getRecordingUrlFromPayload(callLog.rawPayload)
    const recordingUrl = normalizeRecordingUrl(rawRecordingUrl)
    if (!recordingUrl) return res.status(404).json({ message:"Recording is not available" })
    if (recordingUrl !== callLog.recordingUrl) {
      await prisma.callLog.updateMany({
        where:{ id:callLog.id },
        data:{ recordingUrl },
      })
    }

    const localRecordingPath = getLocalRecordingPath(recordingUrl)
    if (localRecordingPath) {
      if (!fs.existsSync(localRecordingPath)) return res.status(404).json({ message:"Recording file is missing" })
      const ext = path.extname(localRecordingPath).toLowerCase()
      const contentType = ext === ".wav"
        ? "audio/wav"
        : ext === ".ogg"
          ? "audio/ogg"
          : ext === ".m4a"
            ? "audio/mp4"
            : "audio/mpeg"
      const stat = fs.statSync(localRecordingPath)
      res.setHeader("Content-Type", contentType)
      res.setHeader("Content-Length", stat.size)
      return fs.createReadStream(localRecordingPath).pipe(res)
    }

    const recording = await mcubeVoice.getRecordingStream(recordingUrl)
    res.setHeader("Content-Type", recording.headers["content-type"] || "audio/mpeg")
    if (recording.headers["content-length"]) {
      res.setHeader("Content-Length", recording.headers["content-length"])
    }
    recording.data.on("error", (error) => {
      console.error("MCube recording stream error:", error.message)
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
