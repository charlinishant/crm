const prisma = require("../lib/prisma")
const { get10DigitIndianPhone, matches10DigitPhone, cleanPhone } = require("../utils/phone")
const { maskPhoneNumber, maskCallLogData } = require("../utils/phoneMask")
const { connectedUser, getIO } = require("../socket")

const missedCallStatuses = ["missed", "no-answer", "busy", "failed", "canceled", "rejected"]

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
  return values.map(get10DigitIndianPhone).filter(Boolean)
}

/**
 * Match a normalized 10-digit Indian phone number against existing CRM leads.
 * Uses exact 10-digit matching (no partial matching or 4-digit matching).
 */
const findLeadByExact10DigitPhone = async (rawPhone) => {
  const target10 = get10DigitIndianPhone(rawPhone)
  if (!target10) return null

  const leads = await prisma.lead.findMany({
    where: { is_delete: false },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      phones: true,
      teamId: true,
      status: true,
      channelPartner: true,
      tags: true,
      interestedProjects: true,
      propertyType: true,
      budget: true,
      budgetMin: true,
      budgetMax: true,
      team: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
    },
    orderBy: { id: "desc" },
  })

  return leads.find((lead) => getAllLeadPhones(lead).some((p) => p === target10)) || null
}

/**
 * Check if a CRM user is currently available.
 * Considers attendance status ("Available" or "On Call") or active socket connection.
 */
const isUserAvailable = async (userId) => {
  if (!userId) return false
  const numericId = Number(userId)
  if (Number.isNaN(numericId)) return false

  // Check active attendance record
  const attendance = await prisma.userAttendance.findFirst({
    where: {
      userId: numericId,
      logoutAt: null,
      status: { in: ["Available", "On Call"] },
    },
    orderBy: { updatedAt: "desc" },
  })

  if (attendance) return true

  // Check real-time socket connection
  if (connectedUser.has(String(numericId)) || connectedUser.has(numericId)) {
    return true
  }

  // If no attendance records exist in the system, fall back to isActive
  const totalAttendanceCount = await prisma.userAttendance.count()
  if (totalAttendanceCount === 0) {
    const user = await prisma.user.findUnique({ where: { id: numericId } })
    return Boolean(user?.isActive)
  }

  return false
}

/**
 * Select the next available sales agent using round-robin / least-loaded strategy.
 */
