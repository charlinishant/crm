const prisma = require("../lib/prisma")
const axios = require("axios")
const mcubeConfig = require("./mcubeConfig.service")
const { normalizePhoneNumber } = require("../utils/phone")
const { isAdminUser, maskPhoneNumber } = require("../utils/phoneMask")

const callStatuses = ["connected", "completed", "ringing", "missed", "busy", "no-answer", "rejected", "failed", "initiated"]

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  if (totalSeconds === 0) return "0s"
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
  parts.push(`${remainingSeconds}s`)
  return parts.join(" ")
}

const formatDurationClock = (seconds) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

const normalizeDate = (value, endOfDay = false) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}

const getDateRange = (filters, field = "createdAt") => {
  const from = normalizeDate(filters.fromDate)
  const to = normalizeDate(filters.toDate, true)
  if (!from && !to) return {}

  return {
    [field]: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  }
}

const getProjectName = async (projectId) => {
  if (!projectId) return ""
  const project = await prisma.project.findUnique({
    where: { id: Number(projectId) },
    select: { name: true },
  })
  return project?.name || ""
}

const buildCallWhere = async (filters = {}) => {
  const where = {
    ...getDateRange(filters, "createdAt"),
  }

  if (filters.salesUserId) {
    where.OR = [
      { agentId: Number(filters.salesUserId) },
      { lead: { teamId: Number(filters.salesUserId) } },
    ]
  }

  if (filters.projectId) {
    const projectName = await getProjectName(filters.projectId)
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { interestedProjectId: Number(filters.projectId) },
          { interestedProject: { contains: projectName } },
          {
            lead: {
              OR: [
                { interestedProjects: { contains: projectName } },
                { conductSiteVisit: { contains: projectName } },
                { siteVisitProject: { contains: projectName } },
                { propertyType: { contains: projectName } },
              ],
            },
          },
        ],
      },
    ]
  }

  if (filters.leadSource) {
    where.lead = {
      ...(where.lead || {}),
      OR: [
        { channelPartner: { contains: filters.leadSource } },
        { fundingSource: { contains: filters.leadSource } },
      ],
    }
  }

  if (filters.leadStatus) {
    where.lead = {
      ...(where.lead || {}),
      status: filters.leadStatus,
    }
  }

  if (filters.direction) {
    const dir = String(filters.direction).trim().toLowerCase()
    if (dir === "inbound" || dir === "outbound") {
      where.direction = dir
    }
  }

  if (filters.status) {
    where.status = String(filters.status).trim().toLowerCase()
  }

  if (filters.virtualNumber) {
    where.virtualNumber = { contains: String(filters.virtualNumber).trim() }
  }

  return where
}

const isAnsweredCall = (status) =>
  ["connected", "completed", "answered", "in-progress"].includes(String(status || "").toLowerCase())

const isMissedCall = (status) =>
  ["missed", "no-answer", "busy", "rejected", "failed", "canceled"].includes(String(status || "").toLowerCase())

const getCallSummary = async (filters = {}) => {
  const where = await buildCallWhere(filters)
  const calls = await prisma.callLog.findMany({
    where,
    select: {
      id: true,
      direction: true,
      status: true,
      duration: true,
      recordingUrl: true,
      provider: true,
    },
  })

  let totalCalls = calls.length
  let inboundCalls = 0
  let outboundCalls = 0
  let answeredCalls = 0
  let missedCalls = 0
  let busyCalls = 0
  let failedCalls = 0
  let totalTalkTimeSeconds = 0
  let recordedCalls = 0

  calls.forEach((call) => {
    const dir = String(call.direction || "outbound").toLowerCase()
    const st = String(call.status || "").toLowerCase()
    const dur = Number(call.duration) || 0

    if (dir === "inbound") inboundCalls++
    else outboundCalls++

    if (isAnsweredCall(st)) {
      answeredCalls++
      totalTalkTimeSeconds += dur
    } else if (st === "busy") {
      busyCalls++
      missedCalls++
    } else if (st === "failed" || st === "rejected") {
      failedCalls++
      missedCalls++
    } else {
      missedCalls++
    }

    if (call.recordingUrl) {
      recordedCalls++
    }
  })

  const answeredRatio = totalCalls > 0 ? Number(((answeredCalls / totalCalls) * 100).toFixed(1)) : 0
  const missedRatio = totalCalls > 0 ? Number(((missedCalls / totalCalls) * 100).toFixed(1)) : 0
  const avgDurationSeconds = answeredCalls > 0 ? Math.round(totalTalkTimeSeconds / answeredCalls) : 0

  return {
    totalCalls,
    inboundCalls,
    outboundCalls,
    answeredCalls,
    missedCalls,
    busyCalls,
    failedCalls,
    recordedCalls,
    answeredRatio,
    missedRatio,
    totalTalkTimeSeconds,
    totalTalkTimeFormatted: formatDuration(totalTalkTimeSeconds),
    avgDurationSeconds,
    avgDurationFormatted: formatDuration(avgDurationSeconds),
    avgDurationClock: formatDurationClock(avgDurationSeconds),
  }
}

