const prisma = require("../lib/prisma")
const { sendNotification } = require("./notification.service")

const immediateNotificationKeys = new Map()
const reminderTimers = new Map()
const reminderInFlight = new Set()
const immediateDedupeMs = 60 * 1000
const minuteMs = 60 * 1000
const reminderOffsetsMinutes = [60, 15]

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Lead")

const formatVisitDateTime = (value) => {
  if (!value) return "the scheduled time"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "the scheduled time"

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const getReminderTimerKey = (visitId, offsetMinutes) => `${visitId}:${offsetMinutes}`

const clearVisitReminderTimers = (visitId) => {
  reminderOffsetsMinutes.forEach((offsetMinutes) => {
    const timerKey = getReminderTimerKey(visitId, offsetMinutes)
    const existingTimer = reminderTimers.get(timerKey)

    if (existingTimer) {
      clearTimeout(existingTimer)
      reminderTimers.delete(timerKey)
    }
  })
}

const getVisitReminderAt = (scheduledOn, offsetMinutes) => {
  const scheduledTime = new Date(scheduledOn).getTime()
  if (Number.isNaN(scheduledTime)) return null
  return new Date(scheduledTime - offsetMinutes * minuteMs)
}

const getRemainingVisitTimeLabel = (scheduledOn, now = new Date()) => {
  const scheduledTime = new Date(scheduledOn).getTime()
  const nowTime = now.getTime()
  if (Number.isNaN(scheduledTime) || Number.isNaN(nowTime)) return "soon"

  const remainingMinutes = Math.max(0, Math.round((scheduledTime - nowTime) / (60 * 1000)))
  if (remainingMinutes >= 55 && remainingMinutes <= 65) return "in 1 hour"
  if (remainingMinutes >= 60) {
    const hours = Math.floor(remainingMinutes / 60)
    const minutes = remainingMinutes % 60
    return minutes ? `in ${hours} hr ${minutes} min` : `in ${hours} hr`
  }
  if (remainingMinutes > 1) return `in ${remainingMinutes} minutes`
  if (remainingMinutes === 1) return "in 1 minute"
  return "now"
}

const getNotificationRecipients = async (visit) => {
  const admins = await getAdminIds()
  const recipientIds = new Set(admins)

  if (visit?.lead?.teamId) {
    recipientIds.add(Number(visit.lead.teamId))
  }

  if (visit?.salesExecutive) {
    const executiveName = String(visit.salesExecutive).trim()
    const nameParts = executiveName.split(/\s+/).filter(Boolean)
    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: executiveName },
          { email: executiveName },
          { firstName: executiveName },
          { lastName: executiveName },
          ...(nameParts.length >= 2
            ? [{ firstName: nameParts[0], lastName: nameParts.slice(1).join(" ") }]
            : []),
        ],
      },
      select: { id: true },
    })

    matchedUsers.forEach((user) => recipientIds.add(Number(user.id)))
  }

  return Array.from(recipientIds).filter(Boolean)
}

const getAdminIds = async () => {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  })

  return admins.map((admin) => Number(admin.id)).filter(Boolean)
}

const createSiteVisitActivity = async (visit, type, message) => {
  if (!visit?.leadId || !message) return null

  const existingActivity = await prisma.leadActivity.findFirst({
    where: {
      leadId: Number(visit.leadId),
      type,
      message,
    },
    select: { id: true },
  })

  if (existingActivity) return existingActivity

  return prisma.leadActivity.create({
    data: {
      leadId: Number(visit.leadId),
      userId: visit.lead?.teamId ? Number(visit.lead.teamId) : null,
      type,
      message,
      newStatus: visit.status || null,
    },
  })
}

const notifyUsers = async (userIds, title, description) =>
  Promise.allSettled(
    userIds.map((userId) => sendNotification(userId, title, description))
  )

const shouldNotifySavedVisit = (visit) => {
  if (!visit?.leadId || !visit?.scheduledOn) return false
  return ["Scheduled", "Confirmed", "Rescheduled"].includes(visit.status || "Scheduled")
}

