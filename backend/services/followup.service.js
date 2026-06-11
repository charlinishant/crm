const prisma = require("../lib/prisma")

const terminalLeadStatuses = new Set(["Booked", "Unqualified"])
const followUpStatuses = new Set(["Pending", "Done", "Missed", "Rescheduled", "Cancelled"])
const followUpTypes = new Set(["Call", "WhatsApp", "Email", "Visit", "Other"])
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

  if (filter === "missed") {
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

const cancelPendingFollowUps = (tx, leadId) =>
  tx.followUp.updateMany({
    where: {
      leadId: Number(leadId),
      status: "Pending",
    },
    data: { status: "Cancelled" },
  })

const getFollowUpWhere = (user, id) => {
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN"
  return {
    id: Number(id),
    ...(isAdmin ? {} : { salesUserId: Number(user.id) }),
  }
}

const serializeFollowUp = (followUp) => {
  const scheduledAt = combineDateAndTime(followUp.followUpDate, followUp.followUpTime)
  const isMissed = followUp.status === "Pending" && scheduledAt && scheduledAt.getTime() < Date.now()
  const lead = followUp.lead || {}

  return {
    ...followUp,
    effectiveStatus: isMissed ? "Missed" : followUp.status,
    leadName: getLeadDisplayName(lead),
    phone: getContactValue(lead.phones),
    leadStatus: lead.status || "New",
  }
}

const getFollowUps = async (user, filter = "all") => {
  const normalizedFilter = String(filter || "all").toLowerCase()
  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN"
  const where = isAdmin ? {} : { salesUserId: Number(user.id) }
  const dateRange = getDateRange(normalizedFilter)

  if (normalizedFilter === "completed") {
    where.status = "Done"
  } else if (normalizedFilter === "missed") {
    where.status = "Pending"
    where.followUpDate = dateRange
  } else if (normalizedFilter === "today" || normalizedFilter === "upcoming") {
    where.status = { notIn: ["Done", "Cancelled"] }
    where.followUpDate = dateRange
  }

  const rows = await prisma.followUp.findMany({
    where,
    orderBy: [{ followUpDate: "asc" }, { followUpTime: "asc" }],
    include: {
      lead: true,
      salesUser: {
        select: { id: true, username: true, email: true, firstName: true, lastName: true },
      },
    },
  })

  return rows.map(serializeFollowUp)
}

const createFollowUp = async (user, body) => {
  const leadId = Number(body.leadId)
  const type = body.type
  const priority = body.priority || "Medium"
  const status = body.status || "Pending"
  const followUpDate = combineDateAndTime(body.followUpDate, body.followUpTime)

  if (!leadId) throw Object.assign(new Error("Lead is required"), { statusCode: 400 })
  if (!followUpTypes.has(type)) throw Object.assign(new Error("Follow-up type is required"), { statusCode: 400 })
  if (!followUpDate) throw Object.assign(new Error("Follow-up date and time are required"), { statusCode: 400 })
  if (!priorities.has(priority)) throw Object.assign(new Error("Priority is invalid"), { statusCode: 400 })
  if (!followUpStatuses.has(status)) throw Object.assign(new Error("Follow-up status is invalid"), { statusCode: 400 })

  return prisma.$transaction(async (tx) => {
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
        followUpTime: String(body.followUpTime || "").slice(0, 5),
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
      message: `${type} follow-up created for ${followUp.followUpTime}`,
      oldStatus: lead.status,
      newStatus: nextLeadStatus,
    })

    return serializeFollowUp(followUp)
  })
}

const markFollowUpDone = async (user, id, body = {}) => {
  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findFirst({
      where: getFollowUpWhere(user, id),
      include: { lead: true },
    })

    if (!followUp) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
    if (followUp.status === "Cancelled") {
      throw Object.assign(new Error("Cannot mark cancelled follow-up as Done"), { statusCode: 400 })
    }

    const updated = await tx.followUp.update({
      where: { id: followUp.id },
      data: { status: "Done", completedAt: new Date() },
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

    if (body.nextAction === "create-next-follow-up" && body.nextFollowUp) {
      await tx.followUp.create({
        data: {
          leadId: followUp.leadId,
          salesUserId: Number(user.id),
          type: body.nextFollowUp.type || followUp.type,
          followUpDate: combineDateAndTime(body.nextFollowUp.followUpDate, body.nextFollowUp.followUpTime),
          followUpTime: String(body.nextFollowUp.followUpTime || "").slice(0, 5),
          priority: body.nextFollowUp.priority || "Medium",
          notes: body.nextFollowUp.notes || null,
          status: "Pending",
        },
      })
    }

    return serializeFollowUp(updated)
  })
}

const rescheduleFollowUp = async (user, id, body) => {
  const followUpDate = combineDateAndTime(body.followUpDate, body.followUpTime)
  if (!followUpDate) throw Object.assign(new Error("New follow-up date and time are required"), { statusCode: 400 })

  return prisma.$transaction(async (tx) => {
    const current = await tx.followUp.findFirst({
      where: getFollowUpWhere(user, id),
      include: { lead: true },
    })

    if (!current) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
    if (current.status === "Done") throw Object.assign(new Error("Cannot reschedule completed follow-up"), { statusCode: 400 })

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
      message: body.notes || `${current.type} follow-up rescheduled`,
      oldStatus: current.lead.status,
      newStatus: current.lead.status,
    })

    return serializeFollowUp(next)
  })
}

const cancelFollowUp = async (user, id, body = {}) => {
  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.findFirst({
      where: getFollowUpWhere(user, id),
      include: { lead: true },
    })

    if (!followUp) throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })

    const updated = await tx.followUp.update({
      where: { id: followUp.id },
      data: { status: "Cancelled" },
      include: { lead: true },
    })

    await addActivity(tx, {
      leadId: followUp.leadId,
      userId: user.id,
      type: "FOLLOW_UP_CANCELLED",
      message: body.note || `${followUp.type} follow-up cancelled`,
      oldStatus: followUp.lead.status,
      newStatus: followUp.lead.status,
    })

    return serializeFollowUp(updated)
  })
}

const updateLeadStatus = async (user, leadId, body, tx = prisma) => {
  const normalizedStatus = leadStatusMap[body.status] || leadStatusMap[body.newStatus]
  if (!normalizedStatus) throw Object.assign(new Error("Valid lead status is required"), { statusCode: 400 })
  if (normalizedStatus === "Unqualified" && !body.reason) {
    throw Object.assign(new Error("Reason is required when marking lead Unqualified"), { statusCode: 400 })
  }

  const lead = await getScopedLead(leadId, user, tx)
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

  if (normalizedStatus === "Booked" || normalizedStatus === "Unqualified") {
    await cancelPendingFollowUps(tx, lead.id)
  }

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
  updateLeadStatus,
}