const getNextRoundRobinAgent = async (excludeUserIds = []) => {
  const salesUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["SALES", "PRE_SALES", "MANAGER"] },
      ...(excludeUserIds.length ? { id: { notIn: excludeUserIds } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
    orderBy: { id: "asc" },
  })

  if (!salesUsers.length) {
    // Fallback: any active user not excluded
    return prisma.user.findFirst({
      where: {
        isActive: true,
        ...(excludeUserIds.length ? { id: { notIn: excludeUserIds } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      orderBy: { id: "asc" },
    })
  }

  // Check availability for all candidates
  const availabilityMap = new Map()
  for (const user of salesUsers) {
    const available = await isUserAvailable(user.id)
    availabilityMap.set(user.id, available)
  }

  const availableUsers = salesUsers.filter((u) => availabilityMap.get(u.id))
  const pool = availableUsers.length > 0 ? availableUsers : salesUsers

  // Get call/lead load today for each user in pool to implement round-robin least-loaded
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const callCounts = await prisma.callLog.groupBy({
    by: ["agentId"],
    where: {
      agentId: { in: pool.map((u) => u.id) },
      createdAt: { gte: todayStart },
    },
    _count: { id: true },
  })

  const countMap = new Map(callCounts.map((item) => [item.agentId, item._count.id]))

  // Sort by lowest count today, then by lowest id for consistency
  pool.sort((a, b) => {
    const countA = countMap.get(a.id) || 0
    const countB = countMap.get(b.id) || 0
    if (countA !== countB) return countA - countB
    return a.id - b.id
  })

  return pool[0] || null
}

/**
 * Identifies caller and routes inbound call per confirmed decisions:
 * - Decision 1: If owner unavailable, try fallback agent before marking missed.
 * - Decision 2: If unknown caller, auto-create lead with source 'Inbound Call / IVR' and assign.
 */
const resolveInboundCallerAndAgent = async ({
  customerPhone,
  providerCallId = "",
  providedAgent = null,
  providedAgentResolvedBy = "",
}) => {
  const target10 = get10DigitIndianPhone(customerPhone)
  const normalizedPhone = target10 ? `91${target10}` : (cleanPhone(customerPhone) || "-")

  // 1. Look for existing lead by 10-digit Indian phone
  const existingLead = await findLeadByExact10DigitPhone(customerPhone)

  if (existingLead) {
    // Known caller: Reuse existing lead and route to assigned telecaller
    const assignedTelecallerId = existingLead.teamId || null
    let routedAgentId = assignedTelecallerId

    const hasExplicitAgent = Boolean(
      providedAgent?.id &&
      providedAgentResolvedBy &&
      providedAgentResolvedBy !== "fallback_availability"
    )

    if (hasExplicitAgent) {
      routedAgentId = providedAgent.id
    } else if (!assignedTelecallerId) {
      // Lead has no telecaller assigned: assign via round-robin
      const fallbackAgent = await getNextRoundRobinAgent()
      if (fallbackAgent) {
        routedAgentId = fallbackAgent.id
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: { teamId: routedAgentId },
        }).catch(() => null)
      }
    }

    return {
      lead: existingLead,
      agentId: routedAgentId || assignedTelecallerId,
      intendedTelecallerId: assignedTelecallerId || routedAgentId,
      isNewLead: false,
    }
  }

  // 2. Unknown caller (Decision 2): Auto-create new lead with source 'Inbound Call / IVR'
  // Deduplication check: check if this providerCallId already created a lead or if a lead
  // with this phone was created in the last 2 minutes
  let newLead = null
  if (providerCallId) {
    const existingCall = await prisma.callLog.findFirst({
      where: {
        OR: [{ providerCallId }, { callId: providerCallId }],
        leadId: { not: null },
      },
      include: { lead: true },
    })
    if (existingCall?.lead) {
      return {
        lead: existingCall.lead,
        agentId: existingCall.agentId || providedAgent?.id || null,
        intendedTelecallerId: existingCall.agentId || null,
        isNewLead: false,
      }
    }
  }

  // Pick assigned agent for new lead via round-robin
  const assignedAgent = providedAgent || await getNextRoundRobinAgent()
  const agentId = assignedAgent?.id || null

  const phoneValue = target10 || cleanPhone(customerPhone) || ""
  newLead = await prisma.lead.create({
    data: {
      firstName: "Inbound",
      lastName: "Caller",
      phones: phoneValue ? [{ type: "Mobile", value: phoneValue, primary: true }] : [],
      channelPartner: "Inbound Call / IVR",
      tags: "Inbound Call / IVR",
      status: "New",
      teamId: agentId,
      seats: 0,
      tenure: 0,
      industry: "",
      is_delete: false,
      is_active: true,
    },
  })

  return {
    lead: newLead,
    agentId,
    intendedTelecallerId: agentId,
    isNewLead: true,
  }
}

/**
 * Handles missed call workflow:
 * - Records missed call details on CallLog
 * - Creates a callback Task for the intended telecaller
 * - Creates a FollowUp on the lead
 * - Creates a persistent Notification for the telecaller
 * - Emits real-time socket events
 */