const rememberImmediateNotification = (key) => {
  const now = Date.now()
  const previous = immediateNotificationKeys.get(key)

  if (previous && now - previous < immediateDedupeMs) return false

  immediateNotificationKeys.set(key, now)
  setTimeout(() => immediateNotificationKeys.delete(key), immediateDedupeMs)
  return true
}

const sendSiteVisitSavedNotification = async (visit) => {
  if (!shouldNotifySavedVisit(visit)) return

  const key = `${visit.leadId}:${new Date(visit.scheduledOn).toISOString()}:${visit.status || "Scheduled"}`
  if (!rememberImmediateNotification(key)) return

  const leadName = getLeadName(visit.lead)
  const scheduledFor = formatVisitDateTime(visit.scheduledOn)
  const title = "Site visit scheduled"
  const description = `${leadName} has a ${visit.status || "Scheduled"} site visit on ${scheduledFor}.`
  const adminIds = await getAdminIds()

  await Promise.allSettled([
    notifyUsers(adminIds, title, description),
    createSiteVisitActivity(visit, title, description),
  ])
}

const sendSiteVisitReminder = async (visitId, offsetMinutes = 60) => {
  const reminderKey = getReminderTimerKey(visitId, offsetMinutes)
  if (reminderInFlight.has(reminderKey)) return
  reminderInFlight.add(reminderKey)

  try {
  const visit = await prisma.scheduleVisit.findUnique({
    where: { id: Number(visitId) },
    include: {
      lead: {
        include: {
          team: true,
        },
      },
    },
  })

  if (!visit || !shouldNotifySavedVisit(visit)) return

  const scheduledTime = new Date(visit.scheduledOn).getTime()
  if (Number.isNaN(scheduledTime) || scheduledTime <= Date.now()) return

  const leadName = getLeadName(visit.lead)
  const scheduledFor = formatVisitDateTime(visit.scheduledOn)
  const title = "Site visit reminder"
  const description = `${leadName} has a site visit ${getRemainingVisitTimeLabel(visit.scheduledOn)} at ${scheduledFor}.`
  const existingActivity = await prisma.leadActivity.findFirst({
    where: {
      leadId: Number(visit.leadId),
      type: title,
      message: description,
    },
    select: { id: true },
  })

  if (existingActivity) return

  const recipientIds = await getNotificationRecipients(visit)

  await Promise.allSettled([
    notifyUsers(recipientIds, title, description),
    createSiteVisitActivity(visit, title, description),
  ])
  } finally {
    reminderInFlight.delete(reminderKey)
  }
}

const scheduleSiteVisitReminder = (visit) => {
  if (!visit?.id) return

  clearVisitReminderTimers(visit.id)

  if (!shouldNotifySavedVisit(visit)) return

  const scheduledTime = new Date(visit.scheduledOn).getTime()
  if (Number.isNaN(scheduledTime) || scheduledTime <= Date.now()) return

  reminderOffsetsMinutes.forEach((offsetMinutes) => {
    const reminderAt = getVisitReminderAt(visit.scheduledOn, offsetMinutes)
    if (!reminderAt) return

    const reminderDelay = reminderAt.getTime() - Date.now()
    if (reminderDelay <= 0) return

    const timerKey = getReminderTimerKey(visit.id, offsetMinutes)
    const timer = setTimeout(() => {
      reminderTimers.delete(timerKey)
      sendSiteVisitReminder(visit.id, offsetMinutes).catch((error) => {
        console.error("Unable to send site visit reminder:", error)
      })
    }, reminderDelay)

    reminderTimers.set(timerKey, timer)
  })
}

const handleSiteVisitSaved = async (visit) => {
  if (!visit) return

  await sendSiteVisitSavedNotification(visit)
  scheduleSiteVisitReminder(visit)
}

module.exports = {
  handleSiteVisitSaved,
}
