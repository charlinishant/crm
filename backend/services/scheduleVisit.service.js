const prisma = require("../lib/prisma")
const { handleSiteVisitSaved } = require("./siteVisitNotification.service")
const { emitReportsUpdate } = require("../socket/socket")

const visitStatusOptions = new Set([
  "Scheduled",
  "Confirmed",
  "Visit Done",
  "Visit Missed",
  "Cancelled",
  "Rescheduled",
])

const normalizeVisitStatus = (value) => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const match = Array.from(visitStatusOptions).find(
    (status) => status.toLowerCase() === normalized
  )

  if (match) return match
  if (normalized === "conducted" || normalized === "done") return "Visit Done"
  if (normalized === "missed") return "Visit Missed"
  if (normalized === "canceled") return "Cancelled"
  return "Scheduled"
}

const toNullableString = (value) => {
  if (value === undefined || value === null || value === "") return null
  return String(value).trim()
}

const toNullableDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const getVisitPayloadFromLeadUpdate = (leadId, source = {}) => {
  const hasVisitData = [
    "conductSiteVisit",
    "conductSiteDate",
    "siteVisitProject",
    "siteVisitStatus",
    "visitStatus",
    "conductSiteStatus",
    "siteVisitLocation",
    "meetingPoint",
    "siteVisitExecutive",
    "siteVisitNote",
    "siteVisitInitiatedBy",
    "siteVisitDate",
    "siteVisitConductedOn",
  ].some((field) => source[field] !== undefined)

  if (!leadId || !hasVisitData) return null

  const status = normalizeVisitStatus(
    source.siteVisitStatus || source.visitStatus || source.conductSiteStatus
  )

  return {
    leadId: Number(leadId),
    project: toNullableString(source.siteVisitProject || source.conductSiteVisit || source.project),
    status,
    meetingPoint: toNullableString(source.siteVisitLocation || source.meetingPoint),
    salesExecutive: toNullableString(source.siteVisitExecutive || source.salesExecutive),
    note: toNullableString(source.siteVisitNote || source.note),
    initiatedBy: toNullableString(source.siteVisitInitiatedBy || source.initiatedBy),
    scheduledOn: toNullableDate(source.conductSiteDate || source.siteVisitDate || source.scheduledOn),
    conductedOn: status === "Visit Done" ? toNullableDate(source.siteVisitConductedOn || source.conductedOn || new Date()) : null,
    conductedBy: status === "Visit Done" ? toNullableString(source.siteVisitExecutive || source.conductedBy || source.salesExecutive) : null,
  }
}

const upsertScheduleVisit = async (payload) => {
  if (!payload?.leadId) return null

  // Prevent unassigned visits by auto-assigning to lead owner / team or initiator
  let salesExecutive = payload.salesExecutive
  if (!salesExecutive) {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(payload.leadId) },
      include: { team: true },
    })
    if (lead?.team) {
      salesExecutive = [lead.team.firstName, lead.team.lastName].filter(Boolean).join(" ") || lead.team.username || lead.team.email
    } else if (payload.initiatedBy) {
      salesExecutive = payload.initiatedBy
    }
  }

  const visit = await prisma.scheduleVisit.upsert({
    where: { leadId: Number(payload.leadId) },
    create: {
      ...payload,
      salesExecutive,
    },
    update: {
      project: payload.project,
      status: payload.status,
      meetingPoint: payload.meetingPoint,
      salesExecutive,
      note: payload.note,
      initiatedBy: payload.initiatedBy,
      scheduledOn: payload.scheduledOn,
      conductedOn: payload.conductedOn,
      conductedBy: payload.conductedBy,
    },
    include: {
      lead: {
        include: {
          team: true,
        },
      },
    },
  })

  handleSiteVisitSaved(visit).catch((error) => {
    console.error("Unable to publish site visit notification:", error)
  })
  emitReportsUpdate("site-visit:saved")

  return visit
}

module.exports = {
  getVisitPayloadFromLeadUpdate,
  normalizeVisitStatus,
  upsertScheduleVisit,
}