const recordMissedCallWorkflow = async (callLogId) => {
  if (!callLogId) return null

  const callLog = await prisma.callLog.findUnique({
    where: { id: callLogId },
    include: {
      lead: true,
      agent: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  })

  if (!callLog) return null

  // Guard against marking an already answered/completed call as missed
  if (["completed", "connected"].includes(callLog.status) || callLog.answeredAt) {
    return callLog
  }

  const telecallerId = callLog.agentId || callLog.lead?.teamId || null
  const callerPhone = callLog.callerNumber || callLog.leadPhone || callLog.phone || ""
  const maskedPhone = maskPhoneNumber(callerPhone)
  const displayPhone = callerPhone || "-"
  const leadName = callLog.lead
    ? [callLog.lead.firstName, callLog.lead.lastName].filter(Boolean).join(" ") || `Lead #${callLog.lead.id}`
    : "Inbound Caller"

  const now = new Date()
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  // 1. Create callback Task if not already created (deduplication check)
  let callbackTaskId = callLog.callbackTaskId || null
  if (!callbackTaskId && telecallerId) {
    const existingTask = await prisma.task.findFirst({
      where: {
        assigneeId: telecallerId,
        type: "Callback",
        description: { contains: String(callLog.providerCallId || callLog.id) },
      },
    })

    if (existingTask) {
      callbackTaskId = existingTask.id
    } else {
      const task = await prisma.task.create({
        data: {
          title: `Callback Missed Inbound Call - ${leadName}`,
          description: `Missed inbound call from ${displayPhone}. Call Reference: ${callLog.providerCallId || callLog.id}`,
          type: "Callback",
          status: "Open",
          priority: "High",
          dueDate: now,
          dueTime: timeStr,
          assigneeId: telecallerId,
          assigneeName: callLog.agent
            ? [callLog.agent.firstName, callLog.agent.lastName].filter(Boolean).join(" ")
            : `User #${telecallerId}`,
        },
      }).catch((err) => {
        console.error("Unable to create missed call task:", err.message)
        return null
      })
      if (task) callbackTaskId = task.id
    }
  }

  // 2. Create FollowUp on lead if leadId exists (deduplication check)
  let callbackFollowUpId = callLog.callbackFollowUpId || null
  if (!callbackFollowUpId && callLog.leadId && telecallerId) {
    const existingFollowUp = await prisma.followUp.findFirst({
      where: {
        leadId: callLog.leadId,
        salesUserId: telecallerId,
        type: "Callback",
        notes: { contains: String(callLog.providerCallId || callLog.id) },
      },
    })

    if (existingFollowUp) {
      callbackFollowUpId = existingFollowUp.id
    } else {
      const followUp = await prisma.followUp.create({
        data: {
          leadId: callLog.leadId,
          salesUserId: telecallerId,
          type: "Callback",
          followUpDate: now,
          followUpTime: timeStr,
          priority: "High",
          notes: `Callback required: Missed inbound call from ${maskedPhone} (Call Ref: ${callLog.providerCallId || callLog.id})`,
          status: "Pending",
        },
      }).catch((err) => {
        console.error("Unable to create missed call followup:", err.message)
        return null
      })
      if (followUp) callbackFollowUpId = followUp.id
    }
  }

  // 3. Create Notification for the sales user
  if (telecallerId) {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: telecallerId,
        description: { contains: String(callLog.providerCallId || callLog.id) },
      },
    })

    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          titile: `Missed Call from ${leadName}`,
          description: `Missed inbound call from ${maskedPhone}. Please return call promptly. Ref: ${callLog.providerCallId || callLog.id}`,
          link: "/user/sales/calls/missed",
          userId: telecallerId,
          isRead: false,
        },
      }).catch((err) => {
        console.error("Unable to create missed call notification:", err.message)
      })
    }
  }

  // 4. Update CallLog record
  const updatedCallLog = await prisma.callLog.update({
    where: { id: callLog.id },
    data: {
      status: "missed",
      endedAt: callLog.endedAt || now,
      isAcknowledged: false,
      callbackStatus: callLog.callbackStatus || "pending",
      callbackTaskId,
      callbackFollowUpId,
    },
    include: {
      lead: true,
      agent: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  })

  // 5. Emit real-time Socket.io events
  try {
    const io = getIO()
    const payload = {
      id: updatedCallLog.id,
      callLogId: updatedCallLog.id,
      providerCallId: updatedCallLog.providerCallId || updatedCallLog.callId,
      callerNumber: maskedPhone,
      direction: "inbound",
      status: "missed",
      leadId: updatedCallLog.leadId,
      leadName,
      agentId: telecallerId,
      startedAt: updatedCallLog.startedAt || updatedCallLog.createdAt,
      isAcknowledged: false,
      callbackStatus: updatedCallLog.callbackStatus,
      callbackTaskId,
      callbackFollowUpId,
    }

    if (telecallerId) {
      const socketId = connectedUser.get(String(telecallerId)) || connectedUser.get(Number(telecallerId))
      if (socketId) io.to(socketId).emit("mcube:inbound:missed", payload)
      io.to(`user:${telecallerId}`).emit("mcube:inbound:missed", payload)
      io.to(`user:${telecallerId}`).emit("missed-call:new", payload)
      io.emit(`mcube:inbound:missed-${telecallerId}`, payload)
    }

    // Broadcast missed call and notification updates
    io.emit("mcube:inbound:missed", payload)
    io.emit("missed-call:new", payload)
    io.emit("notification:new", { userId: telecallerId })
  } catch (socketErr) {
    console.error("Unable to emit missed call socket event:", socketErr.message)
  }

  return updatedCallLog
}

