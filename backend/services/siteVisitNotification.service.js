const prisma = require("../lib/prisma")
const { sendNotification } = require("./notification.service")

const immediateNotificationKeys = new Map()
const reminderTimers = new Map()
const reminderInFlight = new Set()
const immediateDedupeMs = 60 * 1000
const minuteMs = 60 * 1000
const reminderOffsetsMinutes = [60, 15] // 1 hour and 15 minutes
let scanInterval = null

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Lead")

const formatVisitDateTime = (value) => {
  if (!value) return "the scheduled time"
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
  if (remainingMinutes >= 12 && remainingMinutes <= 18) return "in 15 minutes"
  if (remainingMinutes >= 60) {
    const hours = Math.floor(remainingMinutes / 60)
    const minutes = remainingMinutes % 60
    return minutes ? `in ${hours} hr ${minutes} min` : `in ${hours} hr`
  }
  if (remainingMinutes > 1) return `in ${remainingMinutes} minutes`
  if (remainingMinutes === 1) return "in 1 minute"
  return "now"
}

const getAdminIds = async () => {
  const admins = await prisma.user.findMany({
    where: {
      OR: [
        { role: "ADMIN" },
        { role: "MANAGER" },
      ],
    },
    select: { id: true },
  })

  return admins.map((admin) => Number(admin.id)).filter(Boolean)
}

const getNotificationRecipients = async (visit) => {
  const admins = await getAdminIds()
  const recipientIds = new Set(admins)

  // 1. Resolve assigned lead owner / team
  let lead = visit?.lead
  if (!lead && visit?.leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: Number(visit.leadId) },
      include: { team: true },
    })
  }

  if (lead?.teamId) {
    recipientIds.add(Number(lead.teamId))
  }

  // 2. Resolve by executive / owner / telecaller identities
  const identitiesToMatch = [
    visit?.salesExecutive,
    visit?.conductedBy,
    visit?.initiatedBy,
    lead?.owner,
    lead?.sales,
    lead?.telecaller,
    lead?.assignedTo,
    lead?.siteVisitExecutive,
  ].filter(Boolean)

  for (const identity of identitiesToMatch) {
    const cleanId = String(identity).trim()
    if (!cleanId) continue

    if (/^\d+$/.test(cleanId)) {
      recipientIds.add(Number(cleanId))
      continue
    }

    const nameParts = cleanId.split(/\s+/).filter(Boolean)
    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: cleanId },
          { email: cleanId },
          { firstName: cleanId },
          { lastName: cleanId },
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

const notifyUsers = async (userIds, title, description, options = {}) =>
  Promise.allSettled(
    userIds.map((userId) => sendNotification(userId, title, description, options))
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

  let lead = visit.lead
  if (!lead && visit.leadId) {
    lead = await prisma.lead.findUnique({ where: { id: Number(visit.leadId) }, include: { team: true } })
  }

  const leadName = getLeadName(lead)
  const scheduledFor = formatVisitDateTime(visit.scheduledOn)
  const title = "Site visit scheduled"
  const description = `${leadName} has a ${visit.status || "Scheduled"} site visit on ${scheduledFor}.`
  const dedupeKey = `SITE_VISIT_SAVED:${visit.id || visit.leadId}:${new Date(visit.scheduledOn).toISOString()}`
  const link = `/user/sales/details?leadId=${visit.leadId}`
  const recipientIds = await getNotificationRecipients({ ...visit, lead })

  await Promise.allSettled([
    notifyUsers(recipientIds, title, description, { dedupeKey, link }),
    createSiteVisitActivity({ ...visit, lead }, title, description),
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
    const timeLabel = offsetMinutes === 60 ? "in 1 hour" : offsetMinutes === 15 ? "in 15 minutes" : getRemainingVisitTimeLabel(visit.scheduledOn)
    const title = "Site visit reminder"
    const description = `${leadName} has a site visit ${timeLabel} at ${scheduledFor}.`
    const dedupeKey = `SITE_VISIT_REMINDER:${visit.id}:${offsetMinutes}`
    const link = `/user/sales/details?leadId=${visit.leadId}`

    const existingActivity = await prisma.leadActivity.findFirst({
      where: {
        leadId: Number(visit.leadId),
        type: title,
        message: description,
      },
      select: { id: true },
    })

    const recipientIds = await getNotificationRecipients(visit)

    await Promise.allSettled([
      notifyUsers(recipientIds, title, description, { dedupeKey, link }),
      !existingActivity ? createSiteVisitActivity(visit, title, description) : Promise.resolve(),
    ])
  } catch (error) {
    console.error(`Error sending site visit reminder for visit #${visitId}:`, error)
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

const scanAndTriggerSiteVisitReminders = async () => {
  try {
    const now = new Date()
    const lookaheadTime = new Date(now.getTime() + 70 * minuteMs) // Next 70 mins

    const upcomingVisits = await prisma.scheduleVisit.findMany({
      where: {
        scheduledOn: {
          gt: now,
          lte: lookaheadTime,
        },
        status: { in: ["Scheduled", "Confirmed", "Rescheduled"] },
      },
      include: {
        lead: {
          include: {
            team: true,
          },
        },
      },
    })

    for (const visit of upcomingVisits) {
      const scheduledTime = new Date(visit.scheduledOn).getTime()
      const remainingMinutes = (scheduledTime - now.getTime()) / (60 * 1000)

      for (const offset of reminderOffsetsMinutes) {
        // If within window of this offset (e.g. 55-65 mins for 60min, or 10-20 mins for 15min)
        const lowerBound = offset - 5
        const upperBound = offset + 5

        if (remainingMinutes >= lowerBound && remainingMinutes <= upperBound) {
          await sendSiteVisitReminder(visit.id, offset)
        }
      }
    }
  } catch (error) {
    console.error("Site visit reminder scan error:", error)
  }
}

const initializeSiteVisitReminders = () => {
  if (scanInterval) return

  // Run initial scan
  scanAndTriggerSiteVisitReminders().catch((err) =>
    console.error("Initial site visit scan failed:", err)
  )

  // Run every 60 seconds
  scanInterval = setInterval(() => {
    scanAndTriggerSiteVisitReminders().catch((err) =>
      console.error("Recurring site visit scan failed:", err)
    )
  }, 60 * 1000)
}

const handleSiteVisitSaved = async (visit) => {
  if (!visit) return

  await sendSiteVisitSavedNotification(visit)
  scheduleSiteVisitReminder(visit)
}

module.exports = {
  handleSiteVisitSaved,
  initializeSiteVisitReminders,
  getNotificationRecipients,
}
