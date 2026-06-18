const prisma = require("../lib/prisma")
const { sendNotification } = require("./notification.service")

const immediateNotificationKeys = new Map()
const reminderTimers = new Map()
const immediateDedupeMs = 60 * 1000

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

const sendSiteVisitReminder = async (visitId) => {
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

  const leadName = getLeadName(visit.lead)
  const scheduledFor = formatVisitDateTime(visit.scheduledOn)
  const title = "Site visit reminder"
  const description = `${leadName} has a site visit in 1 hour at ${scheduledFor}.`
  const recipientIds = await getNotificationRecipients(visit)

  await Promise.allSettled([
    notifyUsers(recipientIds, title, description),
    createSiteVisitActivity(visit, title, description),
  ])
}

const scheduleSiteVisitReminder = (visit) => {
  if (!shouldNotifySavedVisit(visit)) return

  const scheduledTime = new Date(visit.scheduledOn).getTime()
  if (Number.isNaN(scheduledTime) || scheduledTime <= Date.now()) return

  const reminderDelay = Math.max(0, scheduledTime - Date.now() - 60 * 60 * 1000)
  const existingTimer = reminderTimers.get(visit.id)

  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  const timer = setTimeout(() => {
    reminderTimers.delete(visit.id)
    sendSiteVisitReminder(visit.id).catch((error) => {
      console.error("Unable to send site visit reminder:", error)
    })
  }, reminderDelay)

  reminderTimers.set(visit.id, timer)
}

const handleSiteVisitSaved = async (visit) => {
  if (!visit) return

  await sendSiteVisitSavedNotification(visit)
  scheduleSiteVisitReminder(visit)
}

module.exports = {
  handleSiteVisitSaved,
}