/**
 * Acknowledge a missed call by sales user.
 */
const acknowledgeMissedCall = async (callLogId, authUser) => {
  const numericId = Number(callLogId)
  if (!numericId) throw new Error("Invalid callLogId")

  const callLog = await prisma.callLog.findUnique({ where: { id: numericId } })
  if (!callLog) throw new Error("Call log not found")

  const hasAckField = Boolean(prisma.callLog?.fields?.isAcknowledged)
  const updateData = hasAckField
    ? {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedById: authUser.id,
      }
    : {}

  const updated = await prisma.callLog.update({
    where: { id: numericId },
    data: updateData,
    include: {
      lead: true,
      agent: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })

  try {
    const io = getIO()
    io.emit("missed-call:acknowledged", {
      callLogId: updated.id,
      userId: authUser.id,
    })
  } catch (e) {}

  return updated
}

/**
 * Acknowledge all unacknowledged missed calls for a sales user.
 */
const acknowledgeAllMissedCallsForUser = async (authUser) => {
  const hasAckField = Boolean(prisma.callLog?.fields?.isAcknowledged)
  if (!hasAckField) return { count: 0 }

  const result = await prisma.callLog.updateMany({
    where: {
      agentId: authUser.id,
      direction: "inbound",
      status: { in: missedCallStatuses },
      isAcknowledged: false,
    },
    data: {
      isAcknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgedById: authUser.id,
    },
  })

  try {
    const io = getIO()
    io.emit("missed-call:acknowledged-all", { userId: authUser.id })
  } catch (e) {}

  return result
}

/**
 * Complete a callback for a missed call.
 * Marks callbackStatus as 'completed', and completes linked Task and FollowUp.
 */
const completeCallback = async (callLogId, authUser, notes = "") => {
  const numericId = Number(callLogId)
  if (!numericId) throw new Error("Invalid callLogId")

  const callLog = await prisma.callLog.findUnique({
    where: { id: numericId },
    include: { lead: true },
  })
  if (!callLog) throw new Error("Call log not found")

  const now = new Date()

  const hasAckField = Boolean(prisma.callLog?.fields?.isAcknowledged)
  const hasCallbackField = Boolean(prisma.callLog?.fields?.callbackStatus)

  const updateData = {
    ...(hasCallbackField ? { callbackStatus: "completed" } : {}),
    ...(hasAckField
      ? {
          isAcknowledged: true,
          acknowledgedAt: callLog.acknowledgedAt || now,
          acknowledgedById: callLog.acknowledgedById || authUser.id,
        }
      : {}),
    notes: notes
      ? (callLog.notes ? `${callLog.notes}\n` : "") + `Callback completed: ${notes}`
      : callLog.notes,
  }

  // 1. Update CallLog callback status
  const updated = await prisma.callLog.update({
    where: { id: numericId },
    data: updateData,
    include: {
      lead: true,
      agent: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })

  // 2. Mark linked Task as completed
  if (callLog.callbackTaskId) {
    await prisma.task.update({
      where: { id: callLog.callbackTaskId },
      data: {
        status: "Completed",
        remark: notes || "Callback completed from CRM missed-calls workspace",
      },
    }).catch(() => null)
  }

  // 3. Mark linked FollowUp as completed
  if (callLog.callbackFollowUpId) {
    await prisma.followUp.update({
      where: { id: callLog.callbackFollowUpId },
      data: {
        status: "Completed",
        completedAt: now,
        notes: notes ? `${notes} (Callback completed)` : "Callback completed",
      },
    }).catch(() => null)
  }

  try {
    const io = getIO()
    io.emit("missed-call:callback-completed", {
      callLogId: updated.id,
      userId: authUser.id,
    })
  } catch (e) {}

  return updated
}

module.exports = {
  findLeadByExact10DigitPhone,
  isUserAvailable,
  getNextRoundRobinAgent,
  resolveInboundCallerAndAgent,
  recordMissedCallWorkflow,
  acknowledgeMissedCall,
  acknowledgeAllMissedCallsForUser,
  completeCallback,
  missedCallStatuses,
}