const getCallStatusDistribution = async (filters = {}) => {
  const where = await buildCallWhere(filters)
  const calls = await prisma.callLog.findMany({
    where,
    select: { status: true },
  })

  const statusMap = {
    Connected: 0,
    Missed: 0,
    Busy: 0,
    "No Answer": 0,
    Failed: 0,
    Initiated: 0,
  }

  calls.forEach((call) => {
    const raw = String(call.status || "").toLowerCase()
    if (["connected", "completed", "answered"].includes(raw)) {
      statusMap.Connected++
    } else if (raw === "missed") {
      statusMap.Missed++
    } else if (raw === "busy") {
      statusMap.Busy++
    } else if (["no-answer", "noanswer"].includes(raw)) {
      statusMap["No Answer"]++
    } else if (["failed", "rejected", "canceled"].includes(raw)) {
      statusMap.Failed++
    } else {
      statusMap.Initiated++
    }
  })

  return Object.entries(statusMap).map(([name, value]) => ({ name, value }))
}

const getCallHourlyDistribution = async (filters = {}) => {
  const where = await buildCallWhere(filters)
  const calls = await prisma.callLog.findMany({
    where,
    select: { createdAt: true, direction: true, status: true },
    orderBy: { createdAt: "asc" },
  })

  const hours = Array.from({ length: 24 }, (_, i) => {
    const hourLabel = `${String(i).padStart(2, "0")}:00`
    return {
      hour: hourLabel,
      inbound: 0,
      outbound: 0,
      answered: 0,
      missed: 0,
      total: 0,
    }
  })

  calls.forEach((call) => {
    const date = new Date(call.createdAt)
    const hour = date.getHours()
    if (hours[hour]) {
      hours[hour].total++
      const dir = String(call.direction || "outbound").toLowerCase()
      if (dir === "inbound") hours[hour].inbound++
      else hours[hour].outbound++

      if (isAnsweredCall(call.status)) hours[hour].answered++
      else hours[hour].missed++
    }
  })

  return hours
}

const getCallDailyDistribution = async (filters = {}) => {
  const where = await buildCallWhere(filters)
  const calls = await prisma.callLog.findMany({
    where,
    select: { createdAt: true, direction: true, status: true, duration: true },
    orderBy: { createdAt: "asc" },
  })

  const dailyMap = new Map()

  calls.forEach((call) => {
    const date = new Date(call.createdAt)
    const key = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        date: key,
        total: 0,
        inbound: 0,
        outbound: 0,
        answered: 0,
        missed: 0,
        talkTimeSeconds: 0,
      })
    }
    const item = dailyMap.get(key)
    item.total++
    const dir = String(call.direction || "outbound").toLowerCase()
    if (dir === "inbound") item.inbound++
    else item.outbound++

    if (isAnsweredCall(call.status)) {
      item.answered++
      item.talkTimeSeconds += Number(call.duration) || 0
    } else {
      item.missed++
    }
  })

  return Array.from(dailyMap.values())
}

