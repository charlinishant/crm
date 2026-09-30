const prisma = require("../lib/prisma")
const { sendNotification } = require("./notification.service")
const { getIO } = require("../socket")

const reminderTimers = new Map()
const reminderInFlight = new Set()
let reminderScanTimer = null
let overdueScanTimer = null
const minuteMs = 60 * 1000
const DEFAULT_REMINDER_OFFSET_MINUTES = 10
const REMINDER_OFFSET_MINUTES = [30, 10]
const ADMIN_NOTIFICATION_ROLES = ["ADMIN", "MANAGER"]

const getLeadName = (lead) =>
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

const getScheduledAt = (followUp) => {
  if (!followUp?.followUpDate) return null
  const rawDate = followUp.followUpDate instanceof Date
    ? followUp.followUpDate
    : new Date(followUp.followUpDate)
  if (Number.isNaN(rawDate.getTime())) return null
  const datePart = [
    rawDate.getFullYear(),
    String(rawDate.getMonth() + 1).padStart(2, "0"),
    String(rawDate.getDate()).padStart(2, "0"),
  ].join("-")
  const timePart = String(followUp.followUpTime || "00:00").slice(0, 5)
  const date = new Date(`${datePart}T${timePart}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "the scheduled time"
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const formatTimeOnly = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  })
}

const getTimerKey = (followUpId, offsetMinutes) => `${followUpId}:${offsetMinutes}`

const clearCallbackReminderTimers = (followUpId) => {
  const prefix = `${followUpId}:`
  Array.from(reminderTimers.keys()).forEach((key) => {
    if (key.startsWith(prefix) || key === String(followUpId)) {
      const timer = reminderTimers.get(key)
      if (timer) clearTimeout(timer)
      reminderTimers.delete(key)
    }
  })
}

const shouldScheduleFollowUp = (followUp) => {
  if (!followUp?.id || !followUp.salesUserId) return false
  const activeStatus = followUp.status === "Pending" || followUp.status === "Scheduled"
  if (!activeStatus) return false
  const scheduledAt = getScheduledAt(followUp)
  if (!scheduledAt) return false
  return scheduledAt.getTime() > Date.now() - 5 * minuteMs
}

const emitFollowupReminderSocket = (salesUserId, payload) => {
  try {
    const io = getIO()
    if (!io) return
    io.to(`user:${salesUserId}`).emit("followup-reminder", payload)
    io.to(`user:${salesUserId}`).emit(`followup-reminder-${salesUserId}`, payload)
  } catch (err) {
    console.warn("Unable to emit followup-reminder socket event:", err.message)
  }
}

const getAdminIds = async () => {
  const admins = await prisma.user.findMany({
    where: { role: { in: ADMIN_NOTIFICATION_ROLES } },
    select: { id: true },
  })

  return admins.map((admin) => Number(admin.id)).filter(Boolean)
}

const sendFollowupReminder = async (followUpId, offsetMinutes = DEFAULT_REMINDER_OFFSET_MINUTES) => {
  const reminderKey = getTimerKey(followUpId, offsetMinutes)
  if (reminderInFlight.has(reminderKey)) return
  reminderInFlight.add(reminderKey)

  try {
    const followUp = await prisma.followUp.findUnique({
      where: { id: Number(followUpId) },
      include: { lead: true },
    })

    if (!followUp || !followUp.salesUserId) return
    const activeStatus = followUp.status === "Pending" || followUp.status === "Scheduled"
    if (!activeStatus) return

    const scheduledAt = getScheduledAt(followUp)
    if (!scheduledAt) return

    const lead = followUp.lead || {}
    const leadName = getLeadName(lead)
    const phone = getContactValue(lead.phones)
    const formattedScheduledTime = formatDateTime(scheduledAt)
    const timeOnly = formatTimeOnly(scheduledAt) || followUp.followUpTime
    const followUpType = String(followUp.type || "Follow-up")

    const dedupeKey = `FOLLOWUP_REMINDER:${offsetMinutes}:${followUp.id}:${scheduledAt.getTime()}`

    // 1. Atomic claim check via persistent database notification dedupe
    const existingNotif = await prisma.notification.findFirst({
      where: {
        userId: Number(followUp.salesUserId),
        description: { contains: dedupeKey },
      },
    })

    if (existingNotif) {
      return
    }

    const title = `Follow-up in ${offsetMinutes} minutes`
    const description = `${leadName} — ${followUpType} at ${timeOnly || formattedScheduledTime} [${dedupeKey}]`
    const link = `/user/sales/followups?filter=today&followUpId=${followUp.id}`

    // 2. Create persistent Notification in database
    await sendNotification(followUp.salesUserId, title, description, {
      link,
    })
    const adminIds = await getAdminIds()
    await Promise.allSettled(
      adminIds.map((adminId) =>
        sendNotification(adminId, title, description, {
          link: "/activity-notifications",
          dedupeKey,
        })
      )
    )

    // 3. Emit rich real-time Socket event for in-app popup + buzzer
    emitFollowupReminderSocket(followUp.salesUserId, {
      followUpId: followUp.id,
      leadId: followUp.leadId,
      leadName,
      phone,
      type: followUpType,
      priority: followUp.priority || "Medium",
      scheduledAt: scheduledAt.toISOString(),
      scheduledTime: followUp.followUpTime || timeOnly,
      notes: followUp.notes || "",
      reminderAt: new Date().toISOString(),
      offsetMinutes,
      createdAt: new Date().toISOString(),
    })

    // 4. Log lead activity
    await prisma.leadActivity.create({
      data: {
        leadId: Number(followUp.leadId),
        userId: Number(followUp.salesUserId),
        type: "FOLLOW_UP_REMINDER",
        message: `${offsetMinutes}-minute reminder sent for ${followUpType} at ${timeOnly || formattedScheduledTime}`,
        newStatus: lead.status || null,
      },
    }).catch((err) => {
      console.warn("Unable to log reminder activity:", err.message)
    })
  } finally {
    reminderInFlight.delete(reminderKey)
  }
}

const scheduleCallbackReminder = (followUp) => {
  if (!followUp?.id) return
  clearCallbackReminderTimers(followUp.id)
  if (!shouldScheduleFollowUp(followUp)) return

  const scheduledAt = getScheduledAt(followUp)
  if (!scheduledAt) return

  REMINDER_OFFSET_MINUTES.forEach((offsetMinutes) => {
    const reminderTime = scheduledAt.getTime() - offsetMinutes * minuteMs
    const reminderDelay = reminderTime - Date.now()

    if (reminderDelay <= 0) {
      if (scheduledAt.getTime() > Date.now() - offsetMinutes * minuteMs) {
        sendFollowupReminder(followUp.id, offsetMinutes).catch((error) => {
          console.error("Unable to send follow-up reminder:", error)
        })
      }
      return
    }

    const timerKey = getTimerKey(followUp.id, offsetMinutes)
    const timer = setTimeout(() => {
      reminderTimers.delete(timerKey)
      sendFollowupReminder(followUp.id, offsetMinutes).catch((error) => {
        console.error("Unable to send follow-up reminder:", error)
      })
    }, reminderDelay)

    reminderTimers.set(timerKey, timer)
  })
}

const handleCallbackFollowUpSaved = (followUp) => {
  scheduleCallbackReminder(followUp)
}

const scanDueFollowUpReminders = async () => {
  const now = new Date()
  const maxReminderWindow = Math.max(...REMINDER_OFFSET_MINUTES)
  const reminderWindowEnd = new Date(now.getTime() + maxReminderWindow * minuteMs)

  try {
    const followUps = await prisma.followUp.findMany({
      where: {
        status: { in: ["Pending", "Scheduled"] },
        followUpDate: { lte: reminderWindowEnd, gte: new Date(now.getTime() - 24 * 60 * minuteMs) },
      },
      include: { lead: true },
      take: 100,
    })

    for (const followUp of followUps) {
      const scheduledAt = getScheduledAt(followUp)
      if (!scheduledAt) continue

      for (const offsetMinutes of REMINDER_OFFSET_MINUTES) {
        const reminderTargetTime = scheduledAt.getTime() - offsetMinutes * minuteMs
        if (reminderTargetTime <= Date.now()) {
          await sendFollowupReminder(followUp.id, offsetMinutes)
        }
      }
      scheduleCallbackReminder(followUp)
    }
  } catch (error) {
    console.error("Error scanning due follow-up reminders:", error)
  }
}

const scanOverdueFollowUps = async () => {
  const now = new Date()
  try {
    const overdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: { in: ["Pending", "Scheduled"] },
        followUpDate: { lt: now },
      },
      include: { lead: true },
      take: 50,
    })

    for (const followUp of overdueFollowUps) {
      const scheduledAt = getScheduledAt(followUp)
      if (!scheduledAt || scheduledAt.getTime() >= Date.now()) continue

      const dedupeKey = `FOLLOWUP_OVERDUE:${followUp.id}`
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: Number(followUp.salesUserId),
          description: { contains: dedupeKey },
        },
      })

      if (!existingNotification) {
        const leadName = getLeadName(followUp.lead)
        const scheduledFormatted = formatDateTime(scheduledAt)
        await sendNotification(
          followUp.salesUserId,
          "Follow-up Overdue",
          `${leadName} follow-up scheduled for ${scheduledFormatted} is overdue. [${dedupeKey}]`,
          { link: `/user/sales/followups?filter=overdue&followUpId=${followUp.id}` }
        )
      }
    }
  } catch (error) {
    console.error("Error scanning overdue follow-ups:", error)
  }
}

const snoozeFollowUp = async (user, followUpId, minutes = 10) => {
  const numericId = Number(followUpId)
  if (!numericId) throw Object.assign(new Error("Follow-up ID is required"), { statusCode: 400 })
  const snoozeMinutes = Math.max(1, Number(minutes) || 10)

  const isAdmin = String(user?.role || "").toUpperCase() === "ADMIN"
  const followUp = await prisma.followUp.findFirst({
    where: {
      id: numericId,
      ...(isAdmin ? {} : { salesUserId: Number(user.id) }),
    },
    include: { lead: true },
  })

  if (!followUp) {
    throw Object.assign(new Error("Follow-up not found"), { statusCode: 404 })
  }

  const newScheduledDate = new Date(Date.now() + snoozeMinutes * minuteMs)
  const hours = String(newScheduledDate.getHours()).padStart(2, "0")
  const mins = String(newScheduledDate.getMinutes()).padStart(2, "0")
  const newTime = `${hours}:${mins}`

  clearCallbackReminderTimers(followUp.id)

  const updated = await prisma.followUp.update({
    where: { id: followUp.id },
    data: {
      followUpDate: newScheduledDate,
      followUpTime: newTime,
      status: "Pending",
    },
    include: { lead: true },
  })

  await prisma.leadActivity.create({
    data: {
      leadId: Number(followUp.leadId),
      userId: Number(user.id),
      type: "FOLLOW_UP_SNOOZED",
      message: `Follow-up snoozed for ${snoozeMinutes} minutes (new time: ${newTime})`,
      newStatus: followUp.lead?.status || null,
    },
  }).catch(() => {})

  scheduleCallbackReminder(updated)
  return updated
}

const initializeCallbackReminders = async () => {
  await scanDueFollowUpReminders()
  await scanOverdueFollowUps()

  if (!reminderScanTimer) {
    reminderScanTimer = setInterval(() => {
      scanDueFollowUpReminders().catch((error) => {
        console.error("Unable to scan follow-up reminders:", error)
      })
    }, 30 * 1000)
  }

  if (!overdueScanTimer) {
    overdueScanTimer = setInterval(() => {
      scanOverdueFollowUps().catch((error) => {
        console.error("Unable to scan overdue follow-ups:", error)
      })
    }, 5 * minuteMs)
  }
}

module.exports = {
  clearCallbackReminderTimers,
  handleCallbackFollowUpSaved,
  initializeCallbackReminders,
  scheduleCallbackReminder,
  scanDueFollowUpReminders,
  scanOverdueFollowUps,
  snoozeFollowUp,
  getScheduledAt,
}
