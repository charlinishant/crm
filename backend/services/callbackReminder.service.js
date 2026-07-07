const prisma = require("../lib/prisma")
const { sendNotification } = require("./notification.service")

const reminderTimers = new Map()
const reminderInFlight = new Set()
const minuteMs = 60 * 1000
const reminderOffsetsMinutes = [60, 0]

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Lead")

const getScheduledAt = (followUp) => {
  if (!followUp?.followUpDate) return null
  const datePart = String(followUp.followUpDate).slice(0, 10)
  const timePart = String(followUp.followUpTime || "00:00").slice(0, 5)
  const date = new Date(`${datePart}T${timePart}:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "the scheduled time"
  return date.toLocaleString("en-IN", {
    day:"2-digit",
    month:"short",
    year:"numeric",
    hour:"numeric",
    minute:"2-digit",
  })
}

const getTimerKey = (followUpId, offsetMinutes) => `${followUpId}:${offsetMinutes}`

const clearCallbackReminderTimers = (followUpId) => {
  reminderOffsetsMinutes.forEach((offsetMinutes) => {
    const key = getTimerKey(followUpId, offsetMinutes)
    const timer = reminderTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      reminderTimers.delete(key)
    }
  })
}

const shouldScheduleCallback = (followUp) =>
  followUp?.id &&
  followUp.type === "Callback" &&
  followUp.status === "Pending" &&
  getScheduledAt(followUp)?.getTime() > Date.now()

const createCallbackActivity = async (followUp, title, description) => {
  if (!followUp?.leadId || !description) return null

  const existingActivity = await prisma.leadActivity.findFirst({
    where:{
      leadId:Number(followUp.leadId),
      type:title,
      message:description,
    },
    select:{ id:true },
  })

  if (existingActivity) return existingActivity

  return prisma.leadActivity.create({
    data:{
      leadId:Number(followUp.leadId),
      userId:followUp.salesUserId ? Number(followUp.salesUserId) : null,
      type:title,
      message:description,
      newStatus:followUp.lead?.status || null,
    },
  })
}

const sendCallbackReminder = async (followUpId, offsetMinutes = 60) => {
  const reminderKey = getTimerKey(followUpId, offsetMinutes)
  if (reminderInFlight.has(reminderKey)) return
  reminderInFlight.add(reminderKey)

  try {
    const followUp = await prisma.followUp.findUnique({
      where:{ id:Number(followUpId) },
      include:{ lead:true },
    })

    if (!followUp || followUp.type !== "Callback" || followUp.status !== "Pending") return

    const scheduledAt = getScheduledAt(followUp)
    if (!scheduledAt) return
    const scheduledTime = scheduledAt.getTime()
    const now = Date.now()
    if (offsetMinutes > 0 && scheduledTime <= now) return
    if (offsetMinutes === 0 && scheduledTime < now - 2 * minuteMs) return

    const leadName = getLeadName(followUp.lead)
    const scheduledFor = formatDateTime(scheduledAt)
    const title = offsetMinutes > 0 ? "Callback reminder" : "Callback due now"
    const description = offsetMinutes > 0
      ? `${leadName} has a callback due in 1 hour at ${scheduledFor}.`
      : `${leadName} callback is due now at ${scheduledFor}.`

    await Promise.allSettled([
      followUp.salesUserId ? sendNotification(followUp.salesUserId, title, description) : null,
      createCallbackActivity(followUp, title, description),
    ])
  } finally {
    reminderInFlight.delete(reminderKey)
  }
}

const scheduleCallbackReminder = (followUp) => {
  if (!followUp?.id) return
  clearCallbackReminderTimers(followUp.id)
  if (!shouldScheduleCallback(followUp)) return

  const scheduledAt = getScheduledAt(followUp)
  reminderOffsetsMinutes.forEach((offsetMinutes) => {
    const reminderDelay = scheduledAt.getTime() - offsetMinutes * minuteMs - Date.now()
    if (reminderDelay <= 0) return

    const timerKey = getTimerKey(followUp.id, offsetMinutes)
    const timer = setTimeout(() => {
      reminderTimers.delete(timerKey)
      sendCallbackReminder(followUp.id, offsetMinutes).catch((error) => {
        console.error("Unable to send callback reminder:", error)
      })
    }, reminderDelay)

    reminderTimers.set(timerKey, timer)
  })
}

const handleCallbackFollowUpSaved = (followUp) => {
  scheduleCallbackReminder(followUp)
}

const initializeCallbackReminders = async () => {
  const now = new Date()
  const followUps = await prisma.followUp.findMany({
    where:{
      type:"Callback",
      status:"Pending",
      followUpDate:{ gte:now },
    },
  })

  followUps.forEach(scheduleCallbackReminder)
}

module.exports = {
  clearCallbackReminderTimers,
  handleCallbackFollowUpSaved,
  initializeCallbackReminders,
  scheduleCallbackReminder,
}