const getDidBreakup = async (filters = {}) => {
  const where = await buildCallWhere(filters)
  const calls = await prisma.callLog.findMany({
    where,
    select: { virtualNumber: true, direction: true, status: true, duration: true },
  })

  const didMap = new Map()
  const config = mcubeConfig.getServiceConfig()
  const defaultDid = config.inboundNumber || config.outboundNumber || "Primary DID"

  calls.forEach((call) => {
    const did = String(call.virtualNumber || defaultDid).trim() || "Unspecified DID"
    if (!didMap.has(did)) {
      didMap.set(did, {
        didNumber: did,
        totalCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        answeredCalls: 0,
        missedCalls: 0,
        totalTalkTimeSeconds: 0,
      })
    }
    const item = didMap.get(did)
    item.totalCalls++
    const dir = String(call.direction || "outbound").toLowerCase()
    if (dir === "inbound") item.inboundCalls++
    else item.outboundCalls++

    if (isAnsweredCall(call.status)) {
      item.answeredCalls++
      item.totalTalkTimeSeconds += Number(call.duration) || 0
    } else {
      item.missedCalls++
    }
  })

  return Array.from(didMap.values()).map((item) => ({
    ...item,
    totalTalkTimeFormatted: formatDuration(item.totalTalkTimeSeconds),
    answerRate: item.totalCalls > 0 ? Number(((item.answeredCalls / item.totalCalls) * 100).toFixed(1)) : 0,
  }))
}

const getAgentCallPerformance = async (filters = {}) => {
  const userWhere = {
    ...(filters.salesUserId ? { id: Number(filters.salesUserId) } : {}),
    OR: [{ role: "SALES" }, { department: "SALES" }, { role: "PRE_SALES" }, { department: "PRE_SALES" }, { role: "MANAGER" }],
  }

  const users = await prisma.user.findMany({
    where: userWhere,
    include: {
      mcubeAgent: true,
    },
    orderBy: [{ firstName: "asc" }, { username: "asc" }],
  })

  const baseWhere = await buildCallWhere({ ...filters, salesUserId: undefined })

  return Promise.all(
    users.map(async (user) => {
      const agentCalls = await prisma.callLog.findMany({
        where: {
          ...baseWhere,
          OR: [{ agentId: user.id }, { lead: { teamId: user.id } }],
        },
        select: { direction: true, status: true, duration: true },
      })

      let totalCalls = agentCalls.length
      let inbound = 0
      let outbound = 0
      let answered = 0
      let missed = 0
      let talkTimeSeconds = 0

      agentCalls.forEach((call) => {
        const dir = String(call.direction || "outbound").toLowerCase()
        if (dir === "inbound") inbound++
        else outbound++

        if (isAnsweredCall(call.status)) {
          answered++
          talkTimeSeconds += Number(call.duration) || 0
        } else {
          missed++
        }
      })

      const answerRate = totalCalls > 0 ? Number(((answered / totalCalls) * 100).toFixed(1)) : 0
      const avgDurationSeconds = answered > 0 ? Math.round(talkTimeSeconds / answered) : 0

      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email

      return {
        userId: user.id,
        userName,
        role: user.role || user.department || "Agent",
        extension: user.mcubeAgent?.extension || "-",
        phone: user.phone || "-",
        callingMode: user.mcubeAgent?.callingMode || "softphone",
        totalCalls,
        inbound,
        outbound,
        answered,
        missed,
        answerRate,
        talkTimeSeconds,
        talkTimeFormatted: formatDuration(talkTimeSeconds),
        avgDurationSeconds,
        avgDurationFormatted: formatDuration(avgDurationSeconds),
      }
    })
  )
}

