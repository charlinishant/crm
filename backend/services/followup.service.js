const prisma = require("../lib/prisma")
const {
  clearCallbackReminderTimers,
  handleCallbackFollowUpSaved,
  snoozeFollowUp: snoozeReminder,
  getScheduledAt,
} = require("./callbackReminder.service")

const terminalLeadStatuses = new Set(["Booked", "Unqualified"])
const followUpStatuses = new Set(["Pending", "Scheduled", "Done", "Completed", "Missed", "Overdue", "Rescheduled", "Cancelled"])
const followUpTypes = new Set(["Call", "Callback", "WhatsApp", "Email", "Visit", "Other"])
const priorities = new Set(["Low", "Medium", "High"])

const leadStatusMap = {
  New: "New",
  Qualified: "Qualified",
  "In Sourcing": "In_sourcing",
  In_sourcing: "In_sourcing",
  "In Closing": "In_closing",
  In_closing: "In_closing",
  "Visit Scheduled": "Qualified",
  Booked: "Booked",
  Unqualified: "Unqualified",
  Nurture: "Nurture",
}

const salesLeadStatusTransitions = {
  New: new Set(["Qualified", "Nurture", "Unqualified"]),
  Qualified: new Set(["Nurture", "In_sourcing", "In_closing", "Unqualified"]),
  Nurture: new Set(["Qualified", "Unqualified"]),
  In_sourcing: new Set(["In_closing", "Nurture", "Unqualified"]),
  In_closing: new Set(["Nurture", "Unqualified"]),
  Booked: new Set([]),
  Unqualified: new Set([]),
}

const getLeadDisplayName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Lead")

const getContactValue = (value, keys = ["value", "phone", "number", "email"]) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = getContactValue(item, keys)
      if (result) return result
    }
    return ""
  }
  if (typeof value === "object") {
    for (const key of keys) {
      if (value[key]) return value[key]
    }
  }
  return ""
}

