const prisma = require("../lib/prisma")
const {
  getVisitPayloadFromLeadUpdate,
  normalizeVisitStatus,
  upsertScheduleVisit,
} = require("../services/scheduleVisit.service")
const { isAdminUser, maskScheduleVisitData } = require("../utils/phoneMask")

const leadTeamSelect = {
  id: true,
  isActive: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  secondaryPhone: true,
  timeZone: true,
  linkedUrl: true,
  description: true,
  role: true,
  department: true,
  defaultRouting: true,
  defaultRoutingRule: true,
  autoRoster: true,
  teamId: true,
  pushNotification: true,
  gpsTracking: true,
}

exports.getScheduleVisits = async (req, res) => {
  try {
    const visits = await prisma.scheduleVisit.findMany({
      orderBy: [
        { scheduledOn: "desc" },
        { updatedAt: "desc" },
      ],
      include: {
        lead: {
          include: {
            team: {
              select: leadTeamSelect,
            },
          },
        },
      },
    })

    const isAdmin = isAdminUser(req)
    const safeVisits = isAdmin ? visits : visits.map((v) => maskScheduleVisitData(v, false))
    res.status(200).json(safeVisits)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message || "Unable to load schedule visits" })
  }
}

exports.upsertScheduleVisit = async (req, res) => {
  try {
    const authUser = req.authUser || null
    const authUserName = authUser
      ? [authUser.firstName, authUser.lastName].filter(Boolean).join(" ").trim() || authUser.username || authUser.email
      : null
    const isSalesUser = authUser && !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(String(authUser.role).toUpperCase())

    const explicitExecutive = req.body.salesExecutive || req.body.siteVisitExecutive
    const salesExecutive = isSalesUser
      ? authUserName
      : (explicitExecutive || authUserName)
    const initiatedBy = req.body.initiatedBy || req.body.siteVisitInitiatedBy || authUserName

    const payload = getVisitPayloadFromLeadUpdate(req.body.leadId, {
      ...req.body,
      salesExecutive,
      siteVisitExecutive: salesExecutive,
      initiatedBy,
      siteVisitInitiatedBy: initiatedBy,
      siteVisitStatus: normalizeVisitStatus(req.body.status || req.body.siteVisitStatus),
      visitStatus: normalizeVisitStatus(req.body.status || req.body.visitStatus),
      conductSiteStatus: normalizeVisitStatus(req.body.status || req.body.conductSiteStatus),
      conductSiteVisit: req.body.project || req.body.conductSiteVisit,
      siteVisitProject: req.body.project || req.body.siteVisitProject,
      siteVisitLocation: req.body.meetingPoint || req.body.siteVisitLocation,
      siteVisitNote: req.body.note || req.body.siteVisitNote,
      conductSiteDate: req.body.scheduledOn || req.body.conductSiteDate,
      siteVisitConductedOn: req.body.conductedOn || req.body.siteVisitConductedOn,
    })

    if (!payload?.leadId) {
      return res.status(400).json({ message: "leadId is required" })
    }

    const invalidProjects = new Set(["no", "yes", "none", "-", "null", "undefined", "n/a", ""]);
    if (!payload?.project || invalidProjects.has(payload.project.trim().toLowerCase())) {
      return res.status(400).json({ message: "Project is mandatory for scheduling a site visit" });
    }

    const visit = await upsertScheduleVisit(payload)

    await prisma.lead.update({
      where: { id: payload.leadId },
      data: {
        conductSiteVisit: payload.project,
        conductSiteDate: payload.scheduledOn,
        siteVisitProject: payload.project,
        siteVisitStatus: payload.status,
        visitStatus: payload.status,
        conductSiteStatus: payload.status,
        siteVisitLocation: payload.meetingPoint,
        meetingPoint: payload.meetingPoint,
        siteVisitExecutive: visit?.salesExecutive || payload.salesExecutive,
        siteVisitNote: payload.note,
        siteVisitInitiatedBy: payload.initiatedBy,
        siteVisitDate: payload.scheduledOn,
        siteVisitConductedOn: payload.conductedOn,
      },
    })

    const isAdmin = isAdminUser(req)
    res.status(200).json(isAdmin ? visit : maskScheduleVisitData(visit, false))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message || "Unable to save schedule visit" })
  }
}

exports.deleteScheduleVisit = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ message: "Schedule visit id is required" })

    const visit = await prisma.scheduleVisit.findUnique({ where: { id } })
    if (!visit) return res.status(404).json({ message: "Schedule visit not found" })

    await prisma.scheduleVisit.delete({ where: { id } })

    await prisma.lead.update({
      where: { id: visit.leadId },
      data: {
        conductSiteVisit: null,
        conductSiteDate: null,
        siteVisitProject: null,
        siteVisitStatus: null,
        visitStatus: null,
        conductSiteStatus: null,
        siteVisitLocation: null,
        meetingPoint: null,
        siteVisitExecutive: null,
        siteVisitNote: null,
        siteVisitInitiatedBy: null,
        siteVisitDate: null,
        siteVisitConductedOn: null,
      },
    })

    res.status(200).json({ message: "Schedule visit deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message || "Unable to delete schedule visit" })
  }
}