const getCallDetailRecords = async (filters = {}) => {
  const where = await buildCallWhere(filters)
  const page = Math.max(1, parseInt(filters.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20))
  const skip = (page - 1) * limit

  const [totalCount, callLogs] = await Promise.all([
    prisma.callLog.count({ where }),
    prisma.callLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            phones: true,
            status: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            phone: true,
          },
        },
        interestedProjectRef: {
          select: { id: true, name: true },
        },
      },
    }),
  ])

  const records = callLogs.map((log) => {
    const leadName = log.lead ? [log.lead.firstName, log.lead.lastName].filter(Boolean).join(" ") || log.lead.companyName || `Lead #${log.lead.id}` : null
    const agentName = log.agent ? [log.agent.firstName, log.agent.lastName].filter(Boolean).join(" ") || log.agent.username || log.agent.email : (log.providerAgentName || "-")

    return {
      id: log.id,
      callId: log.callId || log.providerCallId || `CDR-${log.id}`,
      direction: log.direction || "outbound",
      phone: log.callerNumber || log.customerNumber || log.leadPhone || log.phone || "-",
      leadId: log.leadId,
      leadName,
      leadStatus: log.lead?.status || null,
      agentId: log.agentId,
      agentName,
      agentPhone: log.agentPhone || log.agentNumber || "-",
      agentExtension: log.agentExtension || "-",
      virtualNumber: log.virtualNumber || "-",
      status: log.status || "initiated",
      duration: log.duration || 0,
      durationFormatted: formatDuration(log.duration || 0),
      durationClock: formatDurationClock(log.duration || 0),
      recordingUrl: log.recordingUrl || null,
      disposition: log.disposition || "-",
      notes: log.notes || "",
      projectName: log.interestedProjectRef?.name || log.interestedProject || "-",
      createdAt: log.createdAt,
      startedAt: log.startedAt,
      endedAt: log.endedAt,
    }
  })

  return {
    records,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  }
}

/**
 * On-demand Mcube CDR Sync:
 * Queries Mcube CDR endpoints if token/URL available and creates or links call logs with CRM leads & users.
 */
const syncMcubeCdr = async (filters = {}) => {
  const config = mcubeConfig.getServiceConfig()
  let syncedCount = 0
  let matchedLeads = 0

  // 1. Re-match unassigned call logs in the database with existing leads by phone
  const unlinkedLogs = await prisma.callLog.findMany({
    where: { leadId: null },
    take: 100,
    orderBy: { id: "desc" },
  })

  for (const log of unlinkedLogs) {
    const rawNumber = log.callerNumber || log.customerNumber || log.leadPhone || log.phone
    if (!rawNumber) continue
    const target10 = normalizePhoneNumber(rawNumber).slice(-10)
    if (!target10) continue

    const allLeads = await prisma.lead.findMany({
      where: { is_delete: false },
      select: { id: true, phones: true, teamId: true },
      take: 200,
      orderBy: { id: "desc" },
    })

    const matchedLead = allLeads.find((lead) => {
      const phones = lead.phones
      const str = typeof phones === "string" ? phones : JSON.stringify(phones || "")
      return str.includes(target10)
    })

    if (matchedLead) {
      await prisma.callLog.update({
        where: { id: log.id },
        data: {
          leadId: matchedLead.id,
          agentId: log.agentId || matchedLead.teamId || null,
        },
      })
      matchedLeads++
      syncedCount++
    }
  }

  return {
    success: true,
    message: `MCube CDR sync completed. Processed and linked ${matchedLeads} calls to CRM leads.`,
    syncedCount,
    matchedLeads,
    timestamp: new Date().toISOString(),
  }
}