const combineDateAndTime = (dateValue, timeValue) => {
  if (!dateValue) return null
  const datePart = String(dateValue).slice(0, 10)
  const timePart = String(timeValue || "00:00").slice(0, 5)
  const date = new Date(`${datePart}T${timePart}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const getDateRange = (filter) => {
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endToday = new Date(startToday)
  endToday.setDate(endToday.getDate() + 1)

  if (filter === "today") {
    return { gte: startToday, lt: endToday }
  }

  if (filter === "upcoming") {
    return { gte: endToday }
  }

  if (filter === "missed" || filter === "overdue") {
    return { lt: now }
  }

  return null
}

const getScopedLead = async (leadId, user, tx = prisma) => {
  const numericLeadId = Number(leadId)
  if (!numericLeadId) {
    const error = new Error("Lead is required")
    error.statusCode = 400
    throw error
  }

  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN"
  const lead = await tx.lead.findFirst({
    where: {
      id: numericLeadId,
      ...(isAdmin ? {} : { teamId: Number(user.id) }),
    },
  })

  if (!lead) {
    const error = new Error("Lead not found or not assigned to this sales user")
    error.statusCode = 404
    throw error
  }

  return lead
}

const addActivity = (tx, { leadId, userId, type, message, oldStatus, newStatus }) =>
  tx.leadActivity.create({
    data: {
      leadId: Number(leadId),
      userId: userId ? Number(userId) : null,
      type,
      message,
      oldStatus: oldStatus ? String(oldStatus) : null,
      newStatus: newStatus ? String(newStatus) : null,
    },
  })

const getFollowUpWhere = (user, id) => {
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN"
  return {
    id: Number(id),
    ...(isAdmin ? {} : { salesUserId: Number(user.id) }),
  }
}

const serializeFollowUp = (followUp) => {
  const scheduledAt = getScheduledAt(followUp)
  const isOverdue =
    (followUp.status === "Pending" || followUp.status === "Scheduled") &&
    scheduledAt &&
    scheduledAt.getTime() < Date.now()

  const lead = followUp.lead || {}

  let effectiveStatus = followUp.status
  if (effectiveStatus === "Done" || effectiveStatus === "Completed") {
    effectiveStatus = "Completed"
  } else if (effectiveStatus === "Pending" || effectiveStatus === "Scheduled") {
    if (isOverdue) {
      effectiveStatus = "Overdue"
    } else {
      const msUntilDue = scheduledAt ? scheduledAt.getTime() - Date.now() : Infinity
      if (msUntilDue > 0 && msUntilDue <= 30 * 60 * 1000) {
        effectiveStatus = "Due Soon"
      }
    }
  }

  const reminderAt = scheduledAt ? new Date(scheduledAt.getTime() - 10 * 60 * 1000) : null

  return {
    ...followUp,
    title: `${followUp.type || "Call"} Follow-up`,
    effectiveStatus,
    leadName: getLeadDisplayName(lead),
    phone: getContactValue(lead.phones),
    leadStatus: lead.status || "New",
    scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    reminderAt: reminderAt ? reminderAt.toISOString() : null,
    reminderOffsetMinutes: 10,
    cancellationReason: followUp.status === "Cancelled" ? followUp.notes : null,
  }
}

const buildFollowUpWhere = (user, filter = "all") => {
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN"
  const where = {
    ...(isAdmin ? {} : { salesUserId: Number(user.id) }),
  }

  const normalizedFilter = String(filter).toLowerCase()

  if (normalizedFilter === "today") {
    where.status = { in: ["Pending", "Scheduled"] }
    const range = getDateRange("today")
    if (range) where.followUpDate = range
  } else if (normalizedFilter === "upcoming") {
    where.status = { in: ["Pending", "Scheduled"] }
    const range = getDateRange("upcoming")
    if (range) where.followUpDate = range
  } else if (normalizedFilter === "overdue" || normalizedFilter === "missed") {
    where.status = { in: ["Pending", "Scheduled"] }
    where.followUpDate = { lt: new Date() }
  } else if (normalizedFilter === "due" || normalizedFilter === "due soon" || normalizedFilter === "duesoon") {
    where.status = { in: ["Pending", "Scheduled"] }
    const now = new Date()
    const thirtyMin = new Date(now.getTime() + 30 * 60 * 1000)
    where.followUpDate = { gte: now, lte: thirtyMin }
  } else if (normalizedFilter === "completed" || normalizedFilter === "done") {
    where.status = { in: ["Done", "Completed"] }
  } else if (normalizedFilter === "cancelled") {
    where.status = "Cancelled"
  } else if (normalizedFilter === "callbacks") {
    where.type = "Callback"
    where.status = { in: ["Pending", "Scheduled"] }
  }

  return where
}

const getFollowUps = async (user, filter = "all", options = {}) => {
  const where = buildFollowUpWhere(user, filter)
  const page = Math.max(1, Number(options.page) || 1)
  const limit = Math.max(1, Number(options.limit) || 20)
  const skip = (page - 1) * limit
  const usePagination = options.page !== undefined || options.limit !== undefined

  const [totalItems, rows] = await Promise.all([
    prisma.followUp.count({ where }),
    prisma.followUp.findMany({
      where,
      include: { lead: true },
      orderBy: [{ followUpDate: "asc" }, { followUpTime: "asc" }],
      ...(usePagination ? { skip, take: limit } : {}),
    }),
  ])

  const data = rows.map(serializeFollowUp)
  return usePagination
    ? {
        data,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        page,
        limit,
      }
    : data
}

const createFollowUp = async (user, body) => {
  const leadId = Number(body.leadId)
  const type = body.type || "Call"
  const priority = body.priority || "Medium"
  const status = body.status === "Scheduled" ? "Scheduled" : "Pending"
  const followUpDate = combineDateAndTime(body.followUpDate, body.followUpTime)

  if (!leadId) throw Object.assign(new Error("Lead is required"), { statusCode: 400 })
  if (!followUpTypes.has(type)) throw Object.assign(new Error("Follow-up type is required"), { statusCode: 400 })
  if (!followUpDate) throw Object.assign(new Error("Follow-up date and time are required"), { statusCode: 400 })
  if (!priorities.has(priority)) throw Object.assign(new Error("Priority is invalid"), { statusCode: 400 })

  const timeString = String(body.followUpTime || "").slice(0, 5)

  // 1. Exact accidental duplicate submit prevention within short window (5 seconds)
  const recentDuplicate = await prisma.followUp.findFirst({
    where: {
      leadId,
      salesUserId: Number(user.id),
      type,
      followUpTime: timeString,
      createdAt: { gte: new Date(Date.now() - 5000) },
    },
    include: { lead: true },
  })

  if (recentDuplicate) {
    return serializeFollowUp(recentDuplicate)
  }

  const savedFollowUp = await prisma.$transaction(async (tx) => {
    const lead = await getScopedLead(leadId, user, tx)
    if (terminalLeadStatuses.has(String(lead.status))) {
      throw Object.assign(new Error("Cannot create follow-up for Booked or Unqualified lead"), { statusCode: 400 })
    }

    const nextLeadStatus = lead.status === "New" || !lead.status ? "Qualified" : lead.status
    if (nextLeadStatus !== lead.status) {
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: nextLeadStatus },
      })
    }

    const followUp = await tx.followUp.create({
      data: {
        leadId: lead.id,
        salesUserId: Number(user.id),
        type,
        followUpDate,
        followUpTime: timeString,
        priority,
        notes: body.notes || null,
        status,
      },
      include: { lead: true },
    })

    await addActivity(tx, {
      leadId: lead.id,
      userId: user.id,
      type: "FOLLOW_UP_CREATED",
      message: `${type} follow-up scheduled for ${timeString}`,
      oldStatus: lead.status,
      newStatus: nextLeadStatus,
    })

    return serializeFollowUp(followUp)
  })

  handleCallbackFollowUpSaved(savedFollowUp)
  return savedFollowUp
}

const markFollowUpDone = async (user, id, body = {}) => {
  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findFirst({
      where: getFollowUpWhere(user, id),
      include: { lead: true },
    })

    if (!followUp) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
    if (followUp.status === "Cancelled") {
      throw Object.assign(new Error("Cannot mark cancelled follow-up as Completed"), { statusCode: 400 })
    }
    clearCallbackReminderTimers(followUp.id)

    const updated = await tx.followUp.update({
      where: { id: followUp.id },
      data: {
        status: "Completed",
        completedAt: new Date(),
        notes: body.note ? `${followUp.notes ? `${followUp.notes} | ` : ""}${body.note}` : followUp.notes,
      },
      include: { lead: true },
    })

    await addActivity(tx, {
      leadId: followUp.leadId,
      userId: user.id,
      type: "FOLLOW_UP_DONE",
      message: body.note || `${followUp.type} follow-up completed`,
      oldStatus: followUp.lead.status,
      newStatus: followUp.lead.status,
    })

    if (body.nextAction && body.nextAction !== "create-next-follow-up") {
      await updateLeadStatus(user, followUp.leadId, {
        status: body.nextAction,
        reason: body.reason,
        note: body.note,
      }, tx)
    }

    let serializedNext = null
    if (body.nextAction === "create-next-follow-up" && body.nextFollowUp) {
      const nextDate = combineDateAndTime(body.nextFollowUp.followUpDate, body.nextFollowUp.followUpTime)
      const nextTime = String(body.nextFollowUp.followUpTime || "").slice(0, 5)

      const nextFollowUp = await tx.followUp.create({
        data: {
          leadId: followUp.leadId,
          salesUserId: Number(user.id),
          type: body.nextFollowUp.type || followUp.type,
          followUpDate: nextDate,
          followUpTime: nextTime,
          priority: body.nextFollowUp.priority || "Medium",
          notes: body.nextFollowUp.notes || null,
          status: "Pending",
        },
        include: { lead: true },
      })
      serializedNext = serializeFollowUp(nextFollowUp)
      handleCallbackFollowUpSaved(serializedNext)
    }

    return serializedNext || serializeFollowUp(updated)
  })
}

const rescheduleFollowUp = async (user, id, body) => {
  const followUpDate = combineDateAndTime(body.followUpDate, body.followUpTime)
  if (!followUpDate) throw Object.assign(new Error("New follow-up date and time are required"), { statusCode: 400 })

  const savedFollowUp = await prisma.$transaction(async (tx) => {
    const current = await tx.followUp.findFirst({
      where: getFollowUpWhere(user, id),
      include: { lead: true },
    })

    if (!current) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
    if (current.status === "Done" || current.status === "Completed") {
      throw Object.assign(new Error("Cannot reschedule completed follow-up"), { statusCode: 400 })
    }
    clearCallbackReminderTimers(current.id)

    await tx.followUp.update({
      where: { id: current.id },
      data: { status: "Rescheduled" },
    })

    const next = await tx.followUp.create({
      data: {
        leadId: current.leadId,
        salesUserId: Number(user.id),
        type: body.type || current.type,
        followUpDate,
        followUpTime: String(body.followUpTime || "").slice(0, 5),
        priority: body.priority || current.priority,
        notes: body.notes || current.notes,
        status: "Pending",
        rescheduledFromId: current.id,
      },
      include: { lead: true },
    })

    await addActivity(tx, {
      leadId: current.leadId,
      userId: user.id,
      type: "FOLLOW_UP_RESCHEDULED",
      message: body.notes || `${current.type} follow-up rescheduled for ${next.followUpTime}`,
      oldStatus: current.lead.status,
      newStatus: current.lead.status,
    })

    return serializeFollowUp(next)
  })

  handleCallbackFollowUpSaved(savedFollowUp)
  return savedFollowUp
}

const updateFollowUp = async (user, id, body = {}) => {
  const data = {}
  if (body.type !== undefined) {
    if (!followUpTypes.has(body.type)) throw Object.assign(new Error("Follow-up type is invalid"), { statusCode: 400 })
    data.type = body.type
  }
  if (body.priority !== undefined) {
    if (!priorities.has(body.priority)) throw Object.assign(new Error("Priority is invalid"), { statusCode: 400 })
    data.priority = body.priority
  }
  if (body.notes !== undefined) data.notes = body.notes || null
  if (body.followUpDate !== undefined || body.followUpTime !== undefined) {
    const current = await prisma.followUp.findFirst({ where: getFollowUpWhere(user, id) })
    if (!current) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
    if (current.status === "Done" || current.status === "Completed" || current.status === "Cancelled") {
      throw Object.assign(new Error("Cannot edit completed or cancelled follow-up"), { statusCode: 400 })
    }
    const followUpDate = combineDateAndTime(body.followUpDate || current.followUpDate, body.followUpTime || current.followUpTime)
    if (!followUpDate) throw Object.assign(new Error("Follow-up date and time are required"), { statusCode: 400 })
    data.followUpDate = followUpDate
    data.followUpTime = String(body.followUpTime || current.followUpTime || "").slice(0, 5)
  }
  if (!Object.keys(data).length) throw Object.assign(new Error("No follow-up updates provided"), { statusCode: 400 })

  const updated = await prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findFirst({
      where: getFollowUpWhere(user, id),
      include: { lead: true },
    })
    if (!followUp) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
    if (followUp.status === "Done" || followUp.status === "Completed" || followUp.status === "Cancelled") {
      throw Object.assign(new Error("Cannot edit completed or cancelled follow-up"), { statusCode: 400 })
    }
    clearCallbackReminderTimers(followUp.id)
    const saved = await tx.followUp.update({
      where: { id: followUp.id },
      data,
      include: { lead: true },
    })
    await addActivity(tx, {
      leadId: followUp.leadId,
      userId: user.id,
      type: "FOLLOW_UP_UPDATED",
      message: "Follow-up updated",
      oldStatus: followUp.lead.status,
      newStatus: followUp.lead.status,
    })
    return serializeFollowUp(saved)
  })

  handleCallbackFollowUpSaved(updated)
  return updated
}

const cancelFollowUp = async (user, id, body = {}) => {
  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findFirst({
      where: getFollowUpWhere(user, id),
      include: { lead: true },
    })

    if (!followUp) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
    clearCallbackReminderTimers(followUp.id)

    const reason = body.reason || body.note || body.cancellationReason || "Cancelled by user"

    const updated = await tx.followUp.update({
      where: { id: followUp.id },
      data: {
        status: "Cancelled",
        notes: reason,
      },
      include: { lead: true },
    })

    await addActivity(tx, {
      leadId: followUp.leadId,
      userId: user.id,
      type: "FOLLOW_UP_CANCELLED",
      message: reason,
      oldStatus: followUp.lead.status,
      newStatus: followUp.lead.status,
    })

    return serializeFollowUp(updated)
  })
}

const updateLeadStatus = async (user, leadId, body, tx = prisma) => {
  const normalizedStatus = leadStatusMap[body.status] || leadStatusMap[body.newStatus]
  if (!normalizedStatus) throw Object.assign(new Error("Valid lead status is required"), { statusCode: 400 })
  if (normalizedStatus === "Booked") {
    throw Object.assign(new Error("A lead can only be marked Booked after booking confirmation"), { statusCode: 400 })
  }
  if (normalizedStatus === "Unqualified" && !body.reason) {
    throw Object.assign(new Error("Reason is required when marking lead Unqualified"), { statusCode: 400 })
  }

  const lead = await getScopedLead(leadId, user, tx)
  const currentStatus = leadStatusMap[lead.status] || "New"
  if (lead.status === "Booked" && normalizedStatus !== "Booked") {
    throw Object.assign(new Error("Booked lead status cannot be changed"), { statusCode: 409 })
  }
  const isSalesUser = String(user?.role || "").toUpperCase() !== "ADMIN"
  if (
    isSalesUser &&
    currentStatus !== normalizedStatus &&
    !salesLeadStatusTransitions[currentStatus]?.has(normalizedStatus)
  ) {
    throw Object.assign(new Error(`Status cannot be changed from ${currentStatus} to ${normalizedStatus}`), { statusCode: 403 })
  }
  const data = {
    status: normalizedStatus,
  }

  if (normalizedStatus === "Unqualified") {
    data.unqualifiedReason = body.reason
    data.unqualifiedNote = body.note || null
  }

  if (body.callAttempt) {
    data.callAttemptCount = { increment: 1 }
  }

  const updated = await tx.lead.update({
    where: { id: lead.id },
    data,
  })

  await addActivity(tx, {
    leadId: lead.id,
    userId: user.id,
    type: "LEAD_STATUS_UPDATED",
    message: body.note || body.reason || `Lead marked ${body.status || body.newStatus}`,
    oldStatus: lead.status,
    newStatus: normalizedStatus,
  })

  return updated
}

const getLeadFollowUpContext = async (user, leadId) => {
  const lead = await getScopedLead(leadId, user)
  const [followUps, activities] = await Promise.all([
    prisma.followUp.findMany({
      where: { leadId: lead.id, salesUserId: Number(user.id) },
      orderBy: [{ followUpDate: "asc" }, { followUpTime: "asc" }],
      include: { lead: true },
    }),
    prisma.leadActivity.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  return {
    lead,
    followUps: followUps.map(serializeFollowUp),
    activities,
  }
}

module.exports = {
  cancelFollowUp,
  createFollowUp,
  getFollowUps,
  getLeadFollowUpContext,
  markFollowUpDone,
  rescheduleFollowUp,
  snoozeFollowUp: snoozeReminder,
  updateFollowUp,
  updateLeadStatus,
}