const getDrilldownCalls = async (filters = {}, req = null) => {
  const where = await buildCallWhere(filters)
  const isAdmin = req ? isAdminUser(req) : false

  // Fetch all call logs matching active global filters
  const callLogs = await prisma.callLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          phones: true,
          status: true,
          budget: true,
          interestedProjects: true,
          siteVisitProject: true,
          channelPartner: true,
          fundingSource: true,
          teamId: true,
        },
      },
      agent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          phone: true,
        },
      },
      interestedProjectRef: {
        select: { id: true, name: true },
      },
    },
  })

  let title = "Calls Drilldown"
  const metric = String(filters.metric || "").trim().toLowerCase()
  const statusSegment = String(filters.statusSegment || filters.status || "").trim()
  const hourParam = filters.hour !== undefined && filters.hour !== null && filters.hour !== "" ? String(filters.hour).trim() : null
  const dateParam = filters.date ? String(filters.date).trim() : null
  const channelParam = filters.channel ? String(filters.channel).trim().toLowerCase() : null

  let filtered = callLogs

  // 1. Stat cards filter
  if (metric === "totalcalls") {
    title = "Total Calls"
  } else if (metric === "inboundcalls" || metric === "inbound") {
    title = "Inbound Calls"
    filtered = filtered.filter((c) => String(c.direction || "outbound").toLowerCase() === "inbound")
  } else if (metric === "outboundcalls" || metric === "outbound") {
    title = "Outbound Calls"
    filtered = filtered.filter((c) => String(c.direction || "outbound").toLowerCase() !== "inbound")
  } else if (metric === "answeredcalls" || metric === "answered" || metric === "connected") {
    title = "Answered / Connected Calls"
    filtered = filtered.filter((c) => isAnsweredCall(c.status))
  } else if (metric === "missedcalls" || metric === "missed" || metric === "busy") {
    title = "Missed / Busy Calls"
    filtered = filtered.filter((c) => !isAnsweredCall(c.status))
  } else if (metric === "answeredratio" || metric === "answerrate") {
    title = "Calls — Answer Rate (All Activity)"
  } else if (metric === "totaltalktimeformatted" || metric === "totaltalktime" || metric === "talktime") {
    title = "Calls with Talk Time (Duration > 0)"
    filtered = filtered.filter((c) => (Number(c.duration) || 0) > 0)
  } else if (metric === "avgdurationclock" || metric === "avgdurationseconds" || metric === "avgduration") {
    title = "Calls Contributing to Average Duration"
    filtered = filtered.filter((c) => (Number(c.duration) || 0) > 0)
  }

  // 2. Status segment filter (Call Status Breakdown donut chart)
  if (statusSegment) {
    const raw = statusSegment.toLowerCase()
    if (raw === "connected" || raw === "completed" || raw === "answered") {
      title = "Calls — Connected"
      filtered = filtered.filter((c) => ["connected", "completed", "answered"].includes(String(c.status || "").toLowerCase()))
    } else if (raw === "missed") {
      title = "Calls — Missed"
      filtered = filtered.filter((c) => String(c.status || "").toLowerCase() === "missed")
    } else if (raw === "busy") {
      title = "Calls — Busy"
      filtered = filtered.filter((c) => String(c.status || "").toLowerCase() === "busy")
    } else if (raw === "no answer" || raw === "no-answer" || raw === "noanswer") {
      title = "Calls — No Answer"
      filtered = filtered.filter((c) => ["no-answer", "noanswer"].includes(String(c.status || "").toLowerCase()))
    } else if (raw === "failed" || raw === "rejected" || raw === "canceled" || raw === "cancelled") {
      title = "Calls — Failed"
      filtered = filtered.filter((c) => ["failed", "rejected", "canceled", "cancelled"].includes(String(c.status || "").toLowerCase()))
    } else if (raw === "initiated") {
      title = "Calls — Initiated"
      const known = ["connected", "completed", "answered", "missed", "busy", "no-answer", "noanswer", "failed", "rejected", "canceled", "cancelled"]
      filtered = filtered.filter((c) => !known.includes(String(c.status || "").toLowerCase()))
    }
  }

  // 3. Hourly filter (Hourly Call Distribution bar chart)
  if (hourParam !== null) {
    const targetHour = parseInt(hourParam, 10)
    if (!Number.isNaN(targetHour)) {
      const hourLabel = `${String(targetHour).padStart(2, "0")}:00`
      title = `Calls at ${hourLabel}`
      filtered = filtered.filter((c) => {
        const d = new Date(c.createdAt)
        return d.getHours() === targetHour
      })
    }
  }

  // 4. Daily filter (Daily Call Trend line chart)
  if (dateParam) {
    title = `Calls on ${dateParam}`
    filtered = filtered.filter((c) => {
      const d = new Date(c.createdAt)
      const key = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      return key.toLowerCase() === dateParam.toLowerCase() || d.toISOString().startsWith(dateParam)
    })
  }

  // 5. Channel filter (e.g. Inbound / Outbound / Missed bar/legend/series click)
  if (channelParam) {
    if (channelParam === "inbound") {
      title = `${title} (Inbound)`
      filtered = filtered.filter((c) => String(c.direction || "outbound").toLowerCase() === "inbound")
    } else if (channelParam === "outbound") {
      title = `${title} (Outbound)`
      filtered = filtered.filter((c) => String(c.direction || "outbound").toLowerCase() !== "inbound")
    } else if (channelParam === "missed") {
      title = `${title} (Missed)`
      filtered = filtered.filter((c) => !isAnsweredCall(c.status))
    } else if (channelParam === "answered") {
      title = `${title} (Answered)`
      filtered = filtered.filter((c) => isAnsweredCall(c.status))
    }
  }

  // Map and sanitize call records for presentation
  const calls = filtered.map((log) => {
    const rawNumber = log.callerNumber || log.customerNumber || log.leadPhone || log.phone || "-"
    const displayPhone = isAdmin ? rawNumber : maskPhoneNumber(rawNumber)

    let leadPrimaryPhone = "-"
    if (log.lead) {
      if (Array.isArray(log.lead.phones) && log.lead.phones.length > 0) {
        leadPrimaryPhone = typeof log.lead.phones[0] === "object" ? (log.lead.phones[0].value || log.lead.phones[0].phone || log.lead.phones[0].number || "-") : log.lead.phones[0]
      } else if (typeof log.lead.phones === "string") {
        leadPrimaryPhone = log.lead.phones
      }
    }
    const safeLeadPhone = isAdmin ? leadPrimaryPhone : maskPhoneNumber(leadPrimaryPhone)

    const leadName = log.lead
      ? [log.lead.firstName, log.lead.lastName].filter(Boolean).join(" ") || log.lead.companyName || `Lead #${log.lead.id}`
      : null

    const agentName = log.agent
      ? [log.agent.firstName, log.agent.lastName].filter(Boolean).join(" ") || log.agent.username || log.agent.email
      : (log.providerAgentName || "-")

    const dur = Number(log.duration) || 0

    return {
      id: log.id,
      callId: log.callId || log.providerCallId || `CDR-${log.id}`,
      phone: displayPhone,
      direction: log.direction || "outbound",
      status: log.status || "initiated",
      duration: dur,
      durationFormatted: formatDuration(dur),
      durationClock: formatDurationClock(dur),
      agentId: log.agentId || null,
      agentName,
      agentPhone: isAdmin ? (log.agentPhone || log.agentNumber || "-") : maskPhoneNumber(log.agentPhone || log.agentNumber || "-"),
      time: log.createdAt,
      createdAt: log.createdAt,
      disposition: log.disposition || "-",
      recordingUrl: isAdmin ? (log.recordingUrl || null) : null,
      notes: log.notes || "",
      virtualNumber: log.virtualNumber || "-",
      projectName: log.interestedProjectRef?.name || log.interestedProject || log.lead?.interestedProjects || log.lead?.siteVisitProject || "-",
      leadId: log.leadId || null,
      leadName,
      lead: log.lead ? {
        id: log.lead.id,
        firstName: log.lead.firstName,
        lastName: log.lead.lastName,
        name: leadName,
        phone: safeLeadPhone,
        status: log.lead.status,
        budget: log.lead.budget,
        channelPartner: log.lead.channelPartner,
        fundingSource: log.lead.fundingSource,
        interestedProjects: log.lead.interestedProjects || log.lead.siteVisitProject || "-",
      } : null,
    }
  })

  return {
    title,
    count: calls.length,
    calls,
    filters: {
      salesUserId: filters.salesUserId || null,
      projectId: filters.projectId || null,
      fromDate: filters.fromDate || null,
      toDate: filters.toDate || null,
      leadSource: filters.leadSource || null,
      leadStatus: filters.leadStatus || null,
      metric: filters.metric || null,
      statusSegment: statusSegment || null,
      hour: hourParam,
      date: dateParam,
      channel: channelParam,
    },
  }
}

module.exports = {
  getCallSummary,
  getCallStatusDistribution,
  getCallHourlyDistribution,
  getCallDailyDistribution,
  getDidBreakup,
  getAgentCallPerformance,
  getCallDetailRecords,
  getDrilldownCalls,
  syncMcubeCdr,
}
